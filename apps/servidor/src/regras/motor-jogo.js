import { ESTADOS_DO_JOGO } from '../../../../packages/compartilhado/src/constantes.js';
import { run } from '../banco/conexao.js';
import { gerenciadorEstados } from './estados-jogo.js';
import { rolarD20 } from '../servicos/combate.js';

export async function registrarMensagemBanco({ salaId, usuarioId = null, personagemId = null, autorTipo, conteudo }) {
  await run(
    `INSERT INTO mensagens (sala_id, usuario_id, personagem_id, autor_tipo, conteudo)
     VALUES (?, ?, ?, ?, ?)`,
    [salaId, usuarioId, personagemId, autorTipo, conteudo]
  );
}

export async function processarAcaoJogador({ codigoSala, usuarioId, acaoTexto, atributoTeste = null, dificuldade = 12 }) {
  const sala = await gerenciadorEstados.carregarOuObterSala(codigoSala);
  const jogador = sala.jogadores.get(Number(usuarioId));

  if (!jogador) {
    throw new Error('Você não está registrado como jogador ativo nesta sala.');
  }

  if (jogador.inconsciente) {
    throw new Error(`${jogador.nome} está inconsciente (0 HP) e não pode agir.`);
  }

  if (sala.estado === ESTADOS_DO_JOGO.PROCESSANDO_MESTRE) {
    throw new Error('Aguarde o Mestre concluir a narração da rodada atual.');
  }

  // Validação de turno quando há mais de 1 jogador na sala
  const jogadorDaVez = gerenciadorEstados.obterJogadorDaVez(codigoSala);
  if (sala.jogadores.size > 1 && jogadorDaVez && jogadorDaVez.usuarioId !== Number(usuarioId)) {
    throw new Error(`Não é o seu turno! Aguarde a jogada de ${jogadorDaVez.nome}.`);
  }

  let resultadoDado = null;
  if (atributoTeste && ['forca', 'destreza', 'inteligencia'].includes(atributoTeste)) {
    const mod = Math.floor((jogador[atributoTeste] || 5) / 2);
    resultadoDado = rolarD20({
      modificador: mod,
      dificuldade: Number(dificuldade) || 12,
      atributo: atributoTeste,
    });
  }

  gerenciadorEstados.transicionarEstado(codigoSala, ESTADOS_DO_JOGO.PROCESSANDO_MESTRE);

  await registrarMensagemBanco({
    salaId: sala.id,
    usuarioId: jogador.usuarioId,
    personagemId: jogador.personagemId,
    autorTipo: 'jogador',
    conteudo: acaoTexto,
  });

  return {
    sala,
    jogador,
    acaoTexto,
    resultadoDado,
  };
}

export async function transicionarMapaSala(codigoSala, { nome, descricao, promptImagem = '', imagemUrl = '' }) {
  const sala = await gerenciadorEstados.carregarOuObterSala(codigoSala);
  gerenciadorEstados.transicionarEstado(codigoSala, ESTADOS_DO_JOGO.TRANSICAO_MAPA);

  await run('UPDATE mapas_cenarios SET atual = 0 WHERE sala_id = ?', [sala.id]);
  const ordem = Date.now();
  await run(
    `INSERT INTO mapas_cenarios (sala_id, ordem, nome, descricao, prompt_imagem, imagem_url, atual)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [sala.id, ordem, nome, descricao, promptImagem, imagemUrl]
  );

  sala.mapaAtual = {
    ordem,
    nome,
    descricao,
    prompt_imagem: promptImagem,
    imagem_url: imagemUrl,
    atual: 1,
  };

  gerenciadorEstados.transicionarEstado(codigoSala, ESTADOS_DO_JOGO.EXPLORACAO);
  return sala.mapaAtual;
}