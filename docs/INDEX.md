# app-sdk documentation

_English | [Português](pt-BR/INDEX.md)_

The contract between RoqueOS and an app: what an app receives, how it is checked, and how it runs on its own. Every document below has a pair in Brazilian Portuguese under [`docs/pt-BR/`](pt-BR/INDEX.md).

Where to start depends on what you want.

| I want to...                                           | Read                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **Get the gate green and an app mounted**              | [GETTING-STARTED.md](GETTING-STARTED.md): from clone to the first app test              |
| **See how it is built inside**                         | [ARCHITECTURE.md](ARCHITECTURE.md): context, components, flows, data, decisions, limits |
| **Look up an export, capability, error code or field** | [REFERENCE.md](REFERENCE.md)                                                            |
| **Cut a release or change the contract safely**        | [OPERATIONS.md](OPERATIONS.md): routine, release, versioning, undo, monitor             |
| **Understand a failure**                               | [WHEN-IT-BREAKS.md](WHEN-IT-BREAKS.md): symptom, cause, what to do                      |
| **Find a term**                                        | [GLOSSARY.md](GLOSSARY.md)                                                              |
| **Add a capability or an app check rule**              | [EXTENDING.md](EXTENDING.md)                                                            |
| **Connect an app, a system or a harness**              | [INTEGRATIONS.md](INTEGRATIONS.md)                                                      |
| **Know what is protected and what is not**             | [THREAT-MODEL.md](THREAT-MODEL.md)                                                      |
| **Know what each test proves**                         | [TESTING.md](TESTING.md)                                                                |
| **Contribute**                                         | [../CONTRIBUTING.md](../CONTRIBUTING.md)                                                |
| **Report a vulnerability**                             | [../SECURITY.md](../SECURITY.md)                                                        |
| **See what changed**                                   | [../CHANGELOG.md](../CHANGELOG.md)                                                      |

## Diagrams

| Diagram                                | Source                                               | Explained in                                                                               |
| -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| context: the three systems and the app | Mermaid in ARCHITECTURE.md                           | [ARCHITECTURE.md, section 2](ARCHITECTURE.md#2-context-who-uses-it-and-what-it-depends-on) |
| mounting an app                        | Mermaid in ARCHITECTURE.md                           | [ARCHITECTURE.md, section 5.1](ARCHITECTURE.md#51-mounting-an-app)                         |
| the app check in an app repository     | Mermaid in ARCHITECTURE.md                           | [ARCHITECTURE.md, section 5.2](ARCHITECTURE.md#52-the-app-check-in-an-app-repository)      |
| "open with" from the Finder            | Mermaid in ARCHITECTURE.md                           | [ARCHITECTURE.md, section 5.3](ARCHITECTURE.md#53-open-with-from-the-finder)               |
| cutting a release                      | Mermaid in ARCHITECTURE.md                           | [ARCHITECTURE.md, section 5.4](ARCHITECTURE.md#54-cutting-a-release)                       |
| the README picture                     | [`contrato.svg`](contrato.svg), static, no generator | [ARCHITECTURE.md, section 9](ARCHITECTURE.md#9-known-limits)                               |
