import bcrypt from 'bcryptjs';

const RODADAS = 10;

export const gerarHash = (senha) => bcrypt.hash(senha, RODADAS);
export const conferirSenha = (senha, hash) => bcrypt.compare(senha, hash);
