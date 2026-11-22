export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

/** Envolve handlers async do Express 4 para repassar erros ao middleware de erro. */
export const assincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
