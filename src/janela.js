// A CAPACIDADE `janela`: o que o app pede à janela onde ele mora.
//
//   const ligada = await sistema.janela.telaCheia(true)   // o estado depois do pedido
//   sistema.janela.emTelaCheia()                          // true ou false
//   const parar = sistema.janela.aoMudarTelaCheia((ligada) => ...)
//
// Por que o sistema, e não o `requestFullscreen` do próprio app: no RoqueOS a
// tela cheia de verdade é feita por CSS no <html> (o iOS mente sobre 100vh e não
// tem a API nativa fora de vídeo), e escrever no <html> é o que um app não pode
// fazer, porque a classe vaza para os apps seguintes. O sistema faz num lugar só,
// tira a mesa e a doca da frente, e desfaz sozinho quando a janela fecha.
//
// A pessoa sai da tela cheia por conta própria (Esc, o gesto do aparelho, a
// barra do navegador). O app fica sabendo por `aoMudarTelaCheia` e não deve supor
// que ela continua ligada. O pedido pode ser recusado (o navegador exige um gesto
// da pessoa para a API nativa): a promessa resolve com o estado real, e não com o
// pedido.
//
// Nasceu na 0.3.0, com os visualizadores e o Letreiro.

/**
 * O estado da tela cheia de uma janela, igual nos três sistemas. `aplicar(ligar)`
 * é o que cada sistema faz de verdade e resolve com o estado que conseguiu.
 * @param {{ aplicar?: (ligar: boolean) => Promise<boolean> | boolean }} [opcoes]
 */
export function criarTelaCheia({ aplicar = async (ligar) => ligar } = {}) {
  let ligada = false
  const ouvintes = new Set()
  const mudar = (nova) => {
    const valor = Boolean(nova)
    if (valor === ligada) return
    ligada = valor
    for (const fn of [...ouvintes]) fn(ligada)
  }
  return {
    janela: Object.freeze({
      async telaCheia(ligar) {
        if (typeof ligar !== 'boolean') throw new TypeError('telaCheia(true) ou telaCheia(false)')
        mudar(await aplicar(ligar))
        return ligada
      },
      emTelaCheia: () => ligada,
      aoMudarTelaCheia(fn) {
        if (typeof fn !== 'function') throw new TypeError('aoMudarTelaCheia(fn)')
        ouvintes.add(fn)
        return () => ouvintes.delete(fn)
      },
    }),
    /** O sistema muda por fora: a pessoa apertou Esc, ou a janela fechou. */
    mudar,
    ouvintesVivos: () => ouvintes.size,
  }
}
