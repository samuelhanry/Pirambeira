# Pirambeira

Status: estrutura inicial criada para organização do jogo.

## Responsáveis por módulo

- Dev 1: backend, autenticação, banco e organização geral.
- Dev 2: WebSockets, regras do jogo e sistema de turnos.
- Dev 3: prompts, IA e narrativa com Gemini.
- Dev 4: renderização do mapa e elementos visuais em p5.js.
- Dev 5: frontend, HUD e interface do jogador.

## Visão geral

Pirambeira é um RPG multiplayer no estilo roguelike com:
- backend em Node.js + Express;
- comunicação em tempo real com Socket.IO;
- banco de dados com SQLite em desenvolvimento e PostgreSQL em produção;
- integração com Gemini para narrativa, NPCs e mestre;
- frontend em Vite com p5.js;
- organização por módulos para facilitar evolução do projeto.

## Estrutura inicial

```text
.
├── apps/
│   ├── servidor/
│   └── web/
├── packages/
│   └── compartilhado/
├── docs/
├── .gitignore
├── package.json
└── README.md
```

## Planejamento por semanas

### Semana 1
- Definir arquitetura base e estrutura de pastas.
- Preparar monorepo e scripts iniciais.
- Criar banco de dados e esquema de usuários/personagens.

### Semana 2
- Implementar autenticação e rotas protegidas.
- Criar sistema básico de salas e lobby.
- Preparar conexão com WebSocket.

### Semana 3
- Criar motor de regras, HP, turnos e D20.
- Implementar movimentação básica e transição entre salas.
- Validar estado do jogo em tempo real.

### Semana 4
- Integrar Gemini para prompts e narrativa.
- Evoluir NPCs, mestre e rolagens narrativas.
- Ajustar respostas JSON estruturadas.

### Semana 5
- Montar frontend com HUD, chat e painel de personagem.
- Renderizar mapa procedimental em p5.js.
- Conectar frontend com backend e websocket.

### Semana 6
- Validar gameplay completo com multiplayer.
- Ajustar UX, responsividade e mensagens de jogo.
- Preparar deploy local e documentação final.

## Como o projeto se conecta

- O frontend usa HTTP para autenticação e consultas de estado.
- O WebSocket serve para ações em tempo real durante a partida.
- O backend aplica regras do jogo e persiste dados.
- A IA gera narrativa, cenários e respostas do mestre.
- O p5.js renderiza a parte visual do mapa e do ambiente.
