# Testes

_[English](../TESTING.md) | Português_

> **Para quem:** quem muda o SDK e precisa saber que suíte prova o quê, e o que "pronto" quer dizer aqui.
> **O que tem aqui:** o critério de aceite, cada arquivo de teste com o que ele prova e quantos testes tem, os auxiliares de teste, e o que as suítes não cobrem.
> **Onde ir para o resto:** os comandos estão em [REFERENCIA.md](REFERENCIA.md#1-comandos-e-scripts); teste vermelho, em [QUANDO-QUEBRA.md](QUANDO-QUEBRA.md#2-o-gate).

## Sumário

1. [O critério de aceite](#1-o-critério-de-aceite)
2. [As suítes](#2-as-suítes)
3. [Auxiliares e fixture](#3-auxiliares-e-fixture)
4. [O que as suítes não cobrem](#4-o-que-as-suítes-não-cobrem)

## 1. O critério de aceite

Uma mudança está pronta quando o `yarn verificar` sai 0 na máquina e o workflow `verificar` está verde no PR ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)). Além disso, pelo [CLAUDE.md](../../CLAUDE.md) e pelo [CONTRIBUTING.md](CONTRIBUTING.md): toda regra nova vem com um teste que reprova sem ela, e o mutante morre antes de dizer pronto (quebre a regra de propósito, veja o teste ficar vermelho, desfaça). Teste nunca se enfraquece para o gate passar ([`.claude/loop.md`](../../.claude/loop.md)).

```bash
yarn verificar   # lint, formato, testes, app check
yarn test        # só os testes
```

Os testes usam só `node:test` e `node:assert`, sem dependência de framework de teste.

## 2. As suítes

Contagens medidas em 18/11/2026 contando as chamadas `test(` por arquivo: 133 testes no total, o mesmo número que o `yarn test` deu naquele dia.

| Arquivo                                                                  | Testes | O que prova                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`test/contrato.test.js`](../../test/contrato.test.js)                   | 9      | a lista travada das seis obrigatórias e das seis opcionais, toda capacidade tem motivo, o `verificarSistema` devolve todos os problemas, recusa outra versão do contrato e forma errada                                                                    |
| [`test/definir-app.test.js`](../../test/definir-app.test.js)             | 9      | o `definirApp` recusa id ruim ou `montar` ausente na hora; o `mount` passa os padrões, recusa sistema incompleto antes de montar, `desmontar` duas vezes solta uma                                                                                         |
| [`test/manifesto.test.js`](../../test/manifesto.test.js)                 | 12     | o `validarManifesto`: campos desconhecidos, id, versão, camada, idiomas por camada, ícone, cor, categoria, janela, capacidades, autor e licença                                                                                                            |
| [`test/verificacao.test.js`](../../test/verificacao.test.js)             | 14     | o fixture passa em toda seção do `app check`; cada regra reprova o que diz; comentário não conta                                                                                                                                                           |
| [`test/opcionais.test.js`](../../test/opcionais.test.js)                 | 33     | `colecoes` (carimbos, atualizar por campo, troca de conta, nada de gravar fingido), `ia` (um painel por janela, ações do app), `arquivos.salvar`, `abertura`, título do aviso, as opcionais do sistema de desenvolvimento, o campo `colecoes` do manifesto |
| [`test/arquivos-e-janela.test.js`](../../test/arquivos-e-janela.test.js) | 25     | pastas e filtros de tipo, o sistema da 0.2.0 recusado para o `arquivos` da 0.3.0, o cofre de refs, listar só pasta declarada, o "abrir com", `colecoes.ler`, a tela cheia, `pastas` e `abre` no manifesto e no `app check`                                 |
| [`test/anexos.test.js`](../../test/anexos.test.js)                       | 11     | o id de anexo e o teto de tamanho, a persistência entre sessões, o isolamento por app e conta, `sem-conta`, o sistema de desenvolvimento                                                                                                                   |
| [`test/hosts.test.js`](../../test/hosts.test.js)                         | 14     | o espaço de chaves do armazenamento e a falha dele, o registro do sistema falso, o sistema de desenvolvimento (localStorage, modo privado, idioma da URL, modo leve), a janela falsa                                                                       |
| [`test/idiomas.test.js`](../../test/idiomas.test.js)                     | 2      | os dez idiomas na ordem da casa, e o `normalizarIdioma`                                                                                                                                                                                                    |
| [`test/tag-na-main.test.js`](../../test/tag-na-main.test.js)             | 4      | commit da `main` passa, commit só do PR reprova, o squash é o caso que reprova, o `GIT_DIR` de um gancho não escolhe o repositório, commit que não existe é erro de uso                                                                                    |

## 3. Auxiliares e fixture

| Caminho                                                        | O que é                                                                                                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`test/fixtures/app-ok/`](../../test/fixtures/app-ok/app.json) | um app válido completo (um contador sem Vue): `app.json`, dez arquivos de `i18n`, `public/icone.svg` com a linha no `ASSETS.md`, `package.json` sem script de instalação |
| [`test/janela-falsa.js`](../../test/janela-falsa.js)           | uma janela de navegador e um DOM de brinquedo com só o que a janela falsa usa; `storageQuebrado` imita o modo privado do Safari                                          |

## 4. O que as suítes não cobrem

- **O sistema do RoqueOS.** Ele mora no `roqueos-front` e é testado lá ([INTEGRACOES.md](INTEGRACOES.md#3-um-sistema-o-roqueos)).
- **Um navegador de verdade.** O sistema de desenvolvimento é testado contra o DOM de brinquedo, sem renderizar; esta documentação não conferiu a janela falsa num navegador.
- **Teste de mutação como ferramenta.** Matar o mutante é um passo manual do critério; não há ferramenta de mutação no gate.
- **Cobertura.** Nenhum número de cobertura é medido.
