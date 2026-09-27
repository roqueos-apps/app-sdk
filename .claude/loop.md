Rotina de manutenção de um app da roqueos-apps (ou do próprio `app-sdk`). Uma coisa por iteração, com a evidência no chat. Para na primeira que tiver trabalho.

1. **Gate vermelho.** `roqueos-gate` (o `yarn verificar`: lint, formato, testes e `app check`). Conserta e cola a saída.
2. **CI do GitHub vermelho.** `gh run list --limit 3`. Os workflows `verificar` e `dco` rodam em todo push e em PR de fork, sem segredo; vermelho lá e verde aqui é ambiente divergente, e se investiga antes de qualquer outra coisa.
3. **PR sem `Signed-off-by`.** O `dco` reprova. Quem contribui recebe o comando que conserta (`git rebase --signoff main`), não um "não pode".
4. **Issue ou PR de fora sem resposta.** `gh issue list` e `gh pr list`. Quem contribui espera resposta; uma linha de "vi, olho até sexta" já conta.
5. **Asset sem origem.** O `app check` lê o `ASSETS.md`. Arquivo novo em `public/` sem linha, com origem e licença, não entra.
6. **SDK atrás.** O `package.json` pina o `app-sdk` por tag. Tag nova no SDK com capacidade que o app usa vira bump, com o `yarn verificar` verde e o changelog dizendo o que mudou.
7. **Drift de docs.** README, CONTRIBUTING e `app.json` dizem a mesma coisa sobre o que o app faz, as capacidades que pede e os idiomas.

Mudança visível no app não fecha sem o app aberto de verdade (`yarn dev`, na janela falsa), com print antes de declarar pronto, e no RoqueOS quando a mudança chega lá. Nunca enfraquece teste para o gate passar.
