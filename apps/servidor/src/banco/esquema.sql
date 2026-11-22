PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_usuario  TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash    TEXT NOT NULL,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS personagens (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  classe            TEXT NOT NULL CHECK (classe IN ('guerreiro','mago','ladino')),
  forca             INTEGER NOT NULL DEFAULT 5,
  destreza          INTEGER NOT NULL DEFAULT 5,
  inteligencia      INTEGER NOT NULL DEFAULT 5,
  hp_max            INTEGER NOT NULL DEFAULT 20,
  hp_atual          INTEGER NOT NULL DEFAULT 20,
  nivel             INTEGER NOT NULL DEFAULT 1,
  descricao_visual  TEXT NOT NULL,
  avatar_url        TEXT,
  inventario_json   TEXT NOT NULL DEFAULT '[{"id":"pocao-1","nome":"Poção de Cura Menor","tipo":"consumivel","efeitoHp":8,"quantidade":2}]',
  criado_em         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS salas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo     TEXT NOT NULL UNIQUE,
  nome       TEXT NOT NULL,
  tema       TEXT NOT NULL,
  host_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','em_andamento','encerrada')),
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sala_jogadores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  sala_id        INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  personagem_id  INTEGER NOT NULL REFERENCES personagens(id) ON DELETE CASCADE,
  entrou_em      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (sala_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS mapas_cenarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  sala_id        INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  ordem          INTEGER NOT NULL,
  nome           TEXT NOT NULL,
  descricao      TEXT,
  prompt_imagem  TEXT,
  imagem_url     TEXT,
  atual          INTEGER NOT NULL DEFAULT 0,
  UNIQUE (sala_id, ordem)
);

CREATE TABLE IF NOT EXISTS mensagens (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  sala_id        INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  usuario_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  personagem_id  INTEGER REFERENCES personagens(id) ON DELETE SET NULL,
  autor_tipo     TEXT NOT NULL CHECK (autor_tipo IN ('jogador','mestre','npc','sistema')),
  conteudo       TEXT NOT NULL,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_personagens_usuario ON personagens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_sala ON mensagens(sala_id, id);
CREATE INDEX IF NOT EXISTS idx_sala_jogadores_sala ON sala_jogadores(sala_id);