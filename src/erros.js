// O ERRO QUE UMA CAPACIDADE DEVOLVE.
//
// Capacidade que falha devolve um erro com `codigo`, e não só uma mensagem: o
// app decide o que fazer pelo código ("sem-conta" oferece entrar, "sem-rede"
// espera), e a mensagem é para quem lê o console. Um no-op silencioso (gravar
// sem conta e fingir que deu certo) é pior que o erro: a pessoa escreve uma nota
// inteira que nunca existiu.

/** Os códigos que um sistema pode devolver, e o que cada um quer dizer. */
export const CODIGOS_DE_ERRO = Object.freeze({
  'sem-conta': 'a capacidade guarda na conta, e não há ninguém entrado',
  'sem-permissao': 'o sistema recusou (a sessão acabou, ou a regra do banco não deixa)',
  'sem-rede': 'o sistema precisa da rede para isso, e ela não está lá',
  'colecao-desconhecida': 'a coleção não está no mapa do sistema para este app',
  'campo-do-sistema': 'o app mandou um campo que é o sistema quem grava (os carimbos de data)',
  'id-invalido': 'o id do documento está fora do formato',
  'valor-invalido': 'o valor não é um dado simples (texto, número, sim/não, lista, objeto)',
  'pasta-invalida': 'a pasta não está entre as que o sistema deixa o app gravar',
  'pasta-nao-declarada': 'o app lê ou mostra uma pasta que não declarou em "pastas" no app.json',
  'ref-invalida':
    'a referência de arquivo não veio deste sistema nesta sessão (fabricada, de outro app, ou guardada de ontem)',
  'nao-encontrado': 'o arquivo ou o documento não existe mais',
  indisponivel: 'o sistema não oferece isso aqui (fora do RoqueOS, por exemplo)',
})

export class ErroDoSistema extends Error {
  /**
   * @param {keyof typeof CODIGOS_DE_ERRO} codigo
   * @param {string} [mensagem]
   */
  constructor(codigo, mensagem) {
    if (!(codigo in CODIGOS_DE_ERRO)) throw new TypeError(`código de erro desconhecido: ${codigo}`)
    super(mensagem ?? CODIGOS_DE_ERRO[codigo])
    this.name = 'ErroDoSistema'
    this.codigo = codigo
  }
}
