import { ESTADOS_DO_JOGO, EVENTOS_SOCKET } from '../../../../packages/compartilhado/src/constantes.js';
import { verificarToken } from '../seguranca/tokens.js';
import { run } from '../banco/conexao.js';
import { gerenciadorEstados } from '../regras/estados-jogo.js';
import { processarAcaoJogador, registrarMensagemBanco, transicionarMapaSala } from '../regras/motor-jogo.js';
import { executarAtaque } from '../servicos/combate.js';
import { usarItemInventario } from '../servicos/inventario.js';

function montarPayloadHud(jogador, sala) {
  return {
    usuarioId: jogador.usuarioId,
    personagemId: jogador.personagemId,
    nome: jogador.nome,
    avatarUrl: jogador.avatarUrl,
    hpAtual: jogador.hpAtual,
    hpMax: jogador.hpMax,
    nivel: jogador.nivel,
    classe: jogador.classe,
    atributos: {
      forca: jogador.forca,
      destreza: jogador.destreza,
      inteligencia: jogador.inteligencia,
    },
    inventario: jogador.inventario,
    emCombate: sala.emCombate,
    efeitos: jogador.efeitos,
  };
}

export function registrarWebsocket(io, { chamarMestreIA } = {}) {
  // Middleware de autenticação JWT no handshake do Socket.IO
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || '').replace('Bearer ', '');

    const usuario = token ? verificarToken(token) : null;
    if (!usuario) {
      return next(new Error('Token JWT inválido ou ausente na conexão WebSocket.'));
    }

    socket.usuario = usuario; // { id, nome_usuario }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[ws] Conectado: ${socket.usuario.nome_usuario} (${socket.id})`);

    // 1. Entrar na sala
    socket.on(EVENTOS_SOCKET.JOIN_ROOM, async ({ salaId, codigoSala, personagemId }) => {
      const codigo = String(codigoSala || salaId || '').trim().toUpperCase();
      const canal = `sala_${codigo}`;

      try {
        const { sala, jogador } = await gerenciadorEstados.conectarJogador(
          codigo,
          socket.usuario,
          personagemId,
          socket.id
        );

        socket.join(canal);
        socket.codigoSalaAtual = codigo;

        // Envia HUD individual e estado completo da sala
        socket.emit(EVENTOS_SOCKET.UPDATE_HUD, montarPayloadHud(jogador, sala));
        if (sala.mapaAtual) {
          socket.emit(EVENTOS_SOCKET.MAP_CHANGED, {
            nomeLocal: sala.mapaAtual.nome,
            descricao: sala.mapaAtual.descricao,
            imagemUrl: sala.mapaAtual.imagem_url,
          });
        }

        io.to(canal).emit(EVENTOS_SOCKET.SALA_ESTADO, gerenciadorEstados.serializarSala(sala));
        io.to(canal).emit(EVENTOS_SOCKET.NEW_MESSAGE, {
          tipo: 'sistema',
          autorNome: 'Sistema',
          conteudo: `${jogador.nome} (${socket.usuario.nome_usuario}) entrou na sala #${codigo}.`,
        });
      } catch (erro) {
        socket.emit(EVENTOS_SOCKET.SYSTEM_ERROR, { mensagem: erro.message });
      }
    });

    // 2. Iniciar partida (Host)
    socket.on(EVENTOS_SOCKET.INICIAR_PARTIDA, async ({ codigoSala }) => {
      const codigo = String(codigoSala || socket.codigoSalaAtual || '').toUpperCase();
      const canal = `sala_${codigo}`;
      try {
        const sala = await gerenciadorEstados.carregarOuObterSala(codigo);
        if (sala.hostId !== socket.usuario.id) {
          throw new Error('Apenas o criador (host) da sala pode iniciar a partida.');
        }

        await run("UPDATE salas SET status = 'em_andamento' WHERE id = ?", [sala.id]);
        gerenciadorEstados.transicionarEstado(codigo, ESTADOS_DO_JOGO.EXPLORACAO);

        const daVez = gerenciadorEstados.obterJogadorDaVez(codigo);
        io.to(canal).emit(EVENTOS_SOCKET.SALA_ESTADO, gerenciadorEstados.serializarSala(sala));
        io.to(canal).emit(EVENTOS_SOCKET.TURN_CHANGED, {
          rodada: sala.rodada,
          jogadorDaVez: daVez,
        });
        io.to(canal).emit(EVENTOS_SOCKET.NEW_MESSAGE, {
          tipo: 'sistema',
          autorNome: 'Sistema',
          conteudo: `A aventura começou! Turno de ${daVez?.nome || 'jogador 1'}.`,
        });
      } catch (erro) {
        socket.emit(EVENTOS_SOCKET.SYSTEM_ERROR, { mensagem: erro.message });
      }
    });

    // 3. Ação narrativa / exploração + D20 + Mestre (Gemini)
    socket.on(EVENTOS_SOCKET.SEND_ACTION, async ({ salaId, codigoSala, acaoTexto, conteudo, atributoTeste, dificuldade }) => {
      const codigo = String(codigoSala || salaId || socket.codigoSalaAtual || '').toUpperCase();
      const canal = `sala_${codigo}`;
      const texto = String(acaoTexto || conteudo || '').trim();

      if (!texto) return;

      try {
        const contexto = await processarAcaoJogador({
          codigoSala: codigo,
          usuarioId: socket.usuario.id,
          acaoTexto: texto,
          atributoTeste,
          dificuldade,
        });

        // Publica ação do jogador no chat
        io.to(canal).emit(EVENTOS_SOCKET.NEW_MESSAGE, {
          tipo: 'jogador',
          autorNome: contexto.jogador.nome,
          conteudo: texto,
        });

        // Se houve rolagem de D20, publica o resultado oficial do servidor
        if (contexto.resultadoDado) {
          const d = contexto.resultadoDado;
          io.to(canal).emit(EVENTOS_SOCKET.DICE_ROLLED, {
            jogador: contexto.jogador.nome,
            ...d,
          });
          io.to(canal).emit(EVENTOS_SOCKET.NEW_MESSAGE, {
            tipo: 'sistema',
            autorNome: 'Dados (D20)',
            conteudo: `${contexto.jogador.nome} rolou D20 (${d.atributo}): ${d.natural} + ${d.modificador} = ${d.total} vs CD ${d.dificuldade} → ${d.sucesso ? 'SUCESSO' : 'FALHA'}`,
          });
        }

        // Indica processamento do Mestre (Dev 5 UI)
        io.to(canal).emit(EVENTOS_SOCKET.GM_THINKING, { status: true });

        let respostaMestre = '';
        let novoMapa = null;

        if (typeof chamarMestreIA === 'function') {
          const retornoIa = await chamarMestreIA(contexto);
          respostaMestre = retornoIa.narracao;
          novoMapa = retornoIa.novoMapa || null;
        } else {
          // Fallback funcional enquanto Dev 3 finaliza prompts.js
          respostaMestre = `O Mestre observa a ação de ${contexto.jogador.nome} ("${texto}") em ${contexto.sala.mapaAtual.nome} e prepara as consequências da cena.`;
        }

        await registrarMensagemBanco({
          salaId: contexto.sala.id,
          autorTipo: 'mestre',
          conteudo: respostaMestre,
        });

        io.to(canal).emit(EVENTOS_SOCKET.GM_THINKING, { status: false });
        io.to(canal).emit(EVENTOS_SOCKET.NEW_MESSAGE, {
          tipo: 'mestre',
          autorNome: 'Mestre (Gemini)',
          conteudo: respostaMestre,
        });

        // Se a narrativa gerou mudança de cenário/mapa
        if (novoMapa) {
          const mapaAtualizado = await transicionarMapaSala(codigo, novoMapa);
          io.to(canal).emit(EVENTOS_SOCKET.MAP_CHANGED, {
            nomeLocal: mapaAtualizado.nome,
            descricao: mapaAtualizado.descricao,
            imagemUrl: mapaAtualizado.imagem_url,
          });
        }

        // Restaura estado e avança turno
        gerenciadorEstados.transicionarEstado(codigo, ESTADOS_DO_JOGO.EXPLORACAO);
        const proximoTurno = gerenciadorEstados.avancarTurno(codigo);
        io.to(canal).emit(EVENTOS_SOCKET.TURN_CHANGED, proximoTurno);
        io.to(canal).emit(EVENTOS_SOCKET.SALA_ESTADO, gerenciadorEstados.serializarSala(contexto.sala));
      } catch (erro) {
        gerenciadorEstados.transicionarEstado(codigo, ESTADOS_DO_JOGO.EXPLORACAO);
        io.to(canal).emit(EVENTOS_SOCKET.GM_THINKING, { status: false });

        const mensagem =
          erro.status === 429
            ? 'O Mestre (Gemini) atingiu o limite temporário de requisições (429). Aguarde alguns segundos e tente novamente.'
            : erro.message;

        socket.emit(EVENTOS_SOCKET.SYSTEM_ERROR, { mensagem });
      }
    });

    // 4. Ação de combate (D20 + dano + atualização de HP no HUD)
    socket.on(EVENTOS_SOCKET.COMBAT_ACTION, async ({ salaId, codigoSala, tipoGolpe, alvoUsuarioId, alvo }) => {
      const codigo = String(codigoSala || salaId || socket.codigoSalaAtual || '').toUpperCase();
      const canal = `sala_${codigo}`;

      try {
        const sala = await gerenciadorEstados.carregarOuObterSala(codigo);
        const atacante = sala.jogadores.get(socket.usuario.id);
        if (!atacante) throw new Error('Atacante não encontrado na sala.');

        gerenciadorEstados.transicionarEstado(codigo, ESTADOS_DO_JOGO.COMBATE);
        const alvoJogador = alvoUsuarioId ? sala.jogadores.get(Number(alvoUsuarioId)) : null;

        const resultado = await executarAtaque(atacante, alvoJogador, { tipoGolpe });
        const resumo = resultado.acertou
          ? `${atacante.nome} acertou ${alvoJogador?.nome || alvo || 'o alvo'} com ${resultado.tipoGolpe} (D20: ${resultado.dado.total}) causando ${resultado.dano} de dano!`
          : `${atacante.nome} errou ${resultado.tipoGolpe} contra ${alvoJogador?.nome || alvo || 'o alvo'} (D20: ${resultado.dado.total}).`;

        await registrarMensagemBanco({
          salaId: sala.id,
          usuarioId: atacante.usuarioId,
          personagemId: atacante.personagemId,
          autorTipo: 'sistema',
          conteudo: resumo,
        });

        io.to(canal).emit(EVENTOS_SOCKET.NEW_MESSAGE, {
          tipo: 'sistema',
          autorNome: 'Combate',
          conteudo: resumo,
        });

        // Atualiza HUD de todos os jogadores
        for (const j of sala.jogadores.values()) {
          if (j.socketId) {
            io.to(j.socketId).emit(EVENTOS_SOCKET.UPDATE_HUD, montarPayloadHud(j, sala));
          }
        }
      } catch (erro) {
        socket.emit(EVENTOS_SOCKET.SYSTEM_ERROR, { mensagem: erro.message });
      }
    });

    // 5. Usar ou equipar item do inventário
    socket.on(EVENTOS_SOCKET.USAR_ITEM, async ({ codigoSala, itemId }) => {
      const codigo = String(codigoSala || socket.codigoSalaAtual || '').toUpperCase();
      const canal = `sala_${codigo}`;

      try {
        const sala = await gerenciadorEstados.carregarOuObterSala(codigo);
        const jogador = sala.jogadores.get(socket.usuario.id);
        if (!jogador) throw new Error('Jogador não encontrado na sala.');

        const resultado = await usarItemInventario(jogador, itemId);

        socket.emit(EVENTOS_SOCKET.UPDATE_HUD, montarPayloadHud(jogador, sala));
        socket.emit(EVENTOS_SOCKET.UPDATE_INVENTORY, resultado.inventario);

        io.to(canal).emit(EVENTOS_SOCKET.NEW_MESSAGE, {
          tipo: 'sistema',
          autorNome: 'Inventário',
          conteudo: `${jogador.nome} usou ${resultado.itemUsado.nome}.`,
        });
      } catch (erro) {
        socket.emit(EVENTOS_SOCKET.SYSTEM_ERROR, { mensagem: erro.message });
      }
    });

    // 6. Desconexão
    socket.on('disconnect', () => {
      const info = gerenciadorEstados.desconectarPorSocket(socket.id);
      if (info) {
        const canal = `sala_${info.sala.codigo}`;
        io.to(canal).emit(EVENTOS_SOCKET.SALA_ESTADO, gerenciadorEstados.serializarSala(info.sala));
      }
    });
  });
}