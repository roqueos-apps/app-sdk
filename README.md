# app-sdk

O contrato entre o [RoqueOS](https://roqueos.com.br) e um app. Um app exporta
`mount(el, sistema)`; o `sistema` entrega capacidades (quem está usando, em que idioma, onde
guardar o que é do app, como avisar alguma coisa na tela) e é só por elas que o app fala com o
RoqueOS. O mesmo app roda dentro do RoqueOS, sozinho no navegador e no teste, sem saber em
qual dos três está.

_English below._

## Por que existe

Os apps do RoqueOS (Calculadora, Notas, QR Code, Música e outros, 32 ao todo) nasceram dentro do
repositório do sistema, que é fechado, e importavam as stores dele direto. A partir de
27/09/2026 eles começam a sair, cada um para um repo próprio na organização
[roqueos-apps](https://github.com/roqueos-apps), abertos sob MIT. Este SDK é o que torna isso
possível: o app depende dele, e não do RoqueOS. É o irmão do
[`jogo-sdk`](https://github.com/roqueos-games/jogo-sdk), que fez o mesmo com os jogos: mesma
forma, mesmas regras, capacidades de app em vez de capacidades de jogo.

## Arquitetura

```mermaid
flowchart LR
  subgraph quem[Quem monta o app]
    R[Sistema do RoqueOS<br/>conta, avisos, analytics]
    D[Sistema de desenvolvimento<br/>navegador puro, janela falsa]
    F[Sistema falso<br/>memória, para teste]
  end
  C{{verificarSistema<br/>contrato v1}}
  A[App<br/>definirApp + mount]
  R --> C
  D --> C
  F --> C
  C -->|capacidades| A
  M[app.json] -->|app check| K[CI do repo do app]
  A -.-> M
```

- `definirApp({ id, capacidades, montar })` cria o app. `mount` confere o sistema antes de
  montar e recusa, com a lista do que falta, o sistema que não cumpre o contrato.
- `montar(el, sistema, { windowId, ativo })` recebe o elemento onde o app vive e cria **o
  próprio app Vue** (ou o que for) dentro dele. Nenhuma store, nenhum plugin e nenhum estilo
  global do RoqueOS chega lá dentro. Devolve `{ ativar(ativo), desmontar() }`.
- `verificarSistema(sistema)` diz o que falta: capacidade ausente, forma errada, versão de
  contrato diferente. Todos os problemas de uma vez.
- `validarManifesto(appJson)` confere o `app.json`.
- `app check` confere um repo de app inteiro (a lista está em [Regras](#regras)).

### As capacidades do contrato v1

Estão em [`src/contrato.js`](src/contrato.js), cada uma com o motivo de existir. O motivo é
parte do contrato: capacidade sem motivo vira atalho para o app alcançar o que não devia.

| Capacidade      | Forma                                      | Para quê                                                                            |
| --------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `identidade`    | `atual()`, `aoMudar(fn)`                   | `{ uid, nome }`, ou `{ uid: null, nome: null }` para convidado                      |
| `avisar`        | `avisar(mensagem, { tipo, fixo, titulo })` | o que a pessoa precisa ler; `fixo: true` fica até ela fechar; `titulo` desde 0.2.0  |
| `idioma`        | `atual()`, `aoMudar(fn)`                   | um dos dez idiomas; a troca chega com a janela aberta                               |
| `desempenho`    | `modoLeve()`                               | o aparelho pede o perfil leve: sem efeito que segue o sensor, sem animação contínua |
| `metricas`      | `evento(nome, dados)`                      | uso, com nomes de evento que não mudam sem motivo                                   |
| `armazenamento` | `ler`, `gravar`, `apagar`                  | texto no espaço `roqueos:<app>:<chave>`, no aparelho                                |

As seis vêm do `jogo-sdk`, que as prova em vinte jogos. Capacidade nova nasce **opcional**, na
onda do primeiro app que precisa dela, com motivo escrito. Mudar a forma de uma que existe é
versão nova do contrato, e o sistema recusa o app que pede outra versão em vez de quebrar em
runtime.

#### As opcionais (0.2.0, nascidas com as Notas)

O app lista em `capacidades` no `app.json` as que usa; o `mount` recusa o sistema que não as
tem, e o `app check` reprova o app que usa uma sem listar. Quando uma falha, ela rejeita com
`ErroDoSistema`, que tem um `codigo` (`sem-conta`, `colecao-desconhecida`,
`campo-do-sistema`, `pasta-invalida`...; a lista está em [`src/erros.js`](src/erros.js)): nunca
finge que deu certo.

| Capacidade | Forma                                                        | Para quê                                                                                                 |
| ---------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `colecoes` | `abrir(nome)` → `observar`, `criar`, `atualizar`, `apagar`   | documentos na conta da pessoa, em tempo real e em todo aparelho ([`src/colecoes.js`](src/colecoes.js))   |
| `ia`       | `abrirPainel({ ancora, tipo, contexto, aplicar, aoFechar })` | o painel de IA do sistema sobre o conteúdo do app; a chave nunca chega ao app ([`src/ia.js`](src/ia.js)) |
| `arquivos` | `salvar({ nome, conteudo, tipo, pasta })`                    | guardar um arquivo nos Arquivos da pessoa, numa pasta da lista ([`src/arquivos.js`](src/arquivos.js))    |
| `abertura` | `atual()`, `aoMudar(fn)`                                     | o que quem abriu a janela mandou, e o pedido novo com ela aberta ([`src/abertura.js`](src/abertura.js))  |

Em `colecoes`, as datas são do sistema: cada documento chega com `criadoEm` e `atualizadoEm` em
milissegundos, e o app que tenta gravar uma delas recebe `campo-do-sistema`. `atualizar` troca
só os campos enviados, para dois donos escreverem no mesmo documento sem um apagar o do outro
(a nota das Notas é o post-it da área de trabalho). A lista observada segue a conta: entrar e
sair troca o que o app vê sem ele refazer nada, e sem conta gravar rejeita com `sem-conta`. O
app diz no `app.json` os nomes das coleções que abre (`"colecoes": ["notas"]`); o RoqueOS
confere no build que cada uma está no mapa dele, e coleção fora do mapa não abre.

### O manifesto `app.json`

```json
{
  "id": "calculator",
  "versaoDoContrato": 1,
  "camada": "primeira-parte",
  "nome": { "pt-BR": "Calculadora", "en-US": "Calculator", "...": "os dez idiomas" },
  "descricao": { "pt-BR": "Calculadora científica", "...": "os dez idiomas" },
  "icone": "calculate",
  "cor": "#ff9500",
  "categoria": "productivity",
  "janela": {
    "largura": 380,
    "altura": 680,
    "minLargura": 300,
    "minAltura": 540,
    "maximizavel": false
  },
  "capacidades": [],
  "autor": "Roque Ribeiro",
  "licenca": "MIT"
}
```

O `id` é **permanente**: é a chave da janela, do dock e do armazenamento de quem já usa o app.
`camada` é `primeira-parte` (nosso, na mesma origem, com os dez idiomas) ou `comunidade`
(qualquer pessoa, num iframe em outra origem, com pt-BR e en-US obrigatórios). `icone` é o
nome de um Material Icon ou um SVG do repo. `capacidades` lista as opcionais que o app usa, e
`colecoes`, os nomes das coleções que ele abre (obrigatório quando `capacidades` tem
`colecoes`). Campo que o manifesto não conhece reprova, para um erro de digitação não ser
ignorado em silêncio.

### As variáveis CSS do sistema

Um app de primeira parte está no mesmo documento do RoqueOS e enxerga as custom properties
do tema. Usar uma delas é dependência de verdade que nenhum grafo de build vê, então ela vira
contrato: [`src/variaveis.js`](src/variaveis.js) lista as que um app pode usar
(`--ros-white-rgb`, `--ros-black-rgb`, `--ros-border-dim`, `--ros-text-100`, `--ros-shadow-30`
e `--ros-shadow-50`), o `app check` reprova qualquer
outra, e o RoqueOS tem um teste que reprova se alguma delas sumir do tema. O prefixo `--ros-`
é do sistema: a variável do app usa outro (`--calc-fundo`).

## Regras

O `app check` confere, e reprova sem "aviso":

- **Sem script de instalação** (`preinstall`, `postinstall`, `prepare`...): o RoqueOS instala o
  app como dependência, e o script rodaria na máquina de quem builda.
- **`app.json` válido**, com o ícone SVG existindo no repo.
- **Textos em `i18n/<idioma>.json`**: os dez para primeira parte, pt-BR e en-US para
  comunidade, todos com as mesmas chaves do pt-BR e nenhuma vazia.
- **Cada arquivo de `public/` com linha no `ASSETS.md`**: caminho, licença (CC0-1.0,
  CC-BY-4.0, MIT, BSD-3-Clause ou autoral) e origem.
- **O app não fala com banco**: nada de `firebase` em `src/`. Quem guarda é o sistema.
- **O app não importa o RoqueOS**: nem os apelidos de dentro do sistema (`src/`, `stores/`,
  `boot/`...), nem o Quasar, no JavaScript, no `.vue` e no SCSS. No repo do app esse import
  quebra; dentro do RoqueOS ele compilaria e leria a store inteira calado, e é por isso que o
  RoqueOS roda o mesmo check nos apps que ainda moram nele.
- **Só as variáveis `--ros-*` do contrato**, e nenhuma declarada pelo app.
- **Opcional usada é opcional declarada**: `sistema.colecoes`, `sistema?.ia`,
  `sistema['arquivos']` ou `{ abertura } = sistema` no `src/` sem o nome em `capacidades` no
  `app.json` reprova. Sem isso o app monta no `yarn dev`, que tem todas, e quebra com
  `undefined` no sistema que não tem aquela, em vez da recusa com motivo do `mount`.

## Pré-requisitos

- Node 22 ou mais novo (o `.nvmrc` diz 24).
- Yarn 1 (`packageManager` no `package.json`).

## Como rodar

```bash
yarn install --ignore-scripts
yarn verificar        # lint, formato, testes e app check, o mesmo do CI e do pre-push
yarn test             # só os testes (node:test, sem dependência)
node bin/app.mjs check caminho/do/app   # o app check num repo de app
```

Num repo de app, o SDK entra como dependência git pinada por tag, sem registro de pacote:

```json
{ "dependencies": { "@roqueos-apps/app-sdk": "github:roqueos-apps/app-sdk#v0.2.0" } }
```

e o `yarn dev` monta o app na janela falsa:

```js
import { montarNaJanelaFalsa } from '@roqueos-apps/app-sdk/sistema-de-desenvolvimento'
import manifesto from '../app.json'
import app from '../src/index.js'

montarNaJanelaFalsa(app, { manifesto })
```

A janela tem o tamanho do `app.json`, o nome no idioma atual e um seletor dos dez idiomas. O
árabe vira da direita para a esquerda, como no RoqueOS, e `?idioma=ja-JP` na URL abre direto
em outro idioma, e `?leve=1` mostra o app como o aparelho fraco vê. Na janela falsa a pessoa
está entrada numa conta local, e a coleção fica no `localStorage` do app, para continuar depois
do F5; `?convidado=1` mostra o app como o convidado vê, e `?abertura={"nota":"n1"}` abre como
se outro pedaço do sistema tivesse pedido. O painel de IA, que é do RoqueOS, aparece como um
aviso no lugar onde ele abriria, e salvar em Arquivos vira download.

No teste, `criarSistemaFalso()` devolve o `sistema` e o que o app fez (`registro.avisos`,
`registro.eventos`, `registro.arquivos`, `registro.paineis`), e mexe no mundo em volta como o
RoqueOS mexe: `mudarIdioma`, `mudarIdentidade`, `mudarAbertura`, `colecoes.semear` e
`colecoes.guardado`, e `ia.aplicar`/`ia.fechar` para a pessoa usar o painel de IA.

## Estrutura

```text
src/
  contrato.js       as capacidades, com forma e motivo, e verificarSistema
  index.js          definirApp e o que o pacote exporta
  manifesto.js      validarManifesto, categorias e camadas
  variaveis.js      as variáveis CSS do sistema que um app pode usar
  verificacao.js    o que o app check confere
  idiomas.js        os dez idiomas e normalizarIdioma
  e2e.js            emModoE2E e estadoE2E, para o harness de teste de ponta a ponta
  erros.js          ErroDoSistema e os códigos que uma capacidade devolve
  colecoes.js       a semântica de colecoes: carimbos, campos simples, id de documento
  ia.js             o pedido de abrirPainel
  arquivos.js       o pedido de salvar e as pastas que o app pode usar
  abertura.js       criarAbertura, a abertura que os três sistemas usam
  host/
    armazenamento.js  o espaço roqueos:<app>:<chave>
    colecoes-em-memoria.js  colecoes em memória, para o falso e o de desenvolvimento
    desenvolvimento.js  o sistema com o navegador puro, e a janela falsa
    falso.js          o sistema em memória, para teste
bin/app.mjs         o app check
test/               node:test, com um app de exemplo em fixtures/app-ok
```

## Onde ele se encaixa na família

O RoqueOS (`roqueos-front`, fechado) implementa o sistema de primeira parte por cima das
stores dele e instala cada app como dependência git pinada por tag. O app nunca vê o
RoqueOS; o RoqueOS nunca importa de dentro do app além do `mount`. A ordem de mudança entre
os lados está no grafo do `roqueos-kit` (`roqueos-graph blast`): o SDK muda primeiro, o
sistema do RoqueOS acompanha, os apps sobem de versão por último.

## Contribuir

Leia o [CONTRIBUTING.md](CONTRIBUTING.md). Todo commit leva `Signed-off-by` (DCO), e o CI
confere. Falha de segurança vai pelo [SECURITY.md](SECURITY.md), nunca por issue pública.

## Licença

[MIT](LICENSE). O nome e a marca RoqueOS são da LEVELHARD e não fazem parte da licença.

---

## English

`app-sdk` is the contract between [RoqueOS](https://roqueos.com.br), a desktop operating
system that runs in the browser, and an app. An app exports `mount(el, system)`: the system
hands it capabilities, and the app talks to RoqueOS only through them. The same app runs
inside RoqueOS, on its own in the browser, and in tests, without knowing which one it is in.

RoqueOS apps are leaving the closed core repository for their own open repositories under the
[roqueos-apps](https://github.com/roqueos-apps) organization, and this SDK is what they depend
on instead of RoqueOS. It is the sibling of `jogo-sdk`, which did the same for games.

- `definirApp({ id, capacidades, montar })` defines an app; `mount` verifies the system first
  and refuses one that breaks the contract, listing every problem.
- `montar(el, sistema, { windowId, ativo })` creates the app's own Vue app inside `el` and
  returns `{ ativar, desmontar }`. No RoqueOS store, plugin or global style reaches inside.
- Contract v1 has six capabilities, taken from `jogo-sdk`, which proves them in twenty games:
  `identidade`, `avisar`, `idioma`, `desempenho`, `metricas` and `armazenamento`. New
  capabilities are born optional, with a written reason, in the wave of the first app that
  needs them. Version 0.2.0 adds four, born with the Notes app: `colecoes` (real-time
  documents in the user's account; the system stamps `criadoEm`/`atualizadoEm` and
  `atualizar` replaces only the fields sent), `ia` (the system's single AI panel opened inside
  an app element; agent keys never reach the app), `arquivos` (save a file into the user's
  Files, in an allow-listed folder, never overwriting) and `abertura` (what the opener sent,
  and new requests while the window is open). A failing capability rejects with an
  `ErroDoSistema` carrying a `codigo`; it never pretends to succeed.
- `app.json` declares the permanent `id`, name and description in the ten languages (first
  party) or in pt-BR and en-US (community), icon, colour, category, window size, layer,
  author and licence. Unknown fields fail.
- `app check` fails on install scripts, an invalid manifest, missing or empty translations,
  assets without licence and origin in `ASSETS.md`, Firebase imports, imports of RoqueOS
  internals (`src/`, `stores/`, Quasar) in JavaScript, `.vue` or SCSS, `--ros-*` CSS
  variables outside the contract list, and optional capabilities used in `src/` but not listed
  in `capacidades`.

Run `yarn install --ignore-scripts` and `yarn verificar`; CI runs the same command. An app
repository depends on the SDK as a git dependency pinned by tag
(`"@roqueos-apps/app-sdk": "github:roqueos-apps/app-sdk#v0.2.0"`), with no package registry. In
an app repository, `montarNaJanelaFalsa(app, { manifesto })` from
`@roqueos-apps/app-sdk/sistema-de-desenvolvimento` mounts the app in a fake RoqueOS window with
a language picker, including right-to-left Arabic.

Code, comments and commits are in Brazilian Portuguese, the canonical language of the project;
English issues and pull requests are welcome. Every commit must be signed off (DCO). Licensed
under [MIT](LICENSE); the RoqueOS name and brand belong to LEVELHARD and are not covered.
