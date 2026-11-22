# Módulo: HUD do Jogador & Serviço de Socket.IO do Cliente
**Responsável:** Dev 5  

## HUD do Jogador (`public/css/hud.css` e `public/js/hudController.js`)
- Exibe HP com código de cores dinâmico, Nível, Classe, Local Atual e modo Exploração/Combate em tempo real.

## Serviço de Socket.IO (`public/js/socketService.js`)
- Encapsula a conexão WebSocket, reconexão automática, envio de ações de movimento/combate e padrão Observer para atualizar a UI sem acoplamento.
