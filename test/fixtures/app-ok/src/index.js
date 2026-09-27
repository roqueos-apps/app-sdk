// O app de teste do SDK: um contador sem Vue, para o teste rodar no Node puro.
import { definirApp } from '../../../../src/index.js'

export default definirApp({
  id: 'contador',
  montar(el, sistema) {
    let n = Number(sistema.armazenamento.ler('n') ?? 0)
    const desenhar = () => {
      el.textContent = `${n}`
    }
    desenhar()
    const pararIdioma = sistema.idioma.aoMudar(desenhar)
    return {
      somar() {
        n += 1
        sistema.armazenamento.gravar('n', n)
        desenhar()
      },
      desmontar() {
        pararIdioma()
      },
    }
  },
})
