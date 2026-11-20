# OpenIpWorld — IPAW / IPWALLET

**Portal SaaS onde o cliente da Apex acompanha os ativos de propriedade intelectual dele** — marcas,
patentes e desenhos industriais, no Brasil e no exterior — com o ciclo de vida de cada um, os prazos
que dele decorrem, os documentos, o histórico do que foi contratado, e a comunicação oficial sobre
tudo isso.

Substitui dois fornecedores pagos: o **APOL** (cadastro de titulares e processos, cartas de despacho)
e o **WEBSEEK** (base de marcas) — **R$ 2.765,73/mês, R$ 33.188,76/ano**, 25,06% do gasto anual de
software da casa. E vai além: agente de colidências por jurisdição, explicação técnica de cada
despacho e, mais tarde, renovação e anuidade direto no painel.

---

## Ordem de leitura

| # | arquivo | para quê |
|---|---|---|
| 1 | **[`PLANO.md`](PLANO.md)** | o produto: o que é, os 4 sprints com definição de pronto, as entidades, os riscos, o que falta decidir |
| 2 | **[`CONTRATO-DADOS.md`](CONTRATO-DADOS.md)** | **o documento mais importante.** O formato que o upload manual, o parser da RPI e a API produzem — o mesmo |
| 3 | **[`CLAUDE.md`](CLAUDE.md)** | as regras de código e de fronteira, cada uma com o incidente da casa que a justifica |
| 4 | **[`PERGUNTAS-ABERTAS.md`](PERGUNTAS-ABERTAS.md)** | o que ninguém decidiu ainda, com dono marcado |
| 5 | **[`ONBOARDING-BRENO.md`](ONBOARDING-BRENO.md)** | para o desenvolvedor: as 11 coisas que mudam como ele desenha a base, e o que se exige dele |
| 6 | **[`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)** | **o estado vivo**: onde estamos hoje, as 12 decisões travadas, o que bloqueia e de quem é |
| 7 | **[`SKILLS.md`](SKILLS.md)** | as lições, cada uma com o incidente que a gerou. Leia antes de mexer na projeção ou num componente das duas visões |
| — | [`memoria/`](memoria/) | memória persistente: um fato por arquivo, com índice em [`memoria/MEMORY.md`](memoria/MEMORY.md) |
| — | [`docs/MEDICOES-2026-09.md`](docs/MEDICOES-2026-09.md) | a evidência de cada número citado nos outros. Antes de "eu acho que o CRM tem…", olhe a tabela |
| — | [`referencias/codex-colidencias/`](referencias/codex-colidencias/) | as skills do Codex: método de colidência, comparador v1.2.0, renderer do parecer, identidade visual |
| — | [`dados-exemplo/`](dados-exemplo/) | um pacote completo no formato do contrato, com dados **fictícios** |

---

## Estado — 07/09/2026

**Sprint 1, entrega 1A + redesenho: prontos e validados no navegador.** Este é o commit em que o
projeto sai da máquina do Gui e vira repositório.

> O estado vivo é mantido em **[`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)**. Quando os dois
> divergirem, aquele ganha.

| | |
|---|---|
| testes de regressão | **106 passando**, 0 falhando |
| erros de tipo | 0 (`tsc --noEmit`) |
| lint | 0 erro, 0 aviso (`npx eslint src`) |
| build de produção | ✅ **26 rotas** |
| erros de console no browser | **0**, em 23 telas percorridas no Chrome (as duas visões, os dois temas, telefone) |
| contraste no tema escuro | 15,32 / 8,99 / 5,53 — os três acima do mínimo |
| vazamento horizontal no telefone | nenhum (390 px de janela, 390 px de conteúdo) |
| vulnerabilidades | **0** (`npm audit`) |
| dado real no repositório | **nenhum** — tudo em `dados-exemplo/` é fictício, e o `.gitignore` foi auditado antes do push |

### As duas visões

| | rota | quem vê | o que tem |
|---|---|---|---|
| **Gestor** | `/` | Gui e Márcio | a carteira inteira, de todos os clientes; a fila de análise de colidências; a coluna de prazo interno |
| **Cliente** | `/portal` | o titular, o cliente ou o parceiro | só os ativos dele, pela projeção auditada |

A visão do cliente lê **exclusivamente** de `projetarParaCliente()`, e a projeção passa por
`auditarProjecao()`, que **aborta** se um campo interno escapar. Trocar a escolha de demonstração
por um login autenticado não muda nenhuma tela — muda só de onde vem o `pessoa_id`.

O que funciona hoje: importar planilha com recusa explícita por linha · lista de ativos agrupada por
matéria, com filtro, busca e bandeira por jurisdição · **ficha do ativo em sub-abas** (geral ·
colidências · documentos · contratações) · **ameaças detectadas** com o choque lado a lado, as
dimensões da aproximação em palavras, o prazo com a régua visível e o **processo do terceiro abrindo
dentro do sistema** · conciliação titular↔cliente↔parceiro↔agente com trilha · prazos em cartão **e
em calendário**, com o estado `a_abrir` separado de `aberto` · mapa das jurisdições com as duas
camadas (onde há ativo × onde há leitura automática) · **investimentos** por ativo, país, matéria e
natureza da despesa, com recorte por cliente no gestor · **carteira por cliente** · documentos por
referência · histórico · exportação com auditoria · tema claro e escuro.

**Em beta, com a lacuna declarada na própria tela:** Documentos do gestor · Comunicados (só gestor —
o cliente vê o *efeito* do aviso, não o registro do envio) · Inteligência de mercado, nas duas visões.

**Falta para fechar o Sprint 1:** entrega 1B (importar a RPI → eventos, prazos e candidatas de
colidência, com portão humano) e 1C (histórico de serviços do Ploomes).

---

## Como o trabalho está dividido

| quem | o quê |
|---|---|
| **Gui e Márcio** | operam o Sprint 1 **manualmente**, em `localhost` — sobem os ativos, conciliam, rodam as RPIs |
| **Claude Code** | constrói o MVP de front do Sprint 1 e mantém os documentos |
| **Breno** (desenvolvedor) | **Sprint 3**: a base própria, a consulta ao INPI por procurador, as fontes internacionais. Assume o front depois e sobe para servidor novo |

O MVP não é protótipo descartável: é o ponto de partida do produto, o contrato visual e a camada de
repositório que a API vai preencher.

---

## As três fontes de dado — e o papel de cada uma

| fonte | o que dá | quando |
|---|---|---|
| **Base do INPI** (consulta ao registro) | **a carteira**: todo processo em que a Apex é procuradora | Sprint 1 por planilha · Sprint 3 automático por procurador |
| **RPI semanal** (XML) | **o que mudou**: despachos dos monitorados → eventos e prazos; publicações de terceiros → candidatas de colidência | Sprint 1B manual · Sprint 3 automático |
| **Planilha / certificado / declarado** | o que nenhuma base cobre (exterior sem API, desenho industrial, identificadores internos) | permanente |

⚠️ **A carteira não vem da revista.** A revista só lista quem teve despacho na semana.

---

## Por que este projeto é separado do BI da Apex

Não é preferência, é natureza. O BI interno (dashboards comercial, TV, OS, financeiro) é **100%
interno** — invisível da internet, servido só na rede privada Tailscale, em HTML/CSS/JS num arquivo
só. O OpenIpWorld tem **parte externa: extranet de cliente, com login**, front moderno e responsivo,
em servidor próprio. Modelo de segurança diferente, stack diferente, ciclo de vida diferente.

**Repositório próprio. O BI não é tocado por este projeto.**

---

## Como rodar — do clone à tela com dado

Requer **Node 22.6+** — está declarado em `engines` e em `.nvmrc`. O Next 16 pediria só 20.9, mas o
`npm test` usa `--experimental-strip-types`, que existe a partir do 22.6; o piso do repositório é o
maior dos dois. Foi construído e medido no **24.14.0**.

O dado mora no **backend** (`../backend`: Express + Prisma + MySQL, em Docker), que precisa estar
no ar. A receita dele está em `../backend/CLAUDE.md`; em resumo:

```bash
cd ../backend
cp .env.example .env           # preencha; JWT_SECRET entre aspas simples
docker compose -f docker-compose.dev.yml up -d    # API em http://localhost:3333
npm install && npm run migrate:dev && npm run seed # banco + primeiro admin
```

Depois, o front:

```bash
cd ../frontend
cp .env.example .env.local     # ⛔ NUNCA commitar o .env.local — mesmo JWT_SECRET do backend
npm install
npm run dev                    # http://localhost:3000
```

Entre com o admin do seed. Abra `/importar` e clique em **"Carregar dados de exemplo (fictícios)"**
— sem esse passo o app abre vazio, por decisão: **não há dado nenhum embutido**. A partir daí, `/` é
o gestor e `/portal` é a pré-visualização do cliente. Para entrar **como** cliente, crie o login em
`/usuarios`, ligado a uma pessoa da carteira: ao entrar, ele cai direto no portal dele.

Como as pontas se ligam: no desenvolvimento, o navegador fala com o Next, e `/api/backend/*` é
reescrito para a API (`IPAW_API_URL`). Em produção (Vercel), o navegador chama a API direto
(`NEXT_PUBLIC_API_URL`) e a Vercel só serve as telas. A sessão é um cookie httpOnly emitido pela API. O `src/proxy.ts` confere esse
cookie antes de cada tela — sem sessão vai ao `/login`, cliente fora do `/portal` volta ao portal —,
mas quem autoriza o dado é a API.

Os demais comandos:

```bash
npm test                       # testes de regressão
npm run build                  # build de produção
npm run lint                   # eslint
npm run exemplo                # regera dados-exemplo/ a partir do código
```

Versões travadas: Node **24.14.0** · Next **16.3.4** · React **19.2.8** · TypeScript 5 · Tailwind 4 ·
SheetJS **0.20.3** (do CDN oficial — a versão do registro npm está congelada numa release com
falhas conhecidas sem correção) · flag-icons **7.5.0** (local, não por CDN: o painel roda offline).

### A identidade visual não foi escolhida, foi medida

| | de onde veio |
|---|---|
| paleta | manual de marca, p. 20 — cinco cores, A a E. Verde, vermelho e âmbar **não** estão no manual: são semântica de produto e vivem só em etiqueta |
| o azul em degradê | manual, p. 21, bloco `GRADIENTE \| DEGRADÊ`, combinação **C+D** marcada "+ usado" (`#1A6581 → #000000`). A barra lateral do BI e a do Papi são execuções dele |
| fontes | manual, p. 30 + a regra da casa: **Poppins** título e etiqueta · **Raleway** corpo · **DM Sans** todo número, com `tabular-nums`. ⛔ nenhum monospace, e nenhuma fonte de sistema como família primária |
| vidro e brilho | vidro **só no tema escuro**; no claro o cartão é sólido, com sombra tingida de petrol. É decisão travada da casa, não preferência |
| barra lateral | 232 px aberta, 64 px recolhida, recolhe sozinha abaixo de 860 px. Mesma medida do BI |

O renderer do parecer de colidência é Python (ReportLab, Pillow, pypdf) e roda ao lado, como
serviço/CLI — ver `referencias/codex-colidencias/skills/apex-colidencias-pdf/SKILL.md`.

### Estrutura

```
src/contrato/     tipos + validadores zod = o CONTRATO-DADOS.md executável  ⛔ cópia gerada (*)
src/repositorio/  PortfolioRepository (interface) · implementação pela API do backend
src/proxy.ts      checagem otimista da sessão e rota por papel (Next 16)
src/regras/       identidade · extrator de número · calendário br_inpi · catálogo de réguas
                  (calendario, processo e reguas: ⛔ cópia gerada (*))
src/projecao/     projetarParaCliente() + auditoria que ABORTA em vazamento  ⛔ cópia gerada (*)
src/componentes/  estado global, casca com a barra lateral, mapa, calendário, choque de ameaça
src/lib/          derivados de leitura (matéria, urgência, jurisdição) e o exemplo fictício
src/app/          gestor:  / · /assets · /assets/[id] · /threats · /threats/[id] · /deadlines
                           /documents · /clients · /clients/[id] · /people · /reconciliation
                           /import · /export · /activity · /profile
                           /users · /integrations                  (admin)
                  acesso:  /login
                           /communications · /intelligence · /investments   ← beta
                  cliente: /portal · /portal/assets · /portal/assets/[id] · /portal/threats
                           /portal/threats/[id] · /portal/deadlines · /portal/documents
                           /portal/history · /portal/profile
                           /portal/intelligence · /portal/investments       ← beta
                  ⚠️ Rotas de PÁGINA em inglês desde 20/11/2026; os endereços antigos em português
                     não existem mais. A API do backend segue em português.

(*) A FONTE desses arquivos é o backend (`backend/src/...`), porque o contêiner do Docker só
    enxerga a pasta dele. Edite lá: `scripts/sincronizar-compartilhado.mjs` refaz a cópia daqui
    sozinho antes de `npm run dev`, `npm test` e `npm run build` (ou à mão: `npm run sincronizar`).
```

⚠️ **A tela nunca fala com o armazenamento** — só com `PortfolioRepository`. Foi assim que o banco
do navegador virou a API sem que nenhuma tela mudasse.

⚠️ **Um fato que aparece nas duas visões sai de um componente só.** `CardPrazo`, `CardPrazoLargo`,
`PainelInvestimento`, `PainelInteligencia` e `AmeacaCompacta` servem gestor e cliente ao mesmo tempo.
A única diferença legítima é uma prop como `mostrarInterno`. Duas cópias parecidas divergem — já
divergiram, e o mesmo prazo chegou a ser lido como *"em 7 anos"* de um lado e *"em 2806 dias"* do
outro. Ver [`SKILLS.md`](SKILLS.md) §2.1 antes de duplicar qualquer coisa.

---

## O que NUNCA entra neste repositório

Chave, token, `.env`, `.codex/`, dado real de cliente, JSON de dados do BI, extrato, fatura,
planilha real da base-mestra, PDF de relatório real, `.msg`/`.eml`. O `.gitignore` nasceu **antes**
do primeiro commit; conferir `git status` antes de cada um.

Os dados de exemplo são **fictícios** — nome, número de processo, CNPJ e e-mail inventados.
