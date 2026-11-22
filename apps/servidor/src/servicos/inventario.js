import { run } from '../banco/conexao.js';
import { alterarHpPersonagem } from './combate.js';

async function salvarInventarioNoBanco(jogador) {
  await run('UPDATE personagens SET inventario_json = ? WHERE id = ?', [
    JSON.stringify(jogador.inventario),
    jogador.personagemId,
  ]);
}

export async function adicionarItemInventario(jogador, novoItem) {
  const existente = jogador.inventario.find((item) => item.id === novoItem.id);
  if (existente) {
    existente.quantidade = (existente.quantidade || 1) + (novoItem.quantidade || 1);
  } else {
    jogador.inventario.push({
      id: novoItem.id || `item-${Date.now()}`,
      nome: novoItem.nome,
      tipo: novoItem.tipo || 'consumivel',
      efeitoHp: Number(novoItem.efeitoHp) || 0,
      quantidade: Number(novoItem.quantidade) || 1,
      equipado: false,
    });
  }

  await salvarInventarioNoBanco(jogador);
  return jogador.inventario;
}

export async function usarItemInventario(jogador, itemId) {
  const indice = jogador.inventario.findIndex((i) => String(i.id) === String(itemId));
  if (indice === -1) {
    throw new Error('Item não encontrado no inventário do personagem.');
  }

  const item = jogador.inventario[indice];
  let alteracaoHp = null;

  if (item.tipo === 'consumivel') {
    if (item.efeitoHp !== 0) {
      alteracaoHp = await alterarHpPersonagem(jogador, item.efeitoHp);
    }
    item.quantidade -= 1;
    if (item.quantidade <= 0) {
      jogador.inventario.splice(indice, 1);
    }
  } else if (item.tipo === 'equipamento') {
    item.equipado = !item.equipado;
  }

  await salvarInventarioNoBanco(jogador);

  return {
    itemUsado: { id: item.id, nome: item.nome, tipo: item.tipo },
    alteracaoHp,
    inventario: jogador.inventario,
  };
}