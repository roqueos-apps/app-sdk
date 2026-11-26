# Modelo de ameaças

_[English](../THREAT-MODEL.md) | Português_

> **Para quem:** quem revisa uma capacidade, uma regra do `app check` ou um PR de app pensando em segurança, e quem quer saber o que o SDK promete antes de confiar nele.
> **O que tem aqui:** o que se protege, de quem, o mecanismo de cada proteção, e o que não se protege.
> **Onde ir para o resto:** como reportar uma vulnerabilidade está em [SECURITY.md](../../SECURITY.md); as decisões por trás de cada mecanismo, em [ARQUITETURA.md](ARQUITETURA.md#8-decisões-de-design).

## Sumário

1. [O que se protege](#1-o-que-se-protege)
2. [De quem](#2-de-quem)
3. [Os mecanismos](#3-os-mecanismos)
4. [O que não se protege](#4-o-que-não-se-protege)

## 1. O que se protege

| Bem                                          | Por que importa                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| a máquina de quem builda o RoqueOS ou um app | todo app é instalado como dependência; código que roda no install roda lá                     |
| os dados da conta da pessoa                  | coleções, anexos e Arquivos são da pessoa, em todo aparelho                                   |
| as chaves dos agentes de IA                  | são da pessoa e nunca podem chegar a um app                                                   |
| o tema e a área de trabalho do RoqueOS       | o app de primeira parte divide o documento; uma declaração `--ros-*` errada repinta o desktop |
| o pin da família                             | todo consumidor pina uma tag; tag fora da `main` pina todo mundo num commit órfão             |

## 2. De quem

| Adversário ou falha                              | Exemplo                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| um app de primeira parte com defeito ou descuido | importa uma store do RoqueOS, lê uma pasta que não declarou, guarda uma ref no armazenamento |
| uma contribuição de fora                         | um PR de fork que acrescenta um script de instalação ou um import do Firebase                |
| um app de comunidade futuro (ainda não existe)   | código de terceiro num iframe em outra origem, onde o contrato vai ser a fronteira           |
| um pacote da cadeia de suprimento                | uma dependência que roda código no install                                                   |
| um PR de fork no CI                              | código tentando alcançar um token ou um segredo                                              |

## 3. Os mecanismos

| Proteção                                                             | Mecanismo                                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| nenhum código roda no install                                        | o `app check` reprova `preinstall`, `install`, `postinstall`, `prepare`, `prepack`, `postpack` ([`src/verificacao.js`](../../src/verificacao.js)); a casa instala com `--ignore-scripts`; o SDK não tem dependência de runtime |
| o app não fala com o banco                                           | o `app check` reprova `firebase`, `firebase/*`, `@firebase/*` no `src/`                                                                                                                                                        |
| o app não alcança o que é de dentro do RoqueOS                       | o `app check` reprova o `quasar` e os apelidos do RoqueOS no JS, no `.vue` e no estilo; o RoqueOS roda o mesmo check nos apps que ainda moram nele                                                                             |
| o app não repinta o tema                                             | só as `--ros-*` da lista podem ser lidas, nenhuma declarada ([`src/variaveis.js`](../../src/variaveis.js))                                                                                                                     |
| o app só lê as pastas que declarou                                   | `listar` e `abrirPasta` rejeitam com `pasta-nao-declarada`; o `app check` pega os nomes literais ([`src/arquivos.js`](../../src/arquivos.js))                                                                                  |
| o app nunca vê onde os arquivos moram, nem guarda ponteiro para eles | as refs são aleatórias, levam a sessão e só resolvem no cofre que as emitiu (`ref-invalida`)                                                                                                                                   |
| anexo não vaza como link                                             | anexo se alcança pelo id `anx_` passando pelo sistema, que confere app e conta a cada leitura; nunca há URL ([`src/anexos.js`](../../src/anexos.js))                                                                           |
| as chaves dos agentes ficam com o sistema                            | a `ia` só recebe uma âncora, um tipo, uma função de conteúdo e callbacks; o painel é do sistema ([`src/ia.js`](../../src/ia.js))                                                                                               |
| gravar sem conta não finge que deu certo                             | `sem-conta` em vez de um no-op calado ([`src/erros.js`](../../src/erros.js))                                                                                                                                                   |
| PR de fork não recebe segredo                                        | `verificar` e `dco` rodam em `pull_request`, nunca em `pull_request_target`, com `contents: read` ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml))                                                               |
| tag de release não aponta para fora da `main` sem ninguém ver        | o workflow `tag` e o [`bin/tag-na-main.mjs`](../../bin/tag-na-main.mjs)                                                                                                                                                        |
| todo merge é revisado                                                | o `CODEOWNERS` ([`.github/CODEOWNERS`](../../.github/CODEOWNERS)); o RoqueOS pina o SHA exato no lockfile ([SECURITY.md](../../SECURITY.md))                                                                                   |

## 4. O que não se protege

- **Código de primeira parte na mesma origem lê o que a página lê.** As capacidades organizam o código; ali elas não são fronteira de segurança ([`src/contrato.js`](../../src/contrato.js), [SECURITY.md](../../SECURITY.md)). A proteção da primeira parte é a revisão e o pin exato.
- **A camada de comunidade ainda não existe.** Até existir, não há caixa de areia para app de terceiro, e este documento não diz nada sobre o que ela vai garantir.
- **O `app check` é textual.** Import montado em tempo de execução, nome de pasta numa variável, ou opcional alcançada por uma variável que não se chama `sistema` escapam do check; as recusas em runtime continuam valendo onde existem (pastas, refs, coleções).
- **Anexo esquecido não é recolhido.** Os bytes ficam na conta depois que o app para de usá-los (risco aceito na 0.3.0, [`src/anexos.js`](../../src/anexos.js)).
- **O sistema de desenvolvimento não é blindado.** Ele roda no navegador de quem desenvolve, com uma conta local e o `localStorage`; não foi feito para guardar dado de verdade.
