import { io } from 'socket.io-client';
import { EVENTOS_SOCKET } from '../../../../packages/compartilhado/src/constantes.js';

const URL_SERVIDOR = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SocketCliente {
  constructor() {
    this.socket = null;
    this.codigoSala = null;
    this.personagemId = null;
    this.listeners = {};
  }

  connect(tokenJwt) {
    if (this.socket) return;

    this.socket = io(URL_SERVIDOR, {
      auth: { token: tokenJwt },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.registrarEventosBase();
  }

  registrarEventosBase() {
    this.socket.on('connect', () => {
      this.emitirParaUI('connection_status', { online: true });
      if (this.codigoSala && this.personagemId) {
        this.joinRoom(this.codigoSala, this.personagemId);
      }
    });

    this.socket.on('disconnect', () => {
      this.emitirParaUI('connection_status', { online: false });
    });

    this.socket.on('connect_error', (err) => {
      this.emitirParaUI('system_error', { mensagem: `Falha de conexão WebSocket: ${err.message}` });
    });

    this.socket.on(EVENTOS_SOCKET.NEW_MESSAGE, (data) => this.emitirParaUI('new_message', data));
    this.socket.on(EVENTOS_SOCKET.UPDATE_HUD, (data) => this.emitirParaUI('update_hud', data));
    this.socket.on(EVENTOS_SOCKET.UPDATE_INVENTORY, (data) => this.emitirParaUI('update_inventory', data));
    this.socket.on(EVENTOS_SOCKET.TURN_CHANGED, (data) => this.emitirParaUI('turn_changed', data));
    this.socket.on(EVENTOS_SOCKET.DICE_ROLLED, (data) => this.emitirParaUI('dice_rolled', data));
    this.socket.on(EVENTOS_SOCKET.MAP_CHANGED, (data) => this.emitirParaUI('map_changed', data));
    this.socket.on(EVENTOS_SOCKET.GM_THINKING, (data) => this.emitirParaUI('gm_thinking', data));
    this.socket.on(EVENTOS_SOCKET.SALA_ESTADO, (data) => this.emitirParaUI('sala_estado', data));
    this.socket.on(EVENTOS_SOCKET.SYSTEM_ERROR, (data) => this.emitirParaUI('system_error', data));
  }

  joinRoom(codigoSala, personagemId) {
    this.codigoSala = String(codigoSala).toUpperCase();
    this.personagemId = personagemId;
    this.socket.emit(EVENTOS_SOCKET.JOIN_ROOM, {
      codigoSala: this.codigoSala,
      personagemId: this.personagemId,
    });
  }

  iniciarPartida() {
    if (!this.socket || !this.codigoSala) return;
    this.socket.emit(EVENTOS_SOCKET.INICIAR_PARTIDA, { codigoSala: this.codigoSala });
  }

  enviarAcao(acaoTexto, atributoTeste = null, dificuldade = 12) {
    if (!this.socket || !this.codigoSala) return;
    this.socket.emit(EVENTOS_SOCKET.SEND_ACTION, {
      codigoSala: this.codigoSala,
      acaoTexto,
      atributoTeste: atributoTeste || null,
      dificuldade,
    });
  }

  usarItem(itemId) {
    if (!this.socket || !this.codigoSala) return;
    this.socket.emit(EVENTOS_SOCKET.USAR_ITEM, {
      codigoSala: this.codigoSala,
      itemId,
    });
  }

  on(evento, callback) {
    if (!this.listeners[evento]) this.listeners[evento] = [];
    this.listeners[evento].push(callback);
  }

  emitirParaUI(evento, payload) {
    if (this.listeners[evento]) {
      this.listeners[evento].forEach((cb) => cb(payload));
    }
  }
}

export const socketCliente = new SocketCliente();