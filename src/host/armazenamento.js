// O espaço de chaves de um app: roqueos:<app>:<chave>.
//
// É o formato que os apps e os jogos já usavam no localStorage do RoqueOS. O
// sistema do RoqueOS e o de desenvolvimento usam o mesmo formato, então tirar
// um app do núcleo não apaga o que ninguém tinha.

export const chaveDoApp = (appId, chave) => `roqueos:${appId}:${chave}`

/** Um Storage em memória, para quando o navegador não deixa usar o de verdade. */
export function armazenamentoEmMemoria() {
  const dados = new Map()
  return {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem(k, v) {
      dados.set(k, String(v))
    },
    removeItem(k) {
      dados.delete(k)
    },
    key: (i) => [...dados.keys()][i] ?? null,
    get length() {
      return dados.size
    },
  }
}

/**
 * A capacidade `armazenamento` sobre qualquer Storage. Janela anônima, modo
 * privado do Safari e cota estourada lançam exceção no getItem/setItem; o app
 * não pode morrer por isso, então a falha vira null na leitura e false na
 * escrita.
 */
export function armazenamentoDoApp(appId, storage) {
  return {
    ler(chave) {
      try {
        return storage.getItem(chaveDoApp(appId, chave))
      } catch {
        return null
      }
    },
    gravar(chave, valor) {
      try {
        storage.setItem(chaveDoApp(appId, chave), String(valor))
        return true
      } catch {
        return false
      }
    },
    apagar(chave) {
      try {
        storage.removeItem(chaveDoApp(appId, chave))
        return true
      } catch {
        return false
      }
    },
  }
}

/** O localStorage, se o navegador deixar usar; null no modo privado e no iframe sem permissão. */
export function storageDoNavegador(janela = globalThis) {
  try {
    const s = janela.localStorage
    if (!s) return null
    s.getItem('roqueos:teste')
    return s
  } catch {
    return null
  }
}
