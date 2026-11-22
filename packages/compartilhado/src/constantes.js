export const TIPOS_DE_SALA = {
  VILA: 'vila',
  MASMORRA: 'masmorra',
  CHEFE: 'chefe',
};

export const ESTADOS_DO_JOGO = {
  MENU: 'menu',
  LOBBY: 'lobby',
  EXPLORACAO: 'exploracao',
  COMBATE: 'combate',
  PROCESSANDO_MESTRE: 'processando_mestre',
  TRANSICAO_MAPA: 'transicao_mapa',
  RODADA: 'rodada',
  VITORIA: 'vitoria',
  DERROTA: 'derrota',
};

export const EVENTOS_SOCKET = {
  // Conexão e Sala (compatível com Dev 5 + Pirambeira)
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SALA_ESTADO: 'sala_estado',

  // Ações, Turnos e D20
  SEND_ACTION: 'send_action',
  COMBAT_ACTION: 'combat_action',
  USAR_ITEM: 'usar_item',
  INICIAR_PARTIDA: 'iniciar_partida',
  TROCAR_MAPA: 'trocar_mapa',

  // Atualizações de UI (eventos consumidos pelo Dev 5)
  NEW_MESSAGE: 'new_message',
  UPDATE_HUD: 'update_hud',
  UPDATE_INVENTORY: 'update_inventory',
  TURN_CHANGED: 'turn_changed',
  DICE_ROLLED: 'dice_rolled',
  MAP_CHANGED: 'map_changed',
  GM_THINKING: 'gm_thinking',
  SYSTEM_ERROR: 'system_error',
};