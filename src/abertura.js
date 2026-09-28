// A CAPACIDADE `abertura`: o que quem abriu a janela mandou junto.
//
// O post-it da área de trabalho abre as Notas já na nota dele. Com a janela das
// Notas aberta, clicar em outro post-it não abre outra janela: o RoqueOS traz a
// mesma para a frente com o pedido novo. Por isso a abertura tem a forma de
// `idioma` e `identidade`, e não um valor lido uma vez no `montar`:
//
//   sistema.abertura.atual()        // { nota: 'note_123' }, ou {} se abriu vazio
//   sistema.abertura.aoMudar(fn)    // o pedido novo com a janela aberta; devolve parar()
//
// O conteúdo é um objeto simples, e o que cada chave quer dizer é do app: ele
// documenta no README o que aceita. O sistema entrega cópia, então o app não
// consegue mudar o pedido que outro ouvinte vai ler.
//
// Uma chave é do sistema (0.3.0): quando a pessoa usa o "abrir com" do Finder, o
// pedido chega como `{ arquivo: { ref, nome, tipo } }`, e o app lê o conteúdo com
// `sistema.arquivos.ler(ref)`. Só chega ao app que declara aquele tipo em `abre`
// no app.json, e a ref vale como qualquer outra: nesta sessão, só para este app.

import { conferirCampos } from './colecoes.js'

/**
 * Uma `abertura` que o sistema troca com `mudar`. Os três sistemas usam esta.
 * @param {object} [inicial]
 */
export function criarAbertura(inicial = {}) {
  let atual = conferirCampos(inicial ?? {})
  const ouvintes = new Set()
  return {
    abertura: Object.freeze({
      atual: () => JSON.parse(JSON.stringify(atual)),
      aoMudar(fn) {
        ouvintes.add(fn)
        return () => ouvintes.delete(fn)
      },
    }),
    mudar(novo) {
      atual = conferirCampos(novo ?? {})
      for (const fn of [...ouvintes]) fn(JSON.parse(JSON.stringify(atual)))
    },
    ouvintesVivos: () => ouvintes.size,
  }
}
