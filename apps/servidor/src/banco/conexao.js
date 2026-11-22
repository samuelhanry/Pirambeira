import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ambiente } from '../configuracoes/ambiente.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_SERVIDOR = path.resolve(__dirname, '../..'); // apps/servidor
const caminhoBanco = path.resolve(RAIZ_SERVIDOR, ambiente.DB_ARQUIVO);

fs.mkdirSync(path.dirname(caminhoBanco), { recursive: true });
const db = new sqlite3.Database(caminhoBanco);

export const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (erro) {
      if (erro) return reject(erro);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

export const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (erro, linha) => (erro ? reject(erro) : resolve(linha))));

export const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (erro, linhas) => (erro ? reject(erro) : resolve(linhas))));

const exec = (sql) =>
  new Promise((resolve, reject) => db.exec(sql, (erro) => (erro ? reject(erro) : resolve())));

/** Ativa FKs e aplica o esquema.sql (idempotente). Chamar uma vez no boot. */
export async function iniciarBanco() {
  await run('PRAGMA foreign_keys = ON');
  await exec(fs.readFileSync(path.join(__dirname, 'esquema.sql'), 'utf8'));
  console.log(`[banco] SQLite pronto em ${caminhoBanco}`);
}
