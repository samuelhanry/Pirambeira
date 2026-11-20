# Roadmap por sprint

Sprints de 1 semana. Todos programam; os papéis de Product Owner e Scrum Master rotacionam a cada sprint.

## Responsáveis por módulo

| Dev | Domínio | Entregas principais |
|---|---|---|
| Dev 1 | Back-end e banco | Express, SQLite, autenticação (bcrypt/JWT), CRUD de usuários e personagens, rotas protegidas, salas e persistência |
| Dev 2 | WebSockets e regras | Socket.IO, sincronização de salas, turnos, HP, D20, inventário e transição de mapas |
| Dev 3 | Prompts e Gemini | Integração `@google/genai`, prompts do Mestre/NPCs, JSON estruturado, tratamento de erro 429, geração de imagens |
| Dev 4 | Renderização p5.js | Mapas procedurais no canvas, avatares e animações |
| Dev 5 | Front-end e HUD | HTML/CSS, chat em tempo real, ficha do personagem, HUD e consumo das APIs |

## Sprint 1: Planejamento, banco e arquitetura

**Meta:** repositório organizado, banco configurado e chamada básica ao Gemini validada.

| Dev | Tarefas |
|---|---|
| Dev 1 | Estrutura do monorepo, `.gitignore` e `.env.example`; `esquema.sql` e conexão SQLite; configuração de ambiente |
| Dev 2 | Definição dos estados do jogo |
| Dev 3 | Chamada de teste na API do Gemini |
| Dev 4 | Protótipo do canvas |
| Dev 5 | Tela estática do jogo |

## Sprint 2: Autenticação e personagens com imagem

**Meta:** cadastro e login funcionando com senha em hash; personagem criado com descrição visual e avatar gerado pela IA.

| Dev | Tarefas |
|---|---|
| Dev 1 | Registro e login (bcrypt + JWT), middleware de rotas privadas, CRUD de personagens com validação, endpoint `PATCH /api/personagens/:id/avatar` |
| Dev 3 | Geração do retrato a partir da descrição e do estilo padrão do grupo; salvar o resultado via endpoint do Dev 1 |
| Dev 5 | Telas de cadastro, login e criação de personagem |

## Sprint 3: Salas, mapas procedurais e tempo real

**Meta:** o 1º jogador cria a sala com o tema, o Gemini gera a história e a imagem do primeiro mapa, e 2 ou mais jogadores entram na mesma sala.

| Dev | Tarefas |
|---|---|
| Dev 1 | Rotas de salas (criar, listar, entrar, sair) e estado da partida; gravação de `mapas_cenarios` e `mensagens` |
| Dev 2 | Socket.IO autenticado com `verificarToken`; salas e broadcast em tempo real |
| Dev 3 | Geração do mundo (lore, objetivo, árvore de mapas) e da imagem do cenário |
| Dev 4 | Renderização do mapa atual |
| Dev 5 | Painel do cenário e lobby |

## Sprint 4: Ciclo de jogo, Mestre/NPCs e finalização

**Meta:** ações em texto, narração do Mestre e dos NPCs, regras validadas no servidor, entrega completa.

| Dev | Tarefas |
|---|---|
| Dev 1 | Persistência das ações e do histórico; revisão de segurança; documentação e pacote final (ZIP sem `node_modules` e sem `.env`) |
| Dev 2 | Turnos, D20, HP e inventário validados no servidor |
| Dev 3 | Narração a partir dos resultados dos dados; tratamento de rate limit (429) com aviso na interface |
| Dev 4 | Animações e polimento visual |
| Dev 5 | Chat, ficha com status, HUD final |
| Todos | Vídeo de demonstração, slides em PDF e testes de gameplay com dois navegadores |

## Dependências entre módulos

- **Dev 3 depende do Dev 1:** para salvar retratos e mapas, usa `PATCH /api/personagens/:id/avatar` e as tabelas `mapas_cenarios` e `mensagens`.
- **Dev 2 depende do Dev 1:** autentica o socket com `verificarToken` (`seguranca/tokens.js`) e lê salas e jogadores do banco.
- **Dev 5 depende do Dev 1:** todas as chamadas HTTP usam o token JWT e `GET /api/partida/:codigo/estado` para carregar a sala.
- **Dev 5 depende do Dev 4:** o HUD se sobrepõe ao canvas do mapa.
- **Regra geral:** o servidor decide vida, dados e inventário; a IA só narra o resultado.

## Critérios de pronto (cada sprint)

- Incremento rodando na `main` com `npm install` e `npm start`.
- Pull Request aprovado por pelo menos um colega, com `Closes #N`.
- Issues incompletas voltam ao backlog para serem replanejadas.