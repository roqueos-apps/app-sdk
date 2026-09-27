# app-sdk

O contrato entre o RoqueOS e um app. Leia o README e `src/contrato.js` antes de mudar
qualquer coisa: mudar a forma de uma capacidade é versão nova do contrato e alcança o
`roqueos-front` e todos os apps da organização roqueos-apps (`roqueos-graph blast app-sdk`).

- Gate: `yarn verificar` (o mesmo do CI e do pre-push).
- Toda regra nova vem com teste que reprova sem ela, e mutante morto antes de dizer pronto.
- Capacidade nova nasce opcional, com motivo escrito, na onda do primeiro app que precisa.
- `src/variaveis.js` é contrato com o tema do front: tirar uma variável é quebra.
- Sem script de instalação no package.json; sem dependência de runtime.
- Todo commit com `Signed-off-by` (`git commit -s`): o workflow `dco` reprova sem.
- Português do Brasil no código e nos commits.
