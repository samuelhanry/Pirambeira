import { ESTADOS_DO_JOGO } from '../../../../packages/compartilhado/src/constantes.js';
import { all, get } from '../banco/conexao.js';

class GerenciadorEstadosJogo {
  constructor() {
    /** @type {Map<string, object>} codigoSala -> estadoSala */
    this.salas = new Map();
  }

  async carregarOuObterSala(codigoSala) {
    const codigo = String(codigoSala).trim().toUpperCase();
    if (this.salas.has(codigo)) {
      return this.salas.get(codigo);
    }

    const salaDb = await get('SELECT * FROM salas WHERE codigo = ?', [codigo]);
    if (!salaDb) {
      throw new Error(`Sala "${codigo}" não encontrada no banco de dados.`);
    }

    const mapaAtual = await get(
      'SELECT * FROM mapas_cenarios WHERE sala_id = ? AND atual = 1',
      [salaDb.id]
    );

    const estadoSala = {
      id: salaDb.id,
      codigo: salaDb.codigo,
      nome: salaDb.nome,
      tema: salaDb.tema,
      hostId: salaDb.host_id,
      estado: salaDb.status === 'em_andamento' ? ESTADOS_DO_JOGO.EXPLORACAO : ESTADOS_DO_JOGO.LOBBY,
      emCombate: false,
      mapaAtual: mapaAtual || {
        nome: `${salaDb.nome} — Área Inicial`,
        descricao: salaDb.tema,
        imagem_url: '',
      },
      jogadores: new Map(), // usuarioId (number) -> fichaEmPartida
      ordemTurnos: [],      // array de usuarioId
      indiceTurno: 0,
      rodada: 1,
    };

    const membrosDb = await all(
      `SELECT sj.usuario_id, u.nome_usuario, p.*
         FROM sala_jogadores sj
         JOIN usuarios u ON u.id = sj.usuario_id
         JOIN personagens p ON p.id = sj.personagem_id
        WHERE sj.sala_id = ?
        ORDER BY sj.id ASC`,
      [salaDb.id]
    );

    for (const m of membrosDb) {
      this._registrarFichaNaSala(estadoSala, m);
    }

    this.salas.set(codigo, estadoSala);
    return estadoSala;
  }

  _registrarFichaNaSala(estadoSala, registroDb, socketId = null) {
    const uid = Number(registroDb.usuario_id);
    const existente = estadoSala.jogadores.get(uid);

    let inventario = [];
    try {
      inventario = JSON.parse(registroDb.inventario_json || '[]');
    } catch {
      inventario = [];
    }

    const ficha = existente || {
      usuarioId: uid,
      nomeUsuario: registroDb.nome_usuario,
      personagemId: registroDb.id,
      nome: registroDb.nome,
      classe: registroDb.classe,
      nivel: registroDb.nivel || 1,
      forca: registroDb.forca || 5,
      destreza: registroDb.destreza || 5,
      inteligencia: registroDb.inteligencia || 5,
      ca: 10 + Math.floor((registroDb.destreza || 5) / 2),
      hpAtual: registroDb.hp_atual ?? 20,
      hpMax: registroDb.hp_max ?? 20,
      avatarUrl: registroDb.avatar_url || 'https://via.placeholder.com/150',
      inventario,
      efeitos: [],
      inconsciente: (registroDb.hp_atual ?? 20) <= 0,
      online: false,
      socketId: null,
    };

    if (socketId) {
      ficha.socketId = socketId;
      ficha.online = true;
    }

    estadoSala.jogadores.set(uid, ficha);
    if (!estadoSala.ordemTurnos.includes(uid)) {
      estadoSala.ordemTurnos.push(uid);
    }

    return ficha;
  }

  async conectarJogador(codigoSala, usuario, personagemId, socketId) {
    const sala = await this.carregarOuObterSala(codigoSala);
    const uid = Number(usuario.id);

    const registroDb = await get(
      `SELECT p.*, u.nome_usuario, ? AS usuario_id
         FROM personagens p
         JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.id = ? AND p.usuario_id = ?`,
      [uid, personagemId, uid]
    );

    if (!registroDb) {
      throw new Error('Personagem inválido ou não pertence ao usuário autenticado.');
    }

    const ficha = this._registrarFichaNaSala(sala, registroDb, socketId);
    return { sala, jogador: ficha };
  }

  desconectarPorSocket(socketId) {
    for (const sala of this.salas.values()) {
      for (const jogador of sala.jogadores.values()) {
        if (jogador.socketId === socketId) {
          jogador.online = false;
          jogador.socketId = null;
          return { sala, jogador };
        }
      }
    }
    return null;
  }

  transicionarEstado(codigoSala, novoEstado) {
    const sala = this.salas.get(String(codigoSala).toUpperCase());
    if (!sala) return null;
    sala.estado = novoEstado;
    sala.emCombate = novoEstado === ESTADOS_DO_JOGO.COMBATE;
    return sala.estado;
  }

  obterJogadorDaVez(codigoSala) {
    const sala = this.salas.get(String(codigoSala).toUpperCase());
    if (!sala || sala.ordemTurnos.length === 0) return null;
    const uid = sala.ordemTurnos[sala.indiceTurno];
    return sala.jogadores.get(uid) || null;
  }

  avancarTurno(codigoSala) {
    const sala = this.salas.get(String(codigoSala).toUpperCase());
    if (!sala || sala.ordemTurnos.length === 0) return null;

    const total = sala.ordemTurnos.length;
    for (let i = 1; i <= total; i++) {
      const proximoIdx = (sala.indiceTurno + i) % total;
      if (proximoIdx <= sala.indiceTurno) {
        sala.rodada += 1;
      }
      const candidato = sala.jogadores.get(sala.ordemTurnos[proximoIdx]);
      if (candidato && !candidato.inconsciente) {
        sala.indiceTurno = proximoIdx;
        return {
          rodada: sala.rodada,
          jogadorDaVez: candidato,
        };
      }
    }

    return {
      rodada: sala.rodada,
      jogadorDaVez: this.obterJogadorDaVez(codigoSala),
    };
  }

  serializarSala(sala) {
    const daVez = this.obterJogadorDaVez(sala.codigo);
    return {
      id: sala.id,
      codigo: sala.codigo,
      nome: sala.nome,
      tema: sala.tema,
      estado: sala.estado,
      emCombate: sala.emCombate,
      rodada: sala.rodada,
      mapaAtual: sala.mapaAtual,
      jogadorDaVez: daVez ? { usuarioId: daVez.usuarioId, nome: daVez.nome } : null,
      jogadores: Array.from(sala.jogadores.values()),
    };
  }
}

export const gerenciadorEstados = new GerenciadorEstadosJogo();