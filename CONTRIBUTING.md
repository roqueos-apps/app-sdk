# How to contribute

_English | [Português](docs/pt-BR/CONTRIBUTING.md)_

> **Who it is for:** anyone who wants to change the SDK, from a typo fix to a new capability.
> **What is here:** the path from fork to pull request, the rules that hold for everyone, and the DCO sign-off.
> **Where to go for the rest:** how to add a capability or an `app check` rule is in [docs/EXTENDING.md](docs/EXTENDING.md); what each test proves, in [docs/TESTING.md](docs/TESTING.md).

Thank you for wanting to help. This repository is small on purpose, and the bar is the same for everyone, maintainers included.

1. Open an issue before changing the contract ([`src/contrato.js`](src/contrato.js)). A new capability touches RoqueOS and every app, so the conversation comes before the code.
2. Fork, create a branch from `main` and run `yarn install --ignore-scripts`.
3. Every new rule comes with a test that fails without it. A test that passes with and without the change proves nothing.
4. Run `yarn verificar` before opening the pull request. It is what CI runs.
5. Sign off every commit with `git commit -s` (see DCO below).
6. Open the pull request explaining the why, not only the what.

Code, comments and commit messages are in Brazilian Portuguese, the canonical language of the project. English issues and pull requests are welcome.

No script that runs by itself on install (`preinstall`, `postinstall`, `prepare`): the `app check` fails it, and the reason is in [`src/verificacao.js`](src/verificacao.js).

## DCO: the `Signed-off-by` on every commit

This project uses the [Developer Certificate of Origin](https://developercertificate.org/) 1.1. By signing off the commit with `git commit -s`, you state that you wrote the change (or have the right to submit it) and that it can be distributed under the project's licence, MIT. Git adds the line `Signed-off-by: Your Name <your@email>` with the name and email from your configuration.

The `dco` workflow ([`.github/workflows/dco.yml`](.github/workflows/dco.yml)) checks every commit of the pull request and fails the one without the line. Forgot? Run `git rebase --signoff main` and push again.

## Conduct

The [code of conduct](CODE_OF_CONDUCT.md) applies: critique the code, never the person. To report, use the contact in [SECURITY.md](SECURITY.md).
