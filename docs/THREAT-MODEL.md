# Threat model

_English | [Português](pt-BR/MODELO-DE-AMEACAS.md)_

> **Who it is for:** whoever reviews a capability, an `app check` rule or an app pull request with security in mind, and whoever wants to know what the SDK promises before trusting it.
> **What is here:** what is protected, from whom, the mechanism behind each protection, and what is not protected.
> **Where to go for the rest:** how to report a vulnerability is in [SECURITY.md](../SECURITY.md); the decisions behind each mechanism, in [ARCHITECTURE.md](ARCHITECTURE.md#8-design-decisions).

## Contents

1. [What is protected](#1-what-is-protected)
2. [From whom](#2-from-whom)
3. [The mechanisms](#3-the-mechanisms)
4. [What is not protected](#4-what-is-not-protected)

## 1. What is protected

| Asset                                           | Why it matters                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| the machine of whoever builds RoqueOS or an app | every app is installed as a dependency; code that runs at install time runs there         |
| the person's account data                       | collections, attachments and Files belong to the person, across devices                   |
| the keys of the AI agents                       | they are the person's and must never reach an app                                         |
| the RoqueOS theme and desktop                   | a first-party app shares the document; a wrong `--ros-*` declaration repaints the desktop |
| the family's pin                                | every consumer pins a tag; a tag outside `main` pins everyone to an orphan commit         |

## 2. From whom

| Adversary or failure                   | Example                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| a buggy or careless first-party app    | it imports a RoqueOS store, reads a folder it did not declare, keeps a ref in storage |
| a contribution from outside            | a pull request from a fork adding an install script or a Firebase import              |
| a future community app (not built yet) | third-party code in a cross-origin iframe, where the contract will be the boundary    |
| a supply-chain package                 | a dependency that runs code at install                                                |
| a fork pull request in CI              | code trying to reach a token or a secret                                              |

## 3. The mechanisms

| Protection                                                        | Mechanism                                                                                                                                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no code runs at install                                           | `app check` fails `preinstall`, `install`, `postinstall`, `prepare`, `prepack`, `postpack` ([`src/verificacao.js`](../src/verificacao.js)); the house installs with `--ignore-scripts`; the SDK has no runtime dependency |
| the app does not talk to the database                             | `app check` fails `firebase`, `firebase/*`, `@firebase/*` in `src/`                                                                                                                                                       |
| the app does not reach RoqueOS internals                          | `app check` fails `quasar` and the RoqueOS aliases in JS, `.vue` and style; RoqueOS runs the same check on apps still inside it                                                                                           |
| the app does not repaint the theme                                | only the listed `--ros-*` may be read, none declared ([`src/variaveis.js`](../src/variaveis.js))                                                                                                                          |
| the app reads only the folders it declared                        | `listar` and `abrirPasta` reject with `pasta-nao-declarada`; `app check` catches literal names ([`src/arquivos.js`](../src/arquivos.js))                                                                                  |
| the app never sees where files live, and keeps no pointer to them | refs are random, carry the session, and resolve only in the vault that issued them (`ref-invalida`)                                                                                                                       |
| attachments cannot leak as links                                  | attachments are reached by `anx_` id through the system, which checks app and account each read; there is never a URL ([`src/anexos.js`](../src/anexos.js))                                                               |
| the agent keys stay with the system                               | `ia` only receives an anchor, a type, a content function and callbacks; the panel is the system's ([`src/ia.js`](../src/ia.js))                                                                                           |
| writes without an account do not pretend to succeed               | `sem-conta` instead of a silent no-op ([`src/erros.js`](../src/erros.js))                                                                                                                                                 |
| a fork pull request gets no secret                                | `verificar` and `dco` run on `pull_request`, never `pull_request_target`, with `contents: read` ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml))                                                               |
| a release tag cannot point outside `main` unnoticed               | the `tag` workflow and [`bin/tag-na-main.mjs`](../bin/tag-na-main.mjs)                                                                                                                                                    |
| every merge is reviewed                                           | `CODEOWNERS` ([`.github/CODEOWNERS`](../.github/CODEOWNERS)); RoqueOS pins the exact SHA in its lockfile ([SECURITY.md](../SECURITY.md))                                                                                  |

## 4. What is not protected

- **First-party code on the same origin can read what the page reads.** The capabilities organize code; they are not a security boundary there ([`src/contrato.js`](../src/contrato.js), [SECURITY.md](../SECURITY.md)). Protection for first party is review and the exact pin.
- **The community layer does not exist yet.** Until it does, there is no third-party app sandbox, and this document says nothing about what it will guarantee.
- **The `app check` is textual.** An import built at runtime, a folder name in a variable, or an optional reached through a variable not called `sistema` is not caught by the check; the runtime refusals still apply where they exist (folders, refs, collections).
- **Forgotten attachments are not collected.** Bytes stay in the account after the app stops using them (accepted risk in 0.3.0, [`src/anexos.js`](../src/anexos.js)).
- **The development system is not hardened.** It runs in the developer's browser with a local account and `localStorage`; it is not meant to hold real data.
