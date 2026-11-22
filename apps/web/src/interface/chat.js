import { socketCliente } from '../servicos/socket-cliente.js';

export function anexarMensagemChat({ tipo, autorNome, conteudo }) {
  const chatMessages = document.getElementById('chat-messages');
  const msgElement = document.createElement('div');
  msgElement.classList.add('msg', `msg-${tipo || 'sistema'}`);

  const autor = document.createElement('strong');
  autor.textContent = `${autorNome}: `;

  const texto = document.createElement('span');
  texto.textContent = conteudo;

  msgElement.appendChild(autor);
  msgElement.appendChild(texto);
  chatMessages.appendChild(msgElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function inicializarChat() {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const selectAtributo = document.getElementById('atributo-teste');
  const gmIndicator = document.getElementById('gm-indicator');

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const acaoTexto = chatInput.value.trim();
    if (!acaoTexto) return;

    const atributo = selectAtributo.value || null;
    socketCliente.enviarAcao(acaoTexto, atributo, 12);
    chatInput.value = '';
  });

  socketCliente.on('new_message', (msg) => anexarMensagemChat(msg));

  socketCliente.on('gm_thinking', ({ status }) => {
    if (status) {
      gmIndicator.classList.remove('hidden');
      chatInput.disabled = true;
    } else {
      gmIndicator.classList.add('hidden');
      chatInput.disabled = false;
      chatInput.focus();
    }
  });

  socketCliente.on('system_error', ({ mensagem }) => {
    anexarMensagemChat({ tipo: 'sistema', autorNome: 'Aviso', conteudo: mensagem });
  });
}