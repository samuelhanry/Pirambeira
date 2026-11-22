import { Router } from 'express';
import crypto from 'node:crypto';
import { all, get, run } from '../banco/conexao.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validarSala } from '../utilitarios/validadores.js';
import { assincrono, ErroHttp } from '../utilitarios/http.js';

const router = Router();
router.use(autenticar);

const MAX_JOGADORES = 6;
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I

const gerarCodigo = () =>
  Array.from(crypto.randomBytes(6), (b) => ALFABETO[b % ALFABETO.length]).join('');

async function buscarSala(codigo) {
  const sala = await get('SELECT * FROM salas WHERE codigo = ?', [String(codigo).toUpperCase()]);
  if (!sala) throw new ErroHttp(404, 'Sala não encontrada.');
  return sala;
}

const listarJogadores = (salaId) => all(
  `SELECT sj.usuario_id, u.nome_usuario, p.id AS personagem_id, p.nome, p.classe,
          p.hp_atual, p.hp_max, p.avatar_url
     FROM sala_jogadores sj
     JOIN usuarios u ON u.id = sj.usuario_id
     JOIN personagens p ON p.id = sj.personagem_id
    WHERE sj.sala_id = ? ORDER BY sj.id`, [salaId]);

// POST /api/salas  { nome, tema }  -> o criador vira host (o Gemini gera o mundo depois, via Dev 3)
router.post('/', assincrono(async (req, res) => {
  const { nome, tema } = validarSala(req.body);
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigo();
    try {
      await run('INSERT INTO salas (codigo, nome, tema, host_id) VALUES (?, ?, ?, ?)',
        [codigo, nome, tema, req.usuario.id]);
      return res.status(201).json(await buscarSala(codigo));
    } catch (erro) {
      if (!String(erro.message).includes('UNIQUE')) throw erro; // colisão de código: tenta outro
    }
  }
  throw new ErroHttp(500, 'Não foi possível gerar o código da sala.');
}));

// GET /api/salas  -> salas abertas (lobby/em andamento)
router.get('/', assincrono(async (_req, res) => {
  res.json(await all(
    `SELECT s.codigo, s.nome, s.tema, s.status, u.nome_usuario AS host,
            (SELECT COUNT(*) FROM sala_jogadores WHERE sala_id = s.id) AS jogadores
       FROM salas s JOIN usuarios u ON u.id = s.host_id
      WHERE s.status != 'encerrada' ORDER BY s.id DESC`));
}));

// POST /api/salas/entrar  { codigo, personagem_id }
router.post('/entrar', assincrono(async (req, res) => {
  const { codigo, personagem_id } = req.body || {};
  if (!codigo || !personagem_id) throw new ErroHttp(400, 'Informe codigo e personagem_id.');

  const sala = await buscarSala(codigo);
  if (sala.status === 'encerrada') throw new ErroHttp(409, 'Essa sala já foi encerrada.');

  const personagem = await get('SELECT id FROM personagens WHERE id = ? AND usuario_id = ?',
    [personagem_id, req.usuario.id]);
  if (!personagem) throw new ErroHttp(404, 'Personagem não encontrado.');

  const jaDentro = await get('SELECT id FROM sala_jogadores WHERE sala_id = ? AND usuario_id = ?',
    [sala.id, req.usuario.id]);
  if (!jaDentro) {
    const { total } = await get('SELECT COUNT(*) AS total FROM sala_jogadores WHERE sala_id = ?', [sala.id]);
    if (total >= MAX_JOGADORES) throw new ErroHttp(409, `Sala cheia (máx. ${MAX_JOGADORES} jogadores).`);
  }
  await run(
    `INSERT INTO sala_jogadores (sala_id, usuario_id, personagem_id) VALUES (?, ?, ?)
     ON CONFLICT (sala_id, usuario_id) DO UPDATE SET personagem_id = excluded.personagem_id`,
    [sala.id, req.usuario.id, personagem_id]);

  res.json({ sala, jogadores: await listarJogadores(sala.id) });
}));

// GET /api/salas/:codigo
router.get('/:codigo', assincrono(async (req, res) => {
  const sala = await buscarSala(req.params.codigo);
  res.json({ sala, jogadores: await listarJogadores(sala.id) });
}));

// DELETE /api/salas/:codigo/sair
router.delete('/:codigo/sair', assincrono(async (req, res) => {
  const sala = await buscarSala(req.params.codigo);
  await run('DELETE FROM sala_jogadores WHERE sala_id = ? AND usuario_id = ?', [sala.id, req.usuario.id]);
  res.status(204).end();
}));

export default router;
