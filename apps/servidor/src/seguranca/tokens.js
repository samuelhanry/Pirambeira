import jwt from 'jsonwebtoken';
import { ambiente } from '../configuracoes/ambiente.js';

export function criarToken(usuario) {
  return jwt.sign({ sub: usuario.id, nome: usuario.nome_usuario }, ambiente.JWT_SECRET, {
    expiresIn: ambiente.JWT_EXPIRA_EM,
  });
}

/** Retorna { id, nome_usuario } ou null se inválido/expirado. Útil também para o handshake do Socket.IO. */
export function verificarToken(token) {
  try {
    const payload = jwt.verify(token, ambiente.JWT_SECRET);
    return { id: payload.sub, nome_usuario: payload.nome };
  } catch {
    return null;
  }
}
