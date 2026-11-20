import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env fica na raiz do monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const producao = process.env.NODE_ENV === 'production';

if (producao && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET é obrigatório em produção.');
}
if (!process.env.JWT_SECRET) {
  console.warn('[ambiente] JWT_SECRET ausente: usando segredo de DESENVOLVIMENTO.');
}

export const ambiente = {
  producao,
  PORTA: Number(process.env.PORTA) || 3000,
  URL_CLIENTE: process.env.URL_CLIENTE || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'segredo-apenas-para-desenvolvimento',
  JWT_EXPIRA_EM: process.env.JWT_EXPIRA_EM || '8h',
  DB_ARQUIVO: process.env.DB_ARQUIVO || 'data/pirambeira.db',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};
