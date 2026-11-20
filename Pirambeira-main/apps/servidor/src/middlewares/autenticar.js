import { verificarToken } from '../seguranca/tokens.js';
import { ErroHttp } from '../utilitarios/http.js';

export function autenticar(req, _res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');
  const usuario = tipo === 'Bearer' && token ? verificarToken(token) : null;
  if (!usuario) return next(new ErroHttp(401, 'Não autenticado. Faça login novamente.'));
  req.usuario = usuario; // { id, nome_usuario }
  next();
}
