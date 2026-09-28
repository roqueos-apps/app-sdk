// A CAPACIDADE `arquivos`: o app entrega um arquivo e o sistema guarda nos
// Arquivos da pessoa (o Finder), sem o app saber onde nem como.
//
//   const { nome, pasta } = await sistema.arquivos.salvar({
//     nome: 'lista.md', conteudo: texto, tipo: 'text/markdown', pasta: 'Documentos',
//   })
//
// - `pasta` é uma das `PASTAS_DE_ARQUIVOS`, e não um caminho livre: o app não
//   escolhe gravar em qualquer lugar da conta, e a lista cresce com o primeiro app
//   que precisa de outra (Imagens, Músicas).
// - Salvar de novo com o mesmo nome guarda outro arquivo com o mesmo nome; nada é
//   sobrescrito. É o que o Finder do RoqueOS já faz com o que chega nele.
// - Sem conta, rejeita com `sem-conta`. Abrir arquivo, o seletor do Finder e o
//   "abrir com" nascem com o primeiro app que abre arquivo.

import { ErroDoSistema } from './erros.js'

export const PASTAS_DE_ARQUIVOS = Object.freeze(['Documentos'])

const NOME_DE_ARQUIVO = /^[^/\\\0]{1,200}$/

/**
 * Confere o pedido de `salvar` e devolve os valores com o padrão aplicado.
 * @param {{ nome?: unknown, conteudo?: unknown, tipo?: unknown, pasta?: unknown }} pedido
 */
export function conferirArquivo({
  nome,
  conteudo,
  tipo = 'text/plain',
  pasta = 'Documentos',
} = {}) {
  if (typeof nome !== 'string' || !NOME_DE_ARQUIVO.test(nome) || !nome.trim()) {
    throw new ErroDoSistema(
      'valor-invalido',
      `nome de arquivo ${JSON.stringify(nome)}: sem barra, até 200`,
    )
  }
  const ehBlob = typeof Blob !== 'undefined' && conteudo instanceof Blob
  if (typeof conteudo !== 'string' && !ehBlob) {
    throw new ErroDoSistema('valor-invalido', 'conteudo é texto ou Blob')
  }
  if (typeof tipo !== 'string' || !/^[\w.+-]+\/[\w.+-]+$/.test(tipo)) {
    throw new ErroDoSistema(
      'valor-invalido',
      `tipo ${JSON.stringify(tipo)}: um MIME como text/markdown`,
    )
  }
  if (!PASTAS_DE_ARQUIVOS.includes(pasta)) {
    throw new ErroDoSistema(
      'pasta-invalida',
      `pasta ${JSON.stringify(pasta)}: uma de ${PASTAS_DE_ARQUIVOS.join(', ')}`,
    )
  }
  return { nome: nome.trim(), conteudo, tipo, pasta }
}
