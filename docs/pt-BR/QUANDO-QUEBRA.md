# Quando quebra

_[English](../WHEN-IT-BREAKS.md) | Português_

> **Para quem:** quem está com o gate vermelho, um workflow vermelho ou um app que se recusa a montar, e quer a causa e o conserto sem ler o fonte.
> **O que tem aqui:** o primeiro comando de diagnóstico e, por área (instalar, o gate, o app check, montar e capacidades, publicar), uma tabela com o que aparece, a causa e o que fazer.
> **Onde ir para o resto:** o que quer dizer cada seção, campo e código está em [REFERENCIA.md](REFERENCIA.md); por que uma regra existe, em [ARQUITETURA.md](ARQUITETURA.md#8-decisões-de-design).

As mensagens são citadas exatamente como os programas imprimem, para você poder procurar por elas.

## Sumário

- [Primeiro, o diagnóstico](#primeiro-o-diagnóstico)
- [1. Instalar](#1-instalar)
- [2. O gate](#2-o-gate)
- [3. O app check](#3-o-app-check)
- [4. Montar e capacidades](#4-montar-e-capacidades)
- [5. Publicar](#5-publicar)

## Primeiro, o diagnóstico

```bash
yarn verificar
```

Ele para no primeiro passo que falha, e o nome do passo diz a área: `eslint`, `prettier --check`, `node --test` ou `app check`. Num repo de app, `node bin/app.mjs check <pasta> --json` dá os problemas de todas as seções num objeto só.

## 1. Instalar

| O que aparece                                                                                                | Causa                                                                                       | O que fazer                                                                                               |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `App do RoqueOS e o SDK de apps (JavaScript, yarn) usa yarn (yarn add, yarn dlx, yarn create), nao npm/npx.` | o gancho de gerenciador de pacotes do `roqueos-kit` lê `pkgManager: "yarn"` para esta stack | use `yarn` (`yarn install --ignore-scripts`, `yarn prettier`), nunca `npm` nem `npx`                      |
| o `yarn install` de um app falha ao buscar `github:roqueos-apps/app-sdk#vX.Y.Z`                              | a tag não existe, ou o GitHub não responde                                                  | confira a tag com `git ls-remote --tags https://github.com/roqueos-apps/app-sdk.git`; pine uma que existe |

## 2. O gate

| O que aparece                                                                                 | Causa                                                              | O que fazer                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[warn] Code style issues found in the above file. Run Prettier with --write to fix.`         | um arquivo, Markdown incluído, está fora do formato do Prettier    | `yarn format`, depois revise o diff                                                                                                                                                                         |
| `# fail 1` (ou mais) na saída do `node --test`                                                | um teste falhou; o nome acima diz qual                             | rode `yarn test` e leia a asserção que falhou; nunca enfraqueça o teste para passar                                                                                                                         |
| depois do `yarn test` numa worktree, `core.bare = true` no clone de verdade e um branch andou | o teste do `tag-na-main` herdava o `GIT_DIR` do gancho de pre-push | corrigido na 0.3.0 (28/09/2026): `semVariaveisDoRepo` tira os `GIT_*` quando o `cwd` é explícito ([`bin/tag-na-main.mjs`](../../bin/tag-na-main.mjs)); se voltar, falta esse `env` numa chamada nova ao git |
| CI vermelho no GitHub, verde aqui                                                             | ambiente diferente (o Node do `.nvmrc`, `--frozen-lockfile`)       | investigue antes de qualquer outra coisa ([`.claude/loop.md`](../../.claude/loop.md)); rode `yarn install --frozen-lockfile --ignore-scripts` aqui                                                          |

## 3. O app check

Cada linha abaixo é um exemplo literal; o arquivo, a linha e os nomes variam.

| O que aparece                                                                                                                         | Causa                                                                           | O que fazer                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `package.json declara "postinstall", que roda sozinho no install de quem depende deste pacote`                                        | um script de instalação                                                         | tire; rode o passo à mão ou no script de dev                                                        |
| `app.json: campo que o manifesto não conhece: maximizável`                                                                            | um campo desconhecido, aqui um erro de digitação com acento                     | use o campo de [REFERENCIA.md](REFERENCIA.md#5-o-manifesto-appjson) (`maximizavel`)                 |
| `i18n/de-DE.json sem: titulo, somar`                                                                                                  | chaves que o `pt-BR.json` tem faltando em outro idioma                          | acrescente as traduções; primeira parte precisa dos dez idiomas                                     |
| `public/novo.png sem linha no ASSETS.md (caminho \| licença \| origem)`                                                               | um arquivo de `public/` sem a linha dele                                        | acrescente a linha com uma licença aceita e a origem                                                |
| `src/index.js:26 importa "firebase/app": o app não fala com banco, quem guarda é o sistema`                                           | o app fala com o banco                                                          | use `colecoes`, `armazenamento` ou `anexos`                                                         |
| ``src/index.js:27 importa "src/stores/roqueos", que só existe dentro do RoqueOS: o que o app precisa do sistema vem pelo `sistema` `` | import de dentro do RoqueOS, que compila lá dentro e lê a store inteira         | pegue o que precisa do `sistema`; peça uma capacidade se nenhuma serve ([ESTENDER.md](ESTENDER.md)) |
| `src/estilo.css:6 usa --ros-text-70, que não está entre as variáveis do sistema que um app pode usar (...)`                           | uma variável do tema fora do contrato                                           | componha a partir de uma base (`rgba(var(--ros-text-rgb), .7)`) ou proponha a variável              |
| `src/index.js:28 usa sistema.colecoes sem "colecoes" em capacidades no app.json`                                                      | uma opcional usada sem estar declarada; montaria no `yarn dev` e quebraria fora | acrescente em `capacidades` (e os nomes em `colecoes`, se for `colecoes`)                           |
| `src/index.js:29 listar('Imagens') sem "Imagens" em pastas no app.json`                                                               | uma pasta listada sem estar declarada                                           | acrescente em `pastas`                                                                              |
| `uso: app check [pasta] [--sdk] [--json]`, saída 2                                                                                    | o comando não foi `check`                                                       | `node bin/app.mjs check [pasta]`                                                                    |

## 4. Montar e capacidades

| O que aparece                                                                                                         | Causa                                                                             | O que fazer                                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `[notas] o sistema não cumpre o contrato: o sistema fala o contrato 2, o app fala o 1; falta a capacidade "colecoes"` | o sistema fala outra versão do contrato ou não tem uma capacidade que o app exige | atualize o lado que está atrás: o SDK muda primeiro, o sistema do RoqueOS acompanha, os apps por último |
| `id de app inválido: "Notas" (minúsculas e dígitos, começando por letra)`                                             | o id quebra `^[a-z][a-z0-9]*$`                                                    | minúsculas e dígitos; o id é permanente, então decida uma vez                                           |
| `[x] montar precisa devolver { ativar, desmontar }`                                                                   | o `montar` do app não devolveu nada, ou não devolveu `desmontar`                  | devolva `{ ativar, desmontar }`                                                                         |
| `colecao-desconhecida`: `coleção "notas" não está no mapa deste app (nenhuma)`                                        | a coleção não está no mapa do sistema; no falso, não está em `colecoes`           | declare em `colecoes` no `app.json`; no teste passe `colecoes: ['notas']`                               |
| `sem-conta`: `a capacidade guarda na conta, e não há ninguém entrado`                                                 | um convidado tentou gravar                                                        | ofereça entrar; nunca finja que gravou                                                                  |
| `campo-do-sistema`: `"criadoEm" é do sistema: o id vai no primeiro argumento e as datas ele carimba`                  | o app mandou um carimbo ou o `id` entre os campos                                 | tire dos campos                                                                                         |
| `pasta-nao-declarada`: `o app não declarou "Imagens" em "pastas" no app.json (declarou: nenhuma)`                     | `listar` ou `abrirPasta` numa pasta não declarada                                 | declare em `pastas`; no teste passe `pastas: ['Imagens']`                                               |
| `ref-invalida`: `ref de outra sessão: ref não se guarda, liste a pasta de novo`                                       | uma ref guardada no armazenamento de outra sessão                                 | guarde o nome e liste a pasta de novo                                                                   |
| `grande-demais`: `o anexo tem 11534336 bytes, e o limite é 10485760`                                                  | um anexo acima de 10 MB                                                           | reduza antes do `guardar`                                                                               |
| `valor-invalido`: `abrirPainel: ancora: o elemento do app onde o painel aparece; tipo: um de text, code, read; ...`   | um pedido errado de `abrirPainel`; todos os problemas vêm listados                | conserte cada um da lista                                                                               |

## 5. Publicar

| O que aparece                                                                                                                                      | Causa                                                                                                                      | O que fazer                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| workflow `tag` vermelho: `<sha> não está na história de origin/main: tag de release só depois do merge (sem squash), no commit que entrou na main` | a tag aponta para um commit de branch; aconteceu com a v0.2.0 enquanto o commit dela estava só no PR #4 (setembro de 2026) | apague a tag e refaça no commit da `main`, antes de alguém pinar ([OPERACAO.md](OPERACAO.md#5-desfazer)) |
| `o git não achou <commit> ou origin/main: ...`, saída 2                                                                                            | o commit ou a ref da `main` não existe no clone                                                                            | no CI o checkout usa `fetch-depth: 0`; aqui, `git fetch origin`                                          |
| `dco` vermelho: `commit xxxxxxxx sem Signed-off-by. Refaça com: git commit --amend -s (ou git rebase --signoff)`                                   | um commit do pull request está sem `Signed-off-by`                                                                         | `git rebase --signoff main` e empurre de novo                                                            |
