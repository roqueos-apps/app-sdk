# Segurança

## Como reportar

Não abra issue pública para falha de segurança. Use o
[relatório privado de vulnerabilidade](https://github.com/roqueos-apps/app-sdk/security/advisories/new)
do GitHub. A resposta vem em até sete dias.

## O que este SDK promete, e o que não promete

Um app de **primeira parte** roda na mesma origem do RoqueOS. O SDK entrega capacidades em
vez das stores do sistema, e isso organiza o código, mas **não é uma fronteira de
segurança**: código na mesma origem consegue ler o que a página lê. O que protege quem usa o
RoqueOS é:

- todo merge nos repos da organização passa pela revisão do mantenedor (`CODEOWNERS`);
- o RoqueOS instala cada app por uma versão exata, com o SHA travado no lockfile, e toda troca
  de versão é revisada antes de entrar;
- nenhum repo de app pode ter script que rode sozinho no install, importar o Firebase ou
  importar arquivo de dentro do RoqueOS: o `app check` reprova;
- o CI de pull request não lê segredo nenhum.

Um app de **comunidade** vai rodar num iframe em outra origem, sem `allow-same-origin`, e aí
sim o contrato é a fronteira. Essa camada ainda não existe; quando existir, este documento
descreve o que ela garante.

---

## Security (English)

Do not open public issues for vulnerabilities; use GitHub's private vulnerability reporting.
First-party apps run on the same origin as RoqueOS: the capability boundary organizes code
but is not a security boundary. Protection comes from maintainer review on every merge, exact
version pins in RoqueOS, the `app check` rules (no install scripts, no Firebase, no imports of
RoqueOS internals) and secret-free CI. Community apps will run in a cross-origin sandboxed
iframe, where the contract becomes the boundary; that layer does not exist yet.
