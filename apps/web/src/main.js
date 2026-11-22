import p5 from 'p5';
import { socketCliente } from './servicos/socket-cliente.js';
import { inicializarHUD } from './interface/hud.js';
import { inicializarFicha } from './interface/ficha-personagem.js';
import { inicializarChat, anexarMensagemChat } from './interface/chat.js';

const API_URL = 'http://localhost:3000/api';

inicializarHUD();
inicializarFicha();
inicializarChat();

// Canvas p5.js
new p5((sketch) => {
  sketch.setup = () => {
    sketch.createCanvas(680, 360);
    sketch.noLoop();
  };
  sketch.draw = () => {
    sketch.background(12, 18, 30);
    sketch.stroke(90, 120, 160);
    sketch.noFill();
    for (let x = 0; x < 9; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        sketch.rect(x * 70 + 25, y * 64 + 20, 60, 54);
      }
    }
    sketch.fill(125, 211, 252);
    sketch.circle(125, 110, 28);
  };
}, document.getElementById('canvas-container'));

const statusEl = document.getElementById('lobby-status');
const setStatus = (msg) => { statusEl.textContent = msg; };

async function apiFetch(rota, { method = 'GET', body = null, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const jwt = token || localStorage.getItem('pirambeira_token');
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const resp = await fetch(`${API_URL}${rota}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const dados = resp.status === 204 ? {} : await resp.json();
  if (!resp.ok) throw new Error(dados.erro || 'Erro na requisição.');
  return dados;
}

// Etapa 1: Autenticação
async function autenticarUsuario(endpoint) {
  const nome_usuario = document.getElementById('auth-user').value.trim();
  const senha = document.getElementById('auth-pass').value;
  try {
    setStatus('Autenticando...');
    const res = await apiFetch(`/auth/${endpoint}`, {
      method: 'POST',
      body: { nome_usuario, senha },
    });
    localStorage.setItem('pirambeira_token', res.token);
    await carregarEtapaPersonagens();
  } catch (err) {
    setStatus(err.message);
  }
}

document.getElementById('btn-login').onclick = () => autenticarUsuario('login');
document.getElementById('btn-register').onclick = () => autenticarUsuario('registro');

// Etapa 2: Personagens
async function carregarEtapaPersonagens() {
  document.getElementById('step-auth').classList.add('hidden');
  document.getElementById('step-character').classList.remove('hidden');
  setStatus('Selecione ou crie seu personagem');

  const lista = await apiFetch('/personagens');
  const select = document.getElementById('select-personagem');
  select.innerHTML = '';

  if (lista.length === 0) {
    select.innerHTML = '<option value="">Nenhum personagem criado ainda</option>';
  } else {
    lista.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nome} (${p.classe.toUpperCase()} • Nv.${p.nivel})`;
      select.appendChild(opt);
    });
  }
}

document.getElementById('btn-usar-personagem').onclick = async () => {
  const id = document.getElementById('select-personagem').value;
  if (!id) return setStatus('Crie um personagem primeiro.');
  localStorage.setItem('pirambeira_personagem_id', id);
  await carregarEtapaSalas();
};

document.getElementById('btn-criar-personagem').onclick = async () => {
  const nome = document.getElementById('char-input-nome').value.trim();
  const classe = document.getElementById('char-input-classe').value;
  const descricao_visual = document.getElementById('char-input-desc').value.trim();

  const presets = {
    guerreiro: { forca: 8, destreza: 6, inteligencia: 6 },
    ladino: { forca: 5, destreza: 8, inteligencia: 7 },
    mago: { forca: 4, destreza: 6, inteligencia: 10 },
  };

  try {
    setStatus('Criando personagem...');
    const novo = await apiFetch('/personagens', {
      method: 'POST',
      body: { nome, classe, descricao_visual, ...presets[classe] },
    });
    localStorage.setItem('pirambeira_personagem_id', novo.id);
    await carregarEtapaSalas();
  } catch (err) {
    setStatus(err.message);
  }
};

// Etapa 3: Salas
async function carregarEtapaSalas() {
  document.getElementById('step-character').classList.add('hidden');
  document.getElementById('step-room').classList.remove('hidden');
  setStatus('Escolha uma sala aberta ou crie uma nova');

  const salas = await apiFetch('/salas');
  const select = document.getElementById('select-salas-abertas');
  select.innerHTML = '<option value="">-- Salas abertas no servidor --</option>';

  salas.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.codigo;
    opt.textContent = `#${s.codigo} — ${s.nome} (Host: ${s.host} • ${s.jogadores}/6)`;
    select.appendChild(opt);
  });

  select.onchange = () => {
    if (select.value) document.getElementById('room-input-codigo').value = select.value;
  };
}

async function entrarNaSalaEIniciar(codigoSala) {
  const personagem_id = Number(localStorage.getItem('pirambeira_personagem_id'));
  const codigo = codigoSala.trim().toUpperCase();

  await apiFetch('/salas/entrar', {
    method: 'POST',
    body: { codigo, personagem_id },
  });

  localStorage.setItem('pirambeira_sala', codigo);
  await conectarPartidaAtiva();
}

document.getElementById('btn-entrar-sala').onclick = async () => {
  const codigo = document.getElementById('room-input-codigo').value;
  if (!codigo) return setStatus('Selecione ou digite o código da sala.');
  try {
    setStatus('Entrando na sala...');
    await entrarNaSalaEIniciar(codigo);
  } catch (err) {
    setStatus(err.message);
  }
};

document.getElementById('btn-criar-sala').onclick = async () => {
  const nome = document.getElementById('room-input-nome').value.trim();
  const tema = document.getElementById('room-input-tema').value.trim();
  try {
    setStatus('Criando sala...');
    const sala = await apiFetch('/salas', {
      method: 'POST',
      body: { nome, tema },
    });
    await entrarNaSalaEIniciar(sala.codigo);
  } catch (err) {
    setStatus(err.message);
  }
};

// Conexão final na partida
async function conectarPartidaAtiva() {
  const token = localStorage.getItem('pirambeira_token');
  const codigoSala = localStorage.getItem('pirambeira_sala');
  const personagemId = localStorage.getItem('pirambeira_personagem_id');

  if (!token) return;
  if (!personagemId) return carregarEtapaPersonagens();
  if (!codigoSala) return carregarEtapaSalas();

  try {
    const snapshot = await apiFetch(`/partida/${codigoSala}/estado`);
    document.getElementById('lobby-overlay').classList.add('hidden');
    document.getElementById('hud-room-id').textContent = `#${codigoSala}`;

    document.getElementById('chat-messages').innerHTML = '';
    snapshot.mensagens.forEach((m) =>
      anexarMensagemChat({
        tipo: m.autor_tipo,
        autorNome: m.autor_tipo === 'mestre' ? 'Mestre (Gemini)' : m.autor_tipo,
        conteudo: m.conteudo,
      })
    );

    socketCliente.connect(token);
    socketCliente.joinRoom(codigoSala, Number(personagemId));
  } catch {
    localStorage.removeItem('pirambeira_sala');
    await carregarEtapaSalas();
  }
}

document.getElementById('btn-iniciar-partida').onclick = () => {
  socketCliente.iniciarPartida();
};

document.getElementById('btn-sair-sessao').onclick = () => {
  localStorage.clear();
  location.reload();
};

conectarPartidaAtiva();