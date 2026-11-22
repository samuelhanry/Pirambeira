import { Router } from 'express';
import { get, run } from '../banco/conexao.js';
import { gerarHash, conferirSenha } from '../seguranca/senha.js';
import { criarToken } from '../seguranca/tokens.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validarNomeUsuario, validarSenha } from '../utilitarios/validadores.js';
import { assincrono, ErroHttp } from '../utilitarios/http.js';

const router = Router();

// POST /api/auth/registro  { nome_usuario, senha }
router.post('/registro', assincrono(async (req, res) => {
  const nome_usuario = validarNomeUsuario(req.body?.nome_usuario);
  const senha = validarSenha(req.body?.senha);

  if (await get('SELECT id FROM usuarios WHERE nome_usuario = ?', [nome_usuario])) {
    throw new ErroHttp(409, 'Esse nome de usuário já está em uso.');
  }
  const { lastID } = await run('INSERT INTO usuarios (nome_usuario, senha_hash) VALUES (?, ?)', [
    nome_usuario,
    await gerarHash(senha),
  ]);
  const usuario = { id: lastID, nome_usuario };
  res.status(201).json({ usuario, token: criarToken(usuario) });
}));

// POST /api/auth/login  { nome_usuario, senha }
router.post('/login', assincrono(async (req, res) => {
  const { nome_usuario, senha } = req.body || {};
  const registro = typeof nome_usuario === 'string'
    ? await get('SELECT id, nome_usuario, senha_hash FROM usuarios WHERE nome_usuario = ?', [nome_usuario.trim()])
    : null;

  // mesma mensagem para usuário inexistente e senha errada (não revela qual existe)
  if (!registro || typeof senha !== 'string' || !(await conferirSenha(senha, registro.senha_hash))) {
    throw new ErroHttp(401, 'Usuário ou senha inválidos.');
  }
  const usuario = { id: registro.id, nome_usuario: registro.nome_usuario };
  res.json({ usuario, token: criarToken(usuario) });
}));

// GET /api/auth/eu  (rota protegida: devolve o usuário do token)
router.get('/eu', autenticar, (req, res) => res.json({ usuario: req.usuario }));

export default router;
