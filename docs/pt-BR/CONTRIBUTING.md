# Como contribuir

_[English](../../CONTRIBUTING.md) | Português_

> **Para quem:** quem quer mudar o SDK, de uma correção de digitação a uma capacidade nova.
> **O que tem aqui:** o caminho do fork ao PR, as regras que valem para todo mundo e o `Signed-off-by` do DCO.
> **Onde ir para o resto:** como acrescentar uma capacidade ou uma regra do `app check` está em [ESTENDER.md](ESTENDER.md); o que cada teste prova, em [TESTES.md](TESTES.md).

Obrigado por querer ajudar. Este repo é pequeno de propósito, e a régua é a mesma para todo mundo, inclusive para quem mantém.

1. Abra uma issue antes de mudar o contrato ([`src/contrato.js`](../../src/contrato.js)). Capacidade nova mexe no RoqueOS e em todos os apps, então a conversa vem antes do código.
2. Faça o fork, crie um branch a partir de `main` e rode `yarn install --ignore-scripts`.
3. Toda regra nova vem com um teste que reprova sem ela. Teste que passa com e sem a mudança não prova nada.
4. Rode `yarn verificar` antes de abrir o PR. É o mesmo que o CI roda.
5. Assine cada commit com `git commit -s` (veja o DCO abaixo).
6. Abra o PR explicando o porquê, não só o quê.

O código, os comentários e as mensagens de commit são em português do Brasil, que é o idioma canônico do projeto. Issue e PR em inglês são bem-vindos.

Nada de script que rode sozinho no install (`preinstall`, `postinstall`, `prepare`): o `app check` reprova, e o motivo está em [`src/verificacao.js`](../../src/verificacao.js).

## DCO: o `Signed-off-by` em cada commit

Este projeto usa o [Developer Certificate of Origin](https://developercertificate.org/) 1.1. Ao assinar o commit com `git commit -s`, você declara que escreveu a mudança (ou tem o direito de enviá-la) e que ela pode ser distribuída sob a licença do projeto, a MIT. O Git acrescenta a linha `Signed-off-by: Seu Nome <seu@email>` com o nome e o e-mail da sua configuração.

O workflow `dco` ([`.github/workflows/dco.yml`](../../.github/workflows/dco.yml)) confere todo commit do PR e reprova o que não tem a linha. Esqueceu? Rode `git rebase --signoff main` e empurre de novo.

## Conduta

Vale o [código de conduta](../../CODE_OF_CONDUCT.md): crítica ao código, nunca à pessoa. Para reportar, use o contato de [SECURITY.md](../../SECURITY.md).
