import { Router } from 'express';
import { all, get } from '../banco/conexao.js';
import { autenticar } from '../middlewares/autenticar.js';
import { assincrono, ErroHttp } from '../utilitarios/http.js';

const router = Router();
router.use(autenticar);

// GET /api/partida/:codigo/estado  -> snapshot para o front carregar ao entrar/reconectar
// (somente quem está na sala). Ações em tempo real ficam no WebSocket (Dev 2).
router.get('/:codigo/estado', assincrono(async (req, res) => {
  const sala = await get('SELECT * FROM salas WHERE codigo = ?', [req.params.codigo.toUpperCase()]);
  if (!sala) throw new ErroHttp(404, 'Sala não encontrada.');

  const membro = await get('SELECT id FROM sala_jogadores WHERE sala_id = ? AND usuario_id = ?',
    [sala.id, req.usuario.id]);
  if (!membro) throw new ErroHttp(403, 'Você não participa dessa sala.');

  const jogadores = await all(
    `SELECT p.id, p.nome, p.classe, p.hp_atual, p.hp_max, p.avatar_url
       FROM sala_jogadores sj JOIN personagens p ON p.id = sj.personagem_id
      WHERE sj.sala_id = ?`, [sala.id]);
  const mapa_atual = await get('SELECT * FROM mapas_cenarios WHERE sala_id = ? AND atual = 1', [sala.id]) || null;
  const mensagens = (await all(
    'SELECT id, autor_tipo, usuario_id, personagem_id, conteudo, criado_em FROM mensagens WHERE sala_id = ? ORDER BY id DESC LIMIT 50',
    [sala.id])).reverse();

  res.json({ sala, jogadores, mapa_atual, mensagens });
}));

export default router;
