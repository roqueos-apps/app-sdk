// AS VARIÁVEIS CSS DO SISTEMA QUE UM APP PODE USAR.
//
// Um app de primeira parte roda no mesmo documento do RoqueOS, então enxerga as
// custom properties do `:root` do sistema (`var(--ros-...)`). Isso é dependência
// de verdade, só que invisível: `var()` não é import, e nenhum grafo de build a
// vê. Se o RoqueOS renomeia uma variável, o app perde a cor em silêncio; se o
// app copia o valor para não depender, ele deixa de acompanhar o tema claro e
// escuro.
//
// Então a dependência vira contrato, com os dois lados travados:
//   - aqui, o `app check` reprova `var(--ros-...)` fora desta lista no código e
//     no estilo do app;
//   - no RoqueOS, um teste reprova quando alguma destas deixa de existir no
//     `:root` do tema.
//
// A lista nasce com o que tem uso (as três da Calculadora) e cresce com o kit
// de interface. Variável nova aqui é mudança menor; tirar uma é quebra.
//
// O prefixo `--ros-` é do sistema. A variável que é do app usa outro prefixo
// (`--calc-fundo`), e o `app check` reprova o app que declara `--ros-*`: no mesmo
// documento, uma declaração no lugar errado repinta o desktop inteiro.

export const VARIAVEIS_DO_SISTEMA = Object.freeze([
  // Componentes de cor em "r, g, b", para `rgba(var(--ros-white-rgb), .4)`: o alpha
  // continua do app, a cor é do sistema.
  '--ros-white-rgb',
  '--ros-black-rgb',
  // A borda discreta do tema, que já leva o alpha e muda com o tema claro.
  '--ros-border-dim',
])
