# Arquitetura do Pirambeira

RPG de texto multiplayer cooperativo em tempo real, em que o Gemini atua como Mestre do Jogo e interpreta os NPCs. O servidor manda nas regras (vida, dados, inventário); a IA apenas narra o resultado.

## Visão geral

```text
Navegador (HTML/CSS/JS + p5.js)
   │  HTTP (login, personagens, salas, estado)
   │  WebSocket / Socket.IO (ações e narração em tempo real)
   ▼
Servidor Node.js + Express
   ├── Rotas + validação + autenticação (JWT)
   ├── Regras do jogo (turnos, HP, D20)
   ├── Serviço de IA ──► Gemini / geração de imagens
   ▼
Banco SQLite
```

## Estrutura do repositório

| Pasta | Conteúdo |
|---|---|
| `apps/servidor` | Back-end: Express, Socket.IO, banco, regras e integração com IA |
| `apps/web` | Front-end: interface, HUD, chat e renderização do mapa (p5.js) |
| `packages/compartilhado` | Constantes e tipos usados por back-end e front-end |
| `docs` | Documentação do projeto |

### Organização do back-end (`apps/servidor/src`)

| Pasta | Responsabilidade |
|---|---|
| `configuracoes` | Leitura das variáveis de ambiente (`.env`) |
| `banco` | Conexão SQLite, funções `run/get/all` e `esquema.sql` |
| `seguranca` | Hash de senha (bcrypt) e criação/validação do JWT |
| `middlewares` | `autenticar`: bloqueia rotas privadas sem token válido |
| `rotas` | Endpoints HTTP: autenticação, personagens, salas e partida |
| `utilitarios` | Validadores de entrada e tratamento de erros HTTP |
| `websocket`, `regras`, `servicos` | Tempo real, motor de regras, combate e inventário |
| `ia` | Integração com Gemini, prompts e mestre/NPCs |

Cada camada só conversa com a vizinha: rotas validam e chamam o banco; a IA e as regras ficam isoladas em serviços próprios.

## Comunicação entre as partes

- **HTTP:** cadastro, login, ficha de personagem, criação e entrada em salas, e o estado atual da partida (usado ao entrar ou reconectar).
- **WebSocket:** ações dos jogadores, narração do Mestre e atualização de mapas e fichas para todos da sala. O socket é autenticado com o mesmo JWT, usando `verificarToken`.
- **IA:** a chave do Gemini fica somente no back-end (`.env`). O navegador nunca a vê.

## Autenticação e segurança

- Senhas guardadas com **bcrypt** (hash com salt); nunca em texto puro.
- Login devolve um **JWT** (expiração configurável em `JWT_EXPIRA_EM`).
- Rotas de personagens, salas e partida exigem o cabeçalho `Authorization: Bearer <token>`; sem ele, resposta `401`.
- Cada jogador só enxerga e altera os próprios personagens.
- Mensagens de login não revelam se o usuário existe.
- Segredos ficam no `.env`, que não vai para o Git nem para o zip. O `.env.example` lista os nomes das variáveis.

## API HTTP

| Método e rota | Auth | Descrição |
|---|---|---|
| `GET /api/saude` | não | Verifica se o servidor está no ar |
| `POST /api/auth/registro` | não | Cria usuário e devolve token |
| `POST /api/auth/login` | não | Autentica e devolve token |
| `GET /api/auth/eu` | sim | Devolve o usuário do token |
| `GET /api/personagens` | sim | Lista os personagens do usuário |
| `POST /api/personagens` | sim | Cria personagem (nome, classe, atributos, descrição visual) |
| `GET /api/personagens/:id` | sim | Ficha do personagem |
| `PUT /api/personagens/:id` | sim | Edita a ficha |
| `PATCH /api/personagens/:id/avatar` | sim | Vincula o retrato gerado pela IA |
| `DELETE /api/personagens/:id` | sim | Remove o personagem |
| `POST /api/salas` | sim | Cria sala (nome e tema); o criador vira host |
| `GET /api/salas` | sim | Lista salas abertas |
| `POST /api/salas/entrar` | sim | Entra numa sala por código com um personagem |
| `GET /api/salas/:codigo` | sim | Dados da sala e jogadores |
| `DELETE /api/salas/:codigo/sair` | sim | Sai da sala |
| `GET /api/partida/:codigo/estado` | sim | Snapshot: sala, jogadores, mapa atual, últimas mensagens |

Erros seguem o formato `{ "erro": "mensagem" }`.

## Banco de dados (SQLite, chaves estrangeiras ativas)

```text
usuarios ──< personagens
usuarios ──< salas (host)
salas ──< sala_jogadores >── personagens
salas ──< mapas_cenarios
salas ──< mensagens
```

| Tabela | Campos principais |
|---|---|
| `usuarios` | `id`, `nome_usuario` (único), `senha_hash` |
| `personagens` | `usuario_id`, `nome`, `classe`, `forca`, `destreza`, `inteligencia`, `hp_max`, `hp_atual`, `nivel`, `descricao_visual`, `avatar_url` |
| `salas` | `codigo` (único), `nome`, `tema`, `host_id`, `status` (`lobby`, `em_andamento`, `encerrada`) |
| `sala_jogadores` | `sala_id`, `usuario_id`, `personagem_id` (um jogador por sala) |
| `mapas_cenarios` | `sala_id`, `ordem`, `nome`, `descricao`, `prompt_imagem`, `imagem_url`, `atual` |
| `mensagens` | `sala_id`, `usuario_id`, `personagem_id`, `autor_tipo` (`jogador`, `mestre`, `npc`, `sistema`), `conteudo` |

As tabelas são criadas automaticamente na primeira execução (`esquema.sql`).

## Regras de validação

- Usuário: 3 a 20 caracteres (letras, números e `_`). Senha: 8 a 72 caracteres.
- Personagem: classe `guerreiro`, `mago` ou `ladino`; atributos de 1 a 10 com soma máxima de 20; descrição visual de 10 a 500 caracteres.
- Sala: nome de 3 a 60 caracteres e tema de 10 a 500; máximo de 6 jogadores.

## Como executar

```bash
npm install
cp .env.example .env   # preencha JWT_SECRET (e GEMINI_API_KEY quando a IA for integrada)
npm start
```

O servidor sobe em `http://localhost:3000`.

## Processo de desenvolvimento

Cada módulo tem um dono (ver `roadmap-semanal.md`). O trabalho segue Scrum com sprints de 1 semana, branches por issue (`feature/N-nome`) e entrada na `main` somente por Pull Request aprovado.