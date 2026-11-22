import { Router } from 'express';
import { all, get, run } from '../banco/conexao.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validarPersonagem } from '../utilitarios/validadores.js';
import { assincrono, ErroHttp } from '../utilitarios/http.js';

const router = Router();
router.use(autenticar);

const COLUNAS = `id, nome, classe, forca, destreza, inteligencia, hp_max, hp_atual,
                 nivel, descricao_visual, avatar_url, criado_em`;

async function buscarDoUsuario(id, usuarioId) {
  const personagem = await get(
    `SELECT ${COLUNAS} FROM personagens WHERE id = ? AND usuario_id = ?`, [id, usuarioId]);
  if (!personagem) throw new ErroHttp(404, 'Personagem não encontrado.');
  return personagem;
}

// GET /api/personagens  -> personagens do usuário logado
router.get('/', assincrono(async (req, res) => {
  res.json(await all(`SELECT ${COLUNAS} FROM personagens WHERE usuario_id = ? ORDER BY id DESC`, [req.usuario.id]));
}));

// POST /api/personagens  { nome, classe, forca, destreza, inteligencia, descricao_visual }
// O avatar nasce vazio; o serviço de imagem (Dev 3) preenche via PATCH /:id/avatar ou direto no banco.
router.post('/', assincrono(async (req, res) => {
  const p = validarPersonagem(req.body);
  const { lastID } = await run(
    `INSERT INTO personagens (usuario_id, nome, classe, forca, destreza, inteligencia, descricao_visual)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.usuario.id, p.nome, p.classe, p.forca, p.destreza, p.inteligencia, p.descricao_visual]);
  res.status(201).json(await buscarDoUsuario(lastID, req.usuario.id));
}));

// GET /api/personagens/:id  -> ficha
router.get('/:id', assincrono(async (req, res) => {
  res.json(await buscarDoUsuario(req.params.id, req.usuario.id));
}));

// PUT /api/personagens/:id  -> edita ficha (mesmos campos do POST)
router.put('/:id', assincrono(async (req, res) => {
  await buscarDoUsuario(req.params.id, req.usuario.id);
  const p = validarPersonagem(req.body);
  await run(
    `UPDATE personagens SET nome=?, classe=?, forca=?, destreza=?, inteligencia=?, descricao_visual=?
     WHERE id = ? AND usuario_id = ?`,
    [p.nome, p.classe, p.forca, p.destreza, p.inteligencia, p.descricao_visual, req.params.id, req.usuario.id]);
  res.json(await buscarDoUsuario(req.params.id, req.usuario.id));
}));

// PATCH /api/personagens/:id/avatar  { avatar_url }  -> vincula o retrato gerado pela IA
router.patch('/:id/avatar', assincrono(async (req, res) => {
  await buscarDoUsuario(req.params.id, req.usuario.id);
  const { avatar_url } = req.body || {};
  if (typeof avatar_url !== 'string' || !avatar_url) throw new ErroHttp(400, 'avatar_url é obrigatório.');
  await run('UPDATE personagens SET avatar_url = ? WHERE id = ?', [avatar_url, req.params.id]);
  res.json(await buscarDoUsuario(req.params.id, req.usuario.id));
}));

// DELETE /api/personagens/:id
router.delete('/:id', assincrono(async (req, res) => {
  await buscarDoUsuario(req.params.id, req.usuario.id);
  await run('DELETE FROM personagens WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
  res.status(204).end();
}));

export default router;
