import { CLASSES_DO_PERSONAGEM } from '../../../../packages/compartilhado/src/tipos.js';
import { ErroHttp } from './http.js';

const CLASSES = Object.values(CLASSES_DO_PERSONAGEM);
const PONTOS_MAXIMOS = 20; // soma de força + destreza + inteligência

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

export function validarNomeUsuario(valor) {
  const nome = texto(valor);
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(nome)) {
    throw new ErroHttp(400, 'Usuário deve ter 3 a 20 caracteres (letras, números ou _).');
  }
  return nome;
}

export function validarSenha(valor) {
  if (typeof valor !== 'string' || valor.length < 8 || valor.length > 72) {
    throw new ErroHttp(400, 'A senha deve ter entre 8 e 72 caracteres.');
  }
  return valor;
}

export function validarPersonagem(corpo = {}) {
  const nome = texto(corpo.nome);
  const classe = texto(corpo.classe).toLowerCase();
  const descricao_visual = texto(corpo.descricao_visual);
  const atributos = {
    forca: Number(corpo.forca ?? 5),
    destreza: Number(corpo.destreza ?? 5),
    inteligencia: Number(corpo.inteligencia ?? 5),
  };

  if (nome.length < 2 || nome.length > 30) throw new ErroHttp(400, 'Nome do personagem: 2 a 30 caracteres.');
  if (!CLASSES.includes(classe)) throw new ErroHttp(400, `Classe inválida. Use: ${CLASSES.join(', ')}.`);
  if (descricao_visual.length < 10 || descricao_visual.length > 500) {
    throw new ErroHttp(400, 'A descrição visual deve ter de 10 a 500 caracteres.');
  }
  for (const [chave, valor] of Object.entries(atributos)) {
    if (!Number.isInteger(valor) || valor < 1 || valor > 10) {
      throw new ErroHttp(400, `Atributo "${chave}" deve ser inteiro de 1 a 10.`);
    }
  }
  const soma = atributos.forca + atributos.destreza + atributos.inteligencia;
  if (soma > PONTOS_MAXIMOS) throw new ErroHttp(400, `Soma dos atributos não pode passar de ${PONTOS_MAXIMOS}.`);

  return { nome, classe, descricao_visual, ...atributos };
}

export function validarSala(corpo = {}) {
  const nome = texto(corpo.nome);
  const tema = texto(corpo.tema);
  if (nome.length < 3 || nome.length > 60) throw new ErroHttp(400, 'Nome da sala: 3 a 60 caracteres.');
  if (tema.length < 10 || tema.length > 500) throw new ErroHttp(400, 'Tema da aventura: 10 a 500 caracteres.');
  return { nome, tema };
}
