# OpenIpWorld (IPAW / IPWALLET) — CLAUDE.md

Portal SaaS onde o cliente da Apex IP acompanha os ativos de propriedade intelectual dele.
Substitui o APOL e o Webseek. **Repo, servidor e ciclo de vida separados do BI.**

Este arquivo é a referência de regras para quem trabalha aqui — Claude Code, o Gui, o Márcio e o
Breno. O estado vivo, o plano e as perguntas ficam nos arquivos abaixo; **não duplicar aqui**.

| arquivo | o que é |
|---|---|
| [`PLANO.md`](PLANO.md) | o plano aprovado: o que é, sprints, entidades, fronteiras, riscos, decisões pendentes |
| [`CONTRATO-DADOS.md`](CONTRATO-DADOS.md) | **o contrato** — o formato que upload, RPI e API produzem. Tipos TS. Mudança só com versão |
| [`PERGUNTAS-ABERTAS.md`](PERGUNTAS-ABERTAS.md) | o que falta decidir, com dono. Decisão fechada sai de lá, datada, e entra aqui em §2 |
| [`ONBOARDING-BRENO.md`](ONBOARDING-BRENO.md) | o que o desenvolvedor precisa saber e o que se exige dele |
| [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) | **o estado vivo**: onde estamos hoje, as decisões travadas, o que bloqueia e de quem é. Contagem de teste e de rota mora lá, e só lá |
| [`SKILLS.md`](SKILLS.md) | as lições, cada uma com o incidente que a gerou. Ler antes de mexer na projeção ou num componente das duas visões |
| [`docs/MEDICOES-2026-09.md`](docs/MEDICOES-2026-09.md) | a evidência de cada número citado no projeto |
| [`memoria/`](memoria/) | memória persistente: um fato por arquivo, com índice em `memoria/MEMORY.md` |
| `dados-exemplo/` | dados **fictícios** no formato do contrato. Nunca dado real |

---

## 1. Como trabalhar aqui

- **Português do Brasil**, 2 casas decimais, datas `DD/MM/AAAA` no texto e ISO no dado.
- **Medir antes de afirmar.** Número sem comando que o produziu não entra em documento.
- **O plano vem antes do código.** Mudança de escopo passa pelo `PLANO.md` e pela aprovação do Gui.
- **Autorização explícita** antes de: commit, push, deploy, qualquer escrita em sistema externo
  (Ploomes, Omie, n8n, Meta), qualquer envio a cliente. "Ficou bom" valida visual; não autoriza.
- **Complementar é o padrão; modificar exige fundamentação.** Não reescrever o que funciona para
  "melhorar".
- Ao fim de cada ajuste: atualizar o `PLANO.md` (estado), o `PERGUNTAS-ABERTAS.md` (decisões que
  fecharam) e a memória.
- **O BI (`~/Desktop/DASHBOARD BI APEX`) não é tocado por este projeto.** Nem para "aproveitar".
  O que for reusado de lá entra por cópia de código **sem segredo** e sem dado real, documentado.

## 2. Decisões tomadas (não reabrir sem o Gui)

⚠️ **A numeração `D` não é compartilhada entre os arquivos.** Esta lista e a do
`PERGUNTAS-ABERTAS.md` nasceram em momentos diferentes: D1–D10 e D12 coincidem, mas **`D11` e `D13`
querem dizer coisas diferentes nos dois** — o `D13` daqui (a carteira vem da base do INPI) é o `D11`
de lá, e o `D14` daqui (as skills do Codex) é o `D13` de lá. Citar decisão pelo número faz duas
pessoas concordarem sobre coisas diferentes: **cite o texto**.
>
> ⚠️ E não resolva isto apontando para um terceiro lugar: o `PROJECT_CONTEXT.md` §3 tem a
> **própria** numeração D, incompatível com as duas. Três numerações é pior que duas. Enquanto
> ninguém as alinhar, **o número não identifica decisão nenhuma** — só o texto identifica.

| # | decisão | data · autor |
|---|---|---|
| D1 | O MVP roda **local, sem servidor** (nem a VPS interna). O Breno sobe para servidor **novo e separado** quando houver cliente. Gatilho: **o primeiro socket público** | 05/09 · Gui |
| D2 | Stack: **React + Next (versão estável mais recente no scaffold) + TypeScript + Tailwind**, banco **no navegador**, projeto rodando em `localhost` | 06/09 · Breno via Gui |
| D3 | **Não se usa nada do APOL.** Estrutura própria. Sem migração | 06/09 · Gui |
| D4 | Entrada inicial por **planilha** (upload); automação depois. O upload é **entrada de primeira classe**, permanente | 06/09 · Gui |
| D5 | O **Ploomes é histórico de contratação** (propostas, contratos, serviços). **Nunca** fonte do ativo nem do acompanhamento | 06/09 · Gui |
| D6 | Operação ADM (funil de serviços, Petições IA) está **fora** deste escopo | 06/09 · Gui |
| D7 | Sprints: 1 Portfólio · 2 Comunicações · 3 Base/INPI/internacionais/buscas (**Breno**) · 4 Extranet · posterior E-renewal | 06/09 · Gui/Breno |
| D8 | Repo **privado em `rogerinkingcode`**, tudo. Commit só após aprovação do plano e início do primeiro entregável | 06/09 · Gui |
| D9 | Quem opera o Sprint 1: **Gui e Márcio**, manual. Breno trabalha local no clone | 06/09 · Gui |
| D10 | Foco do Sprint 4: **cliente final de grande porte**; parceiro é visão à parte | 06/09 · Gui |
| D11 | CSAT/NPS/WABA e o assistente SDR são **produtos do BI**; o Wallet produz comunicados e consome o canal (`PLANO.md` §7) | 06/09 · Gui |
| D12 | **WhatsApp: 1 BM + 1 WABA + 3 números por finalidade** — ① `Guilherme · Apex IP` (CSAT/NPS) · ② `Apex Propriedade Intelectual` (portfólio, **push-only** com auto-resposta) · ③ `Assistente Apex` (SDR, **declarado**). Motor de envio único no BI/n8n; o Wallet grava `Comunicado` na caixa de saída e nunca vê o token. Registro só na **Frente 3**, depois do commit do Wallet | 06/09 · Gui ("De acordo") |
| D13 | **A carteira vem da base do INPI** (manual por planilha; automática por procurador via API do Breno). **A revista traz só o que mudou** — despachos dos monitorados e colidências de terceiros. Nunca cadastro automático a partir da RPI | 06/09 · Gui |
| D15 | **O backend é `../backend`** (Express + Prisma + **MySQL no Docker**), moldado a partir de outro projeto da casa e enxugado ao que este front usa. **Quem emite id é o servidor** (UUID, padrão do backend) — o navegador nunca cria id persistente. **Login é o do backend** (sessão em cookie httpOnly), e o front usa o `proxy.ts` do Next 16 para rotear por papel. A importação de planilha **passou para o servidor** (17/11/2026): o navegador só envia o arquivo; a API lê, mostra a análise e, confirmada, **mescla** na carteira — não substitui | 03/11/2026 · Gui |
| D14 | O comparador de colidências v1.2.0 e o renderer do parecer (skills do Codex, `referencias/codex-colidencias/`) são a **especificação**: o comparador é portado para TS com os 12 testes de regressão; o renderer **fica em Python** ao lado | 06/09 · Gui via skills |

## 3. Regras de código — as que não se negociam

1. **Todo dado entra pela API, via `PortfolioRepository`** (`src/repositorio/api.ts`) ou `lib/api`,
   em `BASE_API`: no desenvolvimento, `/api/backend/*`, que o `next.config.ts` reescreve para
   `IPAW_API_URL`; em produção (Vercel), direto na API, em `NEXT_PUBLIC_API_URL` — a Vercel só
   serve as telas (ver lib/api.ts). **Nunca** `fs.readFileSync`, `./dados/x.json`, `file://`, caminho
   absoluto de disco. Código de dev = código de produção; muda o env.
2. **A tela nunca fala com o armazenamento.** Só com `PortfolioRepository` (a API do backend; o
   IndexedDB do MVP local saiu em 03/11/2026 sem tocar em tela). Trocar a implementação não toca
   componente.
3. **O contrato é o tipo.** `src/contrato/*.ts` é a única fonte da forma do dado. Planilha, RPI e
   API são validados contra ele. Campo novo = versão no `CONTRATO-DADOS.md`.
4. **Todo `*_id` é emitido pelo SERVIDOR (UUID), opaco, imutável** (decisão do Gui, 03/11/2026).
   Nunca derivado de número, nome ou documento. Ativo que ganha número mantém o id. O navegador só
   cria **referência provisória** (ULID) dentro de um pacote ainda não gravado — a planilha
   importada precisa ligar vínculo → pessoa → ativo — e o servidor a troca pelo id definitivo.
5. **`evento_id` é hash do conteúdo**, nunca da posição no arquivo. Duas fontes do mesmo fato =
   duas observações do mesmo evento.
6. **Nada derivado é gravado.** `dias_restantes`, `vencido`, contadores, totais: função de
   `(dado, hoje)` na leitura, com `hoje` explícito e testável.
7. **Prazo carrega a régua inteira e a firmeza.** A tela mostra as duas. O front **nunca soma
   dias** — quem produz o pacote produz `vence_em`.
8. **Zero silêncio.** Nenhum `continue` que descarte linha, nenhum `catch` que devolva `false`.
   Recusa diz linha, coluna, valor e motivo. Degradação (XML indisponível → PDF) é **declarada**
   no envelope.
9. **RPI é XML. PDF nunca é padrão.** O parser de PDF perde ~58% fora do 2.10 (regex exige
   `Código X.YY` com ponto). Parser em Web Worker, streaming; só o que casa com a carteira fica em
   memória.
10. **Nome nunca é chave.** Mesmidade de pessoa por documento ou decisão humana registrada.
    Titular ≠ cliente ≠ parceiro ≠ agente ≠ procurador: papel é do **vínculo**.
11. **`vigilancia.ativa` nasce `false`** e só vira `true` quando há feed que cobre a jurisdição.
    `atualizado_em` é **por ativo**, nunca carimbo global.
12. **A especificação tem veto sobre o score de colidência.** O cliente só vê colidência com
    parecer humano `enviar`. Score cru nunca sai da tela interna.
13. **Documento sai por endpoint autenticado com verificação de posse e log.** ⛔ Nunca a URL do
    blob do Ploomes (responde 206 sem credencial, sem expiração). `publicavel` nasce `false`.
14. **A projeção para o cliente é lista branca executável** (`CONTRATO-DADOS.md` §11) com teste que
    aborta se vazar `contato`, `agente`, **valor de procedência `order_amount`**,
    `scores`, `nota_interna` ou `blob.core.windows.net`. ⚠️ A proibição do valor era cega e deixou
    de ser em **07/09/2026**: valor com **procedência documental** — `nota_fiscal`, `cobranca`,
    `declarado` — passou a ser informação do cliente e atravessa; `order_amount` **nunca**, porque é
    o campo do card no CRM e infla o nacional em R$ 145.153,79 (card espelhado repete o valor do
    irmão). A lista vive em `ORIGENS_DE_VALOR_PUBLICAVEIS`, em `src/projecao/cliente.ts`.
15. **Sem `<table>` em tooltip, sem `opacity` em texto, `var()` só para variável que existe** —
    lições do BI que valem em qualquer front.
16. **Dado de exemplo é fictício.** Nome, número de processo, CNPJ, e-mail — tudo inventado.
    Dado real de cliente **nunca** entra no repo.
17. **P0–P3 é fila de recuperação, não risco.** `risk_level` só nasce de análise; `approval_status`
    só nasce de decisão humana registrada (`case_id` + revisão + hash + quem + quando). Mudança
    material no caso **não herda** aprovação.
18. **Nenhum indicador sem denominador declarado.** Taxa por publicação ≠ taxa por par; cobertura
    visual = verificados/aplicáveis. Sem denominador validado, a tela diz "indisponível".
19. **Hora de rotina é configuração, nunca constante.** A leitura nacional é terça 12h
    `America/Sao_Paulo` por config; o fuso do n8n é blindado e não é motivo de mudança.
20. **Limites de índice são contados e declarados.** O comparador tem tetos (DF 2.500/5.000;
    6.000 candidatos por base): quantos bateram no teto aparece no relatório da rodada. Nunca
    apresentar recuperação limitada como exame sem perdas.

## 4. O que este projeto consome dos outros, e o que devolve

| sistema | o Wallet consome | o Wallet devolve | fronteira |
|---|---|---|---|
| **Ploomes** (CRM) | histórico de contratação por ativo (cards ↔ número extraído do **título**; N:N); e-mail/telefone/documento para convite (Sprint 4); campo `deal_21FE7CDC` "cliente = titular?" | (fase 2) `Evento` de comunicado enviado, se o Gui quiser espelhar | **nunca** dado do ativo; **nunca** `Deal.Amount` (infla R$ 145.153,79); **nunca** URL de anexo. O Wallet não tem credencial do Ploomes no lado público — o interno **empurra** |
| **Base do INPI** (consulta ao registro) | **a carteira**: processos em que a Apex é procuradora, com dados cadastrais e datas. Sprint 1: planilha (base-mestra); Sprint 3: **API do Breno, por procurador** | — | HTML com sessão, sem SLA — vigia que avisa. É o que substitui a exportação manual do Webseek |
| **RPI do INPI** (XML semanal) | **o que mudou**: despachos dos monitorados → eventos/prazos; publicações de terceiros → candidatas de colidência; `procurador` só como **alerta de cadastro** | — | **não é origem da carteira**; sem SLA nem changelog; já quebrou por header. Vigia que **avisa** quando não roda |
| **Papi** (`/opt/papi/` na VPS — a única cópia viva) | as **peças**: descoberta da revista pelo índice, download + `sanitiza()`, idempotência pelo banco, backup antes de escrever, **calendário útil br** | — | **não** reusar o `main()`, o filtro `DESPACHO_ALVO`, o caminho PDF, nem a tolerância a falha silenciosa. Papi é prospecção; Wallet é acompanhamento |
| **BI** (`DASHBOARD BI APEX`) | nada em runtime. Lições e padrões por cópia documentada | (Sprint 2) `Comunicado` na caixa de saída para o motor de envio; (futuro) contagens para a aba Mensageria | repos separados; o BI **não é modificado**; o md5 do BI é conferido antes e depois de qualquer trabalho que o leia |
| **n8n / Slack** (interno) | — | caixa de saída de comunicados (e-mail + WhatsApp) consumida pelo motor interno pela Tailscale | o token da WABA e do e-mail **nunca** existem no lado público. Fuso e cron do n8n são **blindados** — nunca são motivo de mudança |
| **Financeiro / Omie / Asaas / Stripe** | nada no MVP. (E-renewal, posterior: Stripe cobra o cliente; a GRU se gera no INPI) | — | valor de serviço vai ao cliente **só com procedência documental** (`nota_fiscal`, `cobranca`, `declarado` — decisão de 07/09/2026); `order_amount` **nunca**, é o campo do card no CRM e infla o nacional em R$ 145.153,79 porque card espelhado repete o valor do irmão. Saldo pré-pago não é cobrança |
| **Drive** (`LEITURA DE COLIDÊNCIAS`, `01 - Base-mestra Apex`) | a base-mestra (1.540) como **primeira carga**; as 10 regras de ingestão; os artefatos do método (prévia, JSONs, PDFs) como especificação | (futuro) o relatório gerado | pasta do Drive **nunca** é compartilhada com cliente (`03 - FATURA DO AGENTE` é irmã de `08 - CERTIFICADO`) |
| **APOL / Webseek** | **nada** (D3). Só o custo, para a definição de pronto | — | não desligar antes do `PLANO.md` §8 |

## 5. Fronteira e segurança — as 10 regras, cada uma com o fato da casa

1. **Credencial se verifica no servidor.** No BI o hash é comparado no navegador e as abas são
   `display:none` — a própria casa escreveu que isso não é fronteira.
2. **Nenhum segredo, hash ou perfil no bundle.** O HTML do BI entrega 8 perfis com hash.
3. **bcrypt custo ≥ 12.** SHA-256 seco: 8 de 8 senhas do BI quebradas. O painel 8090 (bcrypt) não.
4. **Uma identidade, um segredo.** Três perfis do BI dividem o mesmo hash; o log não distingue.
5. **Sessão é objeto do servidor, revogável.** No BI o `sessionStorage` se renova sozinho.
6. **Perfil de fora não herda escopo de dentro.** O perfil `marketing` do BI acumulou `carteira`.
7. **Allowlist de rotas; o resto responde 404.** Modelo: `apex-mkt.conf` (`location / { return 404; }`).
8. **O interno empurra; o portal não consulta sistema interno em tempo real.** A chave do n8n é
   chave-mestra (31 workflows, 43 segredos literais dentro).
9. **Projeção por lista branca executável, com asserção que aborta.** O `mkt_ext.py` prometia
   varredura de PII que **não existe** no código — documentação de proteção inexistente é pior que
   não ter.
10. **Todo derivado herda a restrição do mais fechado.** `/data/financeiro.json` → 403;
    `/data/financeiro.json.bak-…` → **200 com 3,6 MB** (12/08/2026). Backup, export, PDF, cache,
    thumbnail, log.

E o vizinho: o **Papi** roda na VPS na 8501 **sem autenticação**, aberto a todo peer do tailnet,
com 7.869 titulares. Mais um motivo para D1 e para o servidor separado.

## 6. Vocabulário

| termo | significa | não confundir com |
|---|---|---|
| **ativo** | o bem: uma marca numa classe, uma patente, um DI | o card do Ploomes (é serviço sobre o ativo) |
| **família** | a mesma marca em várias classes/jurisdições | processo |
| **titular** | quem é dono do direito | cliente (quem paga), agente (quem intermedeia) |
| **parceiro** | IPartner / escritório que revende; vê os clientes **dele** | agente correspondente (no exterior; mesma tabela, papel diferente) |
| **procurador** | quem consta no INPI; **é a Apex** — chave da consulta ao registro (Sprint 3) e do alerta de cadastro na RPI | dono |
| **P0–P3** | fila de recuperação do comparador (combinado ≥88 · ≥80 · ≥70 · resto) | alto/médio/baixo (é juízo) |
| **rodada** | uma execução: jurisdição + revista + snapshot da carteira + versão do método; estados `created → … → delivered` | a revista |
| **evento** | despacho publicado, fato datado | situação (derivada) |
| **prazo** | derivado de evento por régua, com firmeza | `Prazo oficial` do CRM (registro histórico; 651 de 709 vencidos) |
| **candidata** | par cliente × terceiro que passou na triagem mecânica | colidência aprovada (passou pelo parecer humano) |
| **portão** | a decisão humana `enviar`/`não enviar`; **é o produto** | estorvo |
| **RPI** | Revista da Propriedade Industrial, semanal (terça). `RM####.zip` marcas, `P####.zip` patentes | o PDF |
| **base-mestra** | `Base_Processual_Apex_ATUAL.xlsx` no Drive, 1.540 linhas — a primeira carga | o APOL |
| **429** | famílias monitoráveis no cruzamento semanal — a régua mora em `includedInWeeklyScreening` + `strongTerminal` **mais** um filtro da carga piloto; **política única ainda não escrita** | os 1.540 |

## 6-bis. Design — medido, não escolhido

Tudo abaixo saiu do manual de marca e dos três painéis da casa. Não é gosto; é a linguagem que
o Gui compara de olho no momento em que abre a tela, e qualquer desvio salta.

### As duas visões, e a fronteira entre elas

| | rota | fonte do dado |
|---|---|---|
| **gestor** | `/…` | o pacote inteiro |
| **cliente** | `/portal/…` | **só** `projetarParaCliente()`, e a projeção passa por `auditarProjecao()` |

⛔ Nenhuma tela sob `/portal` lê do pacote completo. Se precisar de um campo que a projeção não
leva, a decisão é acrescentá-lo à **lista branca do contrato** — nunca contornar por fora.

### Cor

| conceito | valor | onde |
|---|---|---|
| ciano (A) | `#00E0F6` | destaque, borda ativa, brilho, anel de vigilância |
| tinta (B) | `#212121` | texto sobre ciano |
| petrol (C) | `#1A6581` | cor principal, cabeçalho de tabela, terra no mapa |
| preto (D) | `#000000` | fim do degradê |
| branco (E) | `#FFFFFF` | superfície no claro |

**O degradê da marca é o C+D** — manual p. 21, marcado "+ usado". A execução é a mesma do BI:
`linear-gradient(168deg,#1A6581 0%,#0E3A4A 40%,#08171d 100%)`.

⚠️ **Verde, vermelho e âmbar não estão no manual.** São semântica de produto, e por decisão do Gui
(08/08/2026) vivem **só em etiqueta** — nunca em texto corrido, nunca em rodapé de cartão. Ele
reverteu rodapés coloridos duas vezes.

⚠️ Onde é comparação de volume, e não juízo, a cor é **uma só** com opacidade variável. Escala
multicolor é ruído de decodificação.

### Fonte

| papel | fonte |
|---|---|
| título, etiqueta, navegação, botão | **Poppins** |
| corpo | **Raleway** |
| **todo número** | **DM Sans**, sempre com o par `font-variant-numeric: tabular-nums` + `font-feature-settings:'tnum'` |

⛔ **Nenhum monospace.** JetBrains Mono é a fonte que o Gui rejeita como "cara de IA"; foi eliminada
do BI (21 ocorrências) e do OS (13) em 09/06/2026. A classe `.tabular`, que na entrega 1A apontava
para ela, virou apelido de `.num`.
⛔ **Nenhuma fonte de sistema como família primária** — "fonte de sistema por fallback salta aos
olhos". Elas entram só atrás das três da casa. As fontes são auto-hospedadas via `next/font`: sem
CDN, sem piscar, funciona offline.

### Vidro e brilho

**Vidro só no tema escuro.** No claro o cartão é sólido, com sombra tingida de petrol
(`rgba(16,74,94,…)`, nunca cinza neutro). O Gui rejeitou vidro translúcido no claro duas vezes —
"fica lavado".

```css
/* escuro */ background: linear-gradient(160deg,rgba(36,52,64,.7),rgba(15,25,33,.76));
             backdrop-filter: blur(16px) saturate(1.2);
             box-shadow: 0 1px 2px rgba(0,0,0,.32), 0 10px 26px rgba(0,0,0,.3),
                         inset 0 1px 0 rgba(255,255,255,.07);  /* a linha de luz é o que dá o vidro */
/* brilho  */ box-shadow: …, 0 0 22px rgba(0,224,246,.18);      /* 2ª sombra, raio 0, ciano fraco */
/* toque   */ transform: translateY(-1px);                       /* UM pixel. nunca mais */
```

### Barra lateral

232 px aberta · 64 px recolhida · recolhe sozinha abaixo de 860 px · fundo é o degradê C+D · item
ativo leva `rgba(0,224,246,.15)` e `border-left-color:#00E0F6`. Mesma medida do BI.

### As regras de tela que vêm do parecer

1. **O choque é uma grade de 2 colunas × 4 linhas**, com as linhas compartilhadas — nunca duas
   pilhas lado a lado. Com pilhas, "data de depósito" de um lado cai na altura de "situação" do
   outro, e a diferença de altura **parece juízo**.
2. **Score cru nunca chega à tela.** Verin × Vaerin tem fonético 100,00 e combinado 78,80, e é
   BAIXO porque a especificação é 0,00. O que se mostra é o juízo da pessoa (alto/médio/baixo) e as
   **dimensões em palavras** (`Colidencia.dimensoes`), que é a tabela que o PDF já leva ao cliente.
3. **Risco e prazo são duas etiquetas, nunca fundidas.** Risco é juízo humano e usa cor semântica;
   proximidade é aritmética e usa cor por faixa. Um caso médio a 5 dias e um alto a 55 precisam ler
   diferente na dimensão certa.
4. **Urgência é relógio, não termômetro.** ⛔ Sem contagem regressiva animada, sem vermelho
   pulsante, sem sino: a casa entrega um ou dois casos por revista, e urgência teatral ensina a
   ignorar a tela. Faixas: ≤10 dias urgente (é a antecedência praticada, legal − 10), ≤30 atenção,
   vencido em cinza **sem alarme**.
5. **A régua inteira aparece.** É contrato: o prazo carrega dias, fundamento, contagem e dies a
   quo, e a tela mostra. A **firmeza** é obrigatória — hoje quase toda data sai com ressalva, e
   isso é honestidade, não defeito de acabamento.
6. **O mapa tem duas camadas que não se fundem**: onde há ativo (pino) e onde há leitura automática
   (anel). Cor lê-se como intensidade, não como ausência. Legenda literal, porque **ausência de
   ameaça num país não vigiado é ausência de olho, não ausência de risco**.
7. **O estado vazio de ameaças é o mais comum** (medido: 3 aprovações em 19 casos de risco alto).
   ⛔ Nunca "tudo certo" com um ✓ verde: a cobertura é parcial por jurisdição.
8. ⛔ **Não publicar o funil.** "Analisamos 13.078, 7 eram altos, aprovamos 1" parece transparência
   e é o contrário: convida a perguntar pelos que não aparecem.
9. **Toda ação com resultado avisa por toast** (canto superior direito, `componentes/Toast.tsx`),
   mesmo quando a tela já mostra a própria mensagem. Cor pelo tipo: sucesso (verde), erro
   (vermelho), aviso (âmbar), info (petróleo). Estado de mensagem de tela nova é
   `useMensagem('erro' | 'sucesso' | …)` no lugar de `useState<string | null>` — o toast vem junto;
   fora disso, `toast.sucesso(...)` e afins. O título do sucesso é "Concluído", nunca "Tudo
   certo": fala da ação, não do resultado (regra 7).
10. **Espera é esqueleto, nunca "Carregando…".** Enquanto o dado vem do backend, a tela mostra o
    esqueleto DELA — espelho fiel da estrutura (mesmo cabeçalho, mesmos cartões, mesmas colunas
    de tabela, mesmas abas), para nada pular quando o dado chega. Peças em
    `componentes/Esqueleto.tsx`; o esqueleto de cada página em `componentes/EsqueletosDasPaginas.tsx`.
    Tela nova ganha o seu ali; mudou o desenho de uma tela, ajuste o esqueleto dela também.

## 7. Como rodar

A receita de execução mora no [`README.md`](README.md) → **"Como rodar — do clone à tela com dado"**:
o piso de Node, os comandos, o passo de carregar os dados de exemplo (sem ele o app abre vazio e
parece quebrado), a estrutura de `src/` e as versões travadas. **Aqui não se repete** — duas receitas
divergem em silêncio, e a que morava neste arquivo já tinha envelhecido.

## 8. O que NUNCA vai para o repo

Chave, token, `.env*`, `.codex/`, `.claude/`, dado real de cliente, JSON de `front/data/` do BI,
extrato, fatura, planilha real da base-mestra, PDF de relatório real, `.msg`/`.eml`. O `.gitignore`
já cobre; conferir com `git status` antes de todo commit. O repo do BI tem a chave do Ploomes num
snapshot **versionado** — aqui isso não se repete.
