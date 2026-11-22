import { socketCliente } from '../servicos/socket-cliente.js';

export function inicializarHUD() {
  const hudName = document.getElementById('hud-name');
  const hudAvatar = document.getElementById('hud-avatar');
  const hpFill = document.getElementById('hud-hp-fill');
  const hpText = document.getElementById('hud-hp-text');
  const classLevel = document.getElementById('hud-class-level');
  const mapName = document.getElementById('hud-map-name');
  const combatState = document.getElementById('hud-combat-state');
  const turnIndicator = document.getElementById('hud-turn-indicator');
  const connDot = document.getElementById('hud-connection-dot');

  socketCliente.on('update_hud', (dados) => {
    const { nome, avatarUrl, hpAtual, hpMax, nivel, classe, emCombate } = dados;

    if (nome) hudName.textContent = nome;
    if (avatarUrl) hudAvatar.src = avatarUrl;

    const percentual = Math.max(0, Math.min(100, (hpAtual / hpMax) * 100));
    hpFill.style.width = `${percentual}%`;
    hpText.textContent = `${hpAtual} / ${hpMax} HP`;

    hpFill.classList.remove('warning', 'critical');
    if (percentual <= 25) hpFill.classList.add('critical');
    else if (percentual <= 55) hpFill.classList.add('warning');

    if (nivel && classe) {
      classLevel.textContent = `${classe.toUpperCase()} • Nv. ${nivel}`;
    }

    if (emCombate) {
      combatState.textContent = '⚔️ Em Combate';
      combatState.className = 'tag-mode mode-combat';
    } else {
      combatState.textContent = '🧭 Exploração';
      combatState.className = 'tag-mode mode-explore';
    }
  });

  socketCliente.on('turn_changed', ({ rodada, jogadorDaVez }) => {
    if (jogadorDaVez) {
      turnIndicator.textContent = `Rodada ${rodada} • Vez de ${jogadorDaVez.nome}`;
    }
  });

  socketCliente.on('map_changed', ({ nomeLocal, descricao, imagemUrl }) => {
    mapName.textContent = nomeLocal;
    const box = document.getElementById('scene-image-box');
    const img = document.getElementById('scene-image');
    const desc = document.getElementById('scene-description');
    if (imagemUrl) {
      img.src = imagemUrl;
      desc.textContent = descricao || '';
      box.classList.remove('hidden');
    }
  });

  socketCliente.on('connection_status', ({ online }) => {
    connDot.className = online ? 'conn-dot online' : 'conn-dot offline';
    connDot.title = online ? 'Conectado ao servidor' : 'Desconectado';
  });
}