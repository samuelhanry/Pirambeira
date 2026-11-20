import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server } from 'socket.io';
import { ambiente } from './configuracoes/ambiente.js';
import { iniciarBanco } from './banco/conexao.js';
import autenticacaoRotas from './rotas/autenticacao.rotas.js';
import personagensRotas from './rotas/personagens.rotas.js';
import salasRotas from './rotas/salas.rotas.js';
import partidaRotas from './rotas/partida.rotas.js';

await iniciarBanco();

const app = express();
app.use(cors({ origin: ambiente.URL_CLIENTE }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/saude', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', autenticacaoRotas);
app.use('/api/personagens', personagensRotas);
app.use('/api/salas', salasRotas);
app.use('/api/partida', partidaRotas);

app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// eslint-disable-next-line no-unused-vars
app.use((erro, _req, res, _next) => {
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  const status = erro.status || 500;
  if (status === 500) console.error('[erro]', erro);
  res.status(status).json({ erro: status === 500 ? 'Erro interno do servidor.' : erro.message });
});

const servidor = http.createServer(app);
const io = new Server(servidor, { cors: { origin: ambiente.URL_CLIENTE } });
// TODO (Dev 2): registrar aqui os eventos -> registrarWebsocket(io)
// Para autenticar o socket, usar verificarToken() de seguranca/tokens.js no handshake.

servidor.listen(ambiente.PORTA, () => {
  console.log(`[servidor] http://localhost:${ambiente.PORTA}`);
});
