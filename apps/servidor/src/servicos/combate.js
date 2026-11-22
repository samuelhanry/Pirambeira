import { run } from '../banco/conexao.js';

export function rolarD20({ modificador = 0, dificuldade = 12, atributo = 'geral' } = {}) {
  const natural = Math.floor(Math.random() * 20) + 1;
  const mod = Number(modificador) || 0;
  const total = natural + mod;
  const critico = natural === 20;
  const falhaCritica = natural === 1;
  const sucesso = critico || (!falhaCritica && total >= dificuldade);

  return {
    natural,
    modificador: mod,
    total,
    dificuldade,
    atributo,
    critico,
    falhaCritica,
    sucesso,
  };
}

export async function alterarHpPersonagem(jogador, deltaHp) {
  const hpAnterior = jogador.hpAtual;
  const novoHp = Math.max(0, Math.min(jogador.hpMax, hpAnterior + Number(deltaHp)));

  jogador.hpAtual = novoHp;
  jogador.inconsciente = novoHp === 0;

  await run('UPDATE personagens SET hp_atual = ? WHERE id = ?', [
    jogador.hpAtual,
    jogador.personagemId,
  ]);

  return {
    usuarioId: jogador.usuarioId,
    personagemId: jogador.personagemId,
    nome: jogador.nome,
    hpAnterior,
    hpAtual: jogador.hpAtual,
    hpMax: jogador.hpMax,
    inconsciente: jogador.inconsciente,
  };
}

export async function executarAtaque(atacante, alvo, { tipoGolpe = 'Ataque Básico', caAlvo = 12 } = {}) {
  const modAtributo =
    atacante.classe === 'mago'
      ? Math.floor(atacante.inteligencia / 2)
      : atacante.classe === 'ladino'
        ? Math.floor(atacante.destreza / 2)
        : Math.floor(atacante.forca / 2);

  const testeAtaque = rolarD20({
    modificador: modAtributo,
    dificuldade: alvo ? alvo.ca : caAlvo,
    atributo: atacante.classe === 'mago' ? 'inteligencia' : atacante.classe === 'ladino' ? 'destreza' : 'forca',
  });

  if (!testeAtaque.sucesso) {
    return {
      acertou: false,
      tipoGolpe,
      dado: testeAtaque,
      dano: 0,
      alvoAtualizado: null,
    };
  }

  const dadoDano = Math.floor(Math.random() * 6) + 1;
  const danoBase = dadoDano + modAtributo;
  const danoFinal = testeAtaque.critico ? danoBase * 2 : Math.max(1, danoBase);

  let alvoAtualizado = null;
  if (alvo) {
    alvoAtualizado = await alterarHpPersonagem(alvo, -danoFinal);
  }

  return {
    acertou: true,
    critico: testeAtaque.critico,
    tipoGolpe,
    dado: testeAtaque,
    dano: danoFinal,
    alvoAtualizado,
  };
}