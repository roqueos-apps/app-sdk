// Uma janela de navegador mínima para os testes do sistema de desenvolvimento,
// com um DOM de brinquedo que só sabe o que a janela falsa usa: criar elemento,
// pendurar filho, classe, estilo, atributo e evento. `storageQuebrado` imita o
// Safari em modo privado, que lança no getItem.

function elemento(tag) {
  const ouvintes = {}
  const classes = new Set()
  const el = {
    tagName: tag.toUpperCase(),
    filhos: [],
    style: {},
    atributos: {},
    textContent: '',
    value: '',
    className: '',
    classList: {
      add: (c) => classes.add(c),
      contains: (c) => classes.has(c) || el.className.split(' ').includes(c),
    },
    appendChild(filho) {
      el.filhos.push(filho)
      return filho
    },
    append(...filhos) {
      el.filhos.push(...filhos)
    },
    setAttribute(k, v) {
      el.atributos[k] = String(v)
    },
    addEventListener: (ev, fn) => (ouvintes[ev] ??= []).push(fn),
    emitir(ev) {
      for (const fn of ouvintes[ev] ?? []) fn({ target: el })
    },
  }
  return el
}

export function janelaFalsa({
  language = 'pt-BR',
  storageQuebrado = false,
  dados = new Map(),
  href = 'http://localhost:5173/',
} = {}) {
  const ouvintes = {}
  const quebra = () => {
    throw new Error('SecurityError')
  }
  const storage = storageQuebrado
    ? { getItem: quebra, setItem: quebra, removeItem: quebra }
    : {
        getItem: (k) => (dados.has(k) ? dados.get(k) : null),
        setItem: (k, v) => dados.set(k, String(v)),
        removeItem: (k) => dados.delete(k),
      }
  const document = {
    head: elemento('head'),
    body: elemento('body'),
    documentElement: { lang: '', dir: '' },
    createElement: elemento,
  }
  return {
    dados,
    document,
    navigator: { language },
    location: { href },
    localStorage: storage,
    addEventListener: (ev, fn) => (ouvintes[ev] ??= []).push(fn),
    emitir(ev, evento) {
      for (const fn of ouvintes[ev] ?? []) fn(evento)
    },
  }
}
