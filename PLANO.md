# OpenIpWorld (IPAW / IPWALLET) — PLANO DO PROJETO

> **Estado: APROVADO pelo Gui em 06/09/2026. Entrega 1A construída e validada em `localhost`.**
> Escrito depois de duas rodadas de medição (24 agentes, ~5 milhões de tokens de leitura) sobre o
> repo do BI, o CRM Ploomes vivo, o Drive, o Desktop, a VPS e a RPI do INPI.
> Nenhum sistema externo foi alterado. O primeiro commit saiu em **07/09/2026**.
>
> **Entrega 1A + redesenho, medidos em 07/09/2026:** **106 testes** de regressão passando · 0 erro
> de tipo · 0 aviso de lint · build de produção com **26 rotas** · **0 erro de console** no Chrome
> real, em 23 telas percorridas · 0 vulnerabilidade.
>
> ⚠️ A contagem viva não mora aqui — mora no [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md). Estes
> números são o carimbo do commit inicial e envelhecem de propósito.
> Um defeito real foi encontrado e corrigido durante a validação: a planilha lida como número
> destruía o **zero à esquerda** do identificador do EUIPO (`018999999` → `18999999`), e a linha era
> recusada. O importador passou a ler como texto e a jurisdição declarada agora reclassifica o
> identificador. Travado por teste.
>
> Quem chega agora lê nesta ordem: [`README.md`](README.md) → este arquivo →
> [`CONTRATO-DADOS.md`](CONTRATO-DADOS.md) → [`CLAUDE.md`](CLAUDE.md) →
> [`PERGUNTAS-ABERTAS.md`](PERGUNTAS-ABERTAS.md) → [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)
> (o estado vivo) → [`SKILLS.md`](SKILLS.md) (as lições, com o incidente de cada uma).
> A memória do projeto está em [`memoria/`](memoria/), com índice em
> [`memoria/MEMORY.md`](memoria/MEMORY.md). O desenvolvedor lê também
> [`ONBOARDING-BRENO.md`](ONBOARDING-BRENO.md). A evidência de cada número deste plano está em
> [`docs/MEDICOES-2026-09.md`](docs/MEDICOES-2026-09.md).

---

## 1. O que é o OpenIpWorld

**Um portal SaaS onde o cliente da Apex acompanha os ativos de propriedade intelectual dele** —
marcas, patentes, desenhos industriais, no Brasil e no exterior — com o ciclo de vida de cada um,
os prazos que dele decorrem, os documentos, o histórico do que foi contratado, e a comunicação
oficial sobre tudo isso por e-mail e WhatsApp. "Intellectual Property Asset Wallet".

Ele **substitui dois fornecedores pagos** — o **APOL** (cadastro de titulares e processos, cartas
de despacho) e o **WEBSEEK** (base de marcas, exportação da carteira) — com estrutura própria,
sem migrar nada deles, e vai **muito além**: agente de colidências por jurisdição, explicação
técnica de cada despacho, e, mais tarde, renovação e anuidade direto no painel (E-renewal).

### O que ele NÃO é

- **Não é o BI.** O BI é interno, HTML/CSS/JS num arquivo, na Tailscale. O Wallet é aplicação web
  com login de cliente, front moderno e responsivo, em servidor próprio. Repos separados. **O BI não
  é tocado por este projeto.**
- **Não é a operação administrativa.** Substituir o funil de serviços do Ploomes e o braço de
  *Petições IA* é um segundo momento, fora deste escopo. O que entra aqui é só o que **o cliente
  vê e recebe**.
- **Não é o CSAT/NPS/SDR.** Esses são produtos do BI (abas). O que é compartilhado com eles — o
  canal de WhatsApp — está desenhado na §7 para não haver retrabalho.

### O que ele substitui, e quanto isso vale (medido)

| fornecedor | como aparece no financeiro | empresa | custo/mês | por ano |
|---|---|---|---|---|
| **APOL** | `VELA SOFTWARE BRAZIL PARTICIPACOES` · cat. `ip\|2.04.98` | APEX IP | **R$ 2.030,21** (boleto 31/08/2026; provisão R$ 2.024,68) | R$ 24.362,52 |
| **WEBSEEK** | `VELA SOFTWARE E SERVICOS` · **mesmo CNPJ** · cat. `mp\|2.04.96` | APEX MP | **R$ 735,52** (desde set/2025; era R$ 699,00) | R$ 8.826,24 |
| **total** | | | **R$ 2.765,73** | **R$ 33.188,76** — 25,06% do gasto anual de software da casa |

⚠️ No financeiro nenhum dos dois se chama pelo nome: os dois são **VELA**. O Webseek só aparece
com esse nome nos extratos brutos do Inter (`"09. WebSeek"`, set/2024). O **Aquiles** — a
ferramenta da leitura semanal da RPI, R$ 119,26/mês, também Vela — foi **cortado em 25/08/2025**;
a leitura de colidências passou a ser feita por agente no Codex desde 27/07/2026.

⛔ **Ordem de desligamento é regra, não detalhe:** nenhum dos dois é cancelado antes de o
substituto estar **em produção e conferido por um ciclo inteiro** (§8). Hoje o APOL é a **única**
comunicação automática de processo que a casa tem, e a base-mestra das colidências **nasce de uma
exportação manual do Webseek**. Cortar antes é apagar a vigilância que o produto promete.

---

## 2. O que a medição descobriu — os fatos que moldam o desenho

Dez fatos. Cada um tem a prova em `docs/MEDICOES-2026-09.md`.

| # | fato medido | consequência de projeto |
|---|---|---|
| **F1** | O Ploomes tem **zero** campos de ciclo de vida do ativo — 0 de 488 para depósito, concessão, vigência, anuidade, prorrogação, oposição. Os 32 campos de data são todos de dinheiro ou prazo interno. | O Ploomes é **histórico de contratação**, nunca fonte do ativo. Confirma a decisão do Gui. O ciclo de vida é a camada que a casa nunca teve — é exatamente o que o APOL vende. |
| **F2** | O XML da RPI de **Marcas** publica o **procurador** estruturado (33.625 na RPI 2904), `data-vigencia` e `data-concessao` nativas, classes Nice com especificação, ponte com Madri. A Apex aparece como procuradora — em **duas grafias** (11 processos). | ⚠️ **Correção do Gui (06/09):** a revista **não é** a origem do portfólio — ela só lista quem teve despacho na semana. **A carteira vem da base do INPI** (consulta ao registro): manual por planilha no Sprint 1, **automática por procurador via API do Breno** no Sprint 3. A RPI traz **despachos novos dos monitorados** (→ eventos/prazos) **e colidências com publicações de terceiros**. O `procurador` na revista serve só como **alerta de cadastro** ("apareceu em nosso nome e não está na carteira"). A lista de grafias da Apex é **dado versionado, editável sem deploy**. |
| **F3** | O XML de **Patentes** **não tem** `procurador`, vigência nem anuidade (censo completo, zero). A RPI de **Desenho Industrial** sai **só em PDF** (`DI####.zip` → 302/404). | Patentes entram por número; DI entra por upload e nasce com `vigilancia.ativa=false`. |
| **F4** | **Titular ≠ cliente** em 16,05% dos serviços nacionais e 97,51% dos estrangeiros; nesses casos o titular está **anônimo** em 61,54% / 75,71%. **69,6% dos ativos** apontam pelo `ContactId` para um **agente**. Co-titularidade em 208 deals (até 4 titulares). | Titular, cliente, parceiro, agente e procurador são **papéis numa relação N:N com vigência**, não atributos da pessoa. A conciliação é tela de primeira classe. |
| **F5** | O número do processo mora no **título** do card (3.322) 22× mais que no campo (1.692 — só 82 exclusivos do campo). **1.532 processos distintos**, 837 com 2+ cards. 286 títulos carregam **mais de um** número. 11 de 56 títulos vivos trazem o **dígito verificador** da patente (`BR 102022000101-0`). | Extrator de título é infraestrutura (para pendurar histórico). Serviço↔ativo é **N:N**. Nunca descartar o dígito verificador. |
| **F6** | **17,86%** dos ativos vivos ainda **não têm número** (pedidos em nascimento: VALENS, Libélula, MegaPrime, Futebot). | `ativo_id` é **emitido e opaco**, nunca derivado do número. |
| **F7** | A **base-mestra da leitura de colidências** existe: `Base_Processual_Apex_ATUAL.xlsx`, **1.540 registros** (1.532 INPI + 8 `ND`), Drive, 03/09/2026, com regras de ingestão escritas (`LEIA-ME_EXECUTOR_SEMANAL.md`). Mas o cruzamento semanal usa **429** "famílias monitoráveis". A skill do Codex (06/09) mostra **onde** a régua mora — `legalStatus.includedInWeeklyScreening` + `strongTerminal` no normalizador, **mais** um filtro próprio da carga piloto — e admite que hoje são **duas políticas**. | A base-mestra **é** o portfólio inicial e **é** o formato canônico da planilha de upload (a base normalizada já traz `depositDate`, `vigencyEnd`, `renewalStart/End`). A **política única de elegibilidade** precisa ser escrita pelo Gui — ou o painel mentirá sobre 1.111 ativos. |
| **F8** | O método de colidência **já é software**: pipeline nomeado, carimbo SHA-256 da revista, idempotência, tiers P0/P1/P2, 4 scores + combinado, **especificação com veto sobre o score** (Verin × Vaerin: fonética 100,00, combinado 78,80, veredito BAIXO), **portão humano** que morde (3 aprovações em 19 casos altos). Relatório de 2 páginas bilíngue com layout fixo. | Internalizar, não inventar. O portão humano é **feature**. O cliente vê o que passou pelo portão — nunca o score cru. |
| **F9** | A URL do anexo do Ploomes (`stgploomescrmprd01.blob.core.windows.net/…`) responde **206 sem credencial, sem SAS, sem expiração** — testado em dois certificados. 31.660 anexos, 26,97 GB; 38% do volume é **e-mail** (`.msg`/`.eml`); o certificado de registro é o documento **pior arquivado** (59 cards em 5.048, sempre solto). | O Wallet **nunca** entrega essa URL ao navegador. Documento sai por endpoint autenticado com verificação de posse e log. Allowlist **positiva por documento**, nunca por campo. |
| **F10** | Nenhum artefato da casa documenta **um único dispositivo legal** de prazo (grep por `LPI`, `9.279`, `decenal`: zero). O que existe é **prática digitada**: oposição de marca dá **62 dias** em 19 de 19 cards contra a data da RPI, quando a skill de peças diz **60** (art. 158). 651 dos 709 `Prazo oficial` de cards abertos **já venceram** — é registro, não agenda. | Todo prazo carrega a régua inteira e a **firmeza** (`legal` · `praticado` · `estimado` · `informado`). O `Prazo oficial` do CRM **não** semeia a agenda. O *dies a quo* da oposição é pergunta para o Gui (§10). |

---

### As três fontes — e o papel de cada uma (não se misturam)

| fonte | o que dá | quando |
|---|---|---|
| **Base do INPI** (consulta ao registro) | **a carteira**: todo processo em que a Apex é procuradora, com dados cadastrais e datas | Sprint 1: planilha manual (base-mestra) · Sprint 3: **API do Breno, por procurador** |
| **RPI semanal** (XML) | **o que mudou**: despachos dos monitorados → eventos e prazos; publicações de terceiros → candidatas de colidência | Sprint 1B manual (upload) · Sprint 3 automático |
| **Planilha / certificado / declarado** | o que nenhuma base cobre (exterior sem API, DI, `ND`) | permanente |

### O que as skills do Codex (`referencias/codex-colidencias/`, 06/09) acrescentam

Pacote lido inteiro: 2 `SKILL.md`, `case.schema.json`, 5 scripts, logos e Poppins. É
**especificação de domínio + snapshot de código**, não backend pronto. O que muda aqui:

- **A base normalizada já tem o ciclo de vida** (`process{depositDate, concessionDate,
  vigencyEnd, renewalStart, renewalEnd…}`, `legalStatus{monitoringStatus,
  includedInWeeklyScreening, strongTerminal, reviewReasons[]}`, `classification{system, edition}`,
  `parties{titularRaw, procurador}`, `visualAsset{sha256, dHash64}`) → o `Ativo` do contrato ganha
  adaptador 1:1 (`CONTRATO-DADOS.md` §3).
- **Regra de contagem escrita** (skill §9.1): 1º dia contado = **primeiro dia útil após a
  publicação**, dias corridos, vencimento sem expediente prorroga, recesso forense não suspende;
  PAN conta da **concessão**, nunca do deferimento; retificação não reabre. Entra como
  `dies_a_quo: primeiro_dia_util_seguinte`, `firmeza: praticado` até o Gui confirmar.
- **Comparador v1.2.0 com parâmetros explícitos** (pesos 0,55/0,20/0,10/0,15; retenção; P0–P3;
  44 pares de afinidade; `same_owner` só por igualdade exata) → portado para TS no 1B com os
  **12 testes de regressão** da skill §14. ⚠️ **P0–P3 é fila de recuperação, não risco.**
- Caso com campos separados (`risk_level`, `confidence`, `analysis_status`, `actionability`,
  `recommend_send_to_client`, `approval_status`), IDs `C01…` persistidos, `Rodada` com estados
  `created → … → delivered`.
- **Renderer do parecer fica em Python/ReportLab** como serviço ao lado; o Wallet emite o
  `case` v1.1. Não se reescreve em TS no Sprint 1.
- Rotina nacional **terça 12h `America/Sao_Paulo`** é **configuração**, nunca constante.

## 3. Os sprints

> Definidos pelo Gui/Breno (`Projeto Internalização APOL.md`). Aqui só ganham definição de pronto,
> fronteira e o que a medição obriga. A ordem é a deles.

### Sprint 1 — Dashboard de Controle de Processo (portfólio ativo de clientes) ← **o MVP de front**

**Quem usa agora:** Gui e Márcio, **local**, para fazer manualmente o que já é feito. Sem cliente,
sem login, sem servidor. O Breno assume depois e leva para servidor novo.

**Stack (decisão do Breno, acatada):** React + **Next** (versão estável mais recente no dia do
scaffold — registrar no README) + TypeScript + Tailwind CSS, **banco no navegador**, projeto
rodando em `localhost`.

**Duas condições de projeto que preservam a decisão e evitam a reescrita:**

1. **O banco fica atrás de uma camada de repositório** (`PortfolioRepository`). Hoje a
   implementação é o navegador; amanhã é a API do Breno. A tela nunca fala com o armazenamento
   direto. Isso é a D1 do `PERGUNTAS-ABERTAS.md` com outra roupa: *código de dev = código de
   produção; muda a implementação, não a lógica*.
2. ⚠️ **`localStorage` não cabe na base que o Sprint 1 importa** — medido: a base-mestra
   normalizada tem **10,16 MB** contra cota típica de **5 MiB** (e o navegador guarda em UTF-16).
   Escrita que estoura no meio do laço deixa ~700 ativos gravados e ~840 não, sem erro visível.
   **Proposta: cumprir "banco no navegador" com IndexedDB** (mesmo espírito — zero servidor —
   cota de centenas de MB, transacional), atrás da mesma interface. Se o Breno preferir
   `localStorage`, a interface é a mesma; só a implementação muda — mas a cota tem de ser
   verificada antes de importar, e a importação tem de ser **atômica ou recusada**.

**Entrega 1A — o portfólio existe fora do APOL**

| capacidade | definição de pronto |
|---|---|
| **Importar planilha** | aceita a base-mestra (`Base_Processual_Apex_ATUAL.xlsx` / o `.json` normalizado) **e** a planilha canônica do contrato; **valida e recusa dizendo o motivo** — linha, coluna, valor; nunca `continue` silencioso. Aplica as 10 regras de ingestão do `LEIA-ME_EXECUTOR_SEMANAL.md` (bruto preservado ao lado do normalizado, `ND` separado de INPI, multiclasse desdobrado, edição da NCL preservada). Relatório de importação com contagens que **batem** com o arquivo de origem. |
| **Lista de ativos** | filtro por cliente, titular, parceiro, matéria, jurisdição, situação, `vigilancia.ativa`; busca por número e nome. Lista simples para cliente final (mediana **1** ativo, p90 = 4); busca com paginação só para parceiro/agente (p90 = 22, máx 90). |
| **Ficha do ativo** | identificadores (todos, com tipo e jurisdição), pessoas e papéis, classes/especificação, situação **com o evento que a produziu**, linha do tempo de eventos, prazos **com a régua e a firmeza visíveis**, documentos (referência, nunca conteúdo), histórico de serviços (vazio até a 1C), e o carimbo **por ativo**: `fonte`, `atualizado_em`, `proxima_verificacao`, `vigilancia.ativa` + motivo. |
| **Conciliação titular ↔ cliente ↔ parceiro ↔ agente** | tela onde Gui/Márcio atribuem e corrigem papéis, com trilha (quem, quando, de onde veio). É aqui que os 1.067 ativos hoje pendurados em agente ganham dono. |
| **Explicação do despacho** | tabela `código → título` vinda do próprio XML (76 códigos de patente, 64 de marca). A explicação curada e a versão contextualizada por IA vêm depois; a tabela é o gancho. |
| **Exportar** | o mesmo formato do contrato (JSON) — o que sai é o que entra. Prova de que o formato é fechado. |

**Entrega 1B — a RPI entra e o portfólio reage (acompanhamento manual)**

| capacidade | definição de pronto |
|---|---|
| **Importar RPI (XML de Marcas e de Patentes)** | upload do `RM####.zip` / `P####.zip`; parser **streaming em Web Worker** (o XML de Marcas descompactado tem **68 MB**; só o que casa com a carteira fica em memória); carimbo SHA-256, número, data e cobertura gravados no envelope; **idempotente por conteúdo**. PDF **nunca** (perde ~58% dos registros fora do 2.10 — regex exige `Código X.YY` com ponto; a 2904 tem `130`, `111`, `115`, `135`). Quando o XML faltar (aconteceu na 2904: 403 após 302), a degradação é **declarada** no envelope, nunca silenciosa. |
| **Despachos dos monitorados** | cada despacho da revista sobre um processo da carteira vira `Evento` (append-only, `evento_id` derivado do conteúdo). A situação do ativo é **reprojetada** a partir do último evento. |
| **Alerta de cadastro** | processo em nome da Apex (`procurador`, marcas) que aparece na revista e **não** está na carteira → aviso "cadastrar na base do INPI", **nunca** cadastro automático — a carteira nasce da base, não da revista. |
| **Prazos derivados** | para os despachos com régua conhecida, gera `Prazo` com `evento_base`, `regra`, `vence_em`, `prazo_interno_em` (= legal − 10 dias, prática medida) e `firmeza`. `dias_restantes` **não existe no arquivo**: calcula-se na tela com `hoje` explícito. |
| **Triagem mecânica de colidência** (candidatas) | para as publicações **de terceiros** com código de oposição (`I009`, `I421`, `I756`, `I757`) e PAN (`IPAS158`, `IPAS770`, `IPAS403`): **porte do comparador v1.2.0 para TS** — `combinado = 0,55·nominativo + 0,20·fonético + 0,10·classe + 0,15·especificação`; retenção nominativo ≥75 ou ≥66 com fonético ≥75 (marca ≤3 chars: ≥90 e ≥85); `affinity = max(classe, especificação)`; fila **P0/P1/P2/P3** (≥88 · ≥80 · ≥70 · resto, com as vias de identidade); 44 pares de afinidade de classe; `MARK_WEAK_TOKENS`; coalescência `c.r.i.a.r.`→`CRIAR`; `same_owner` **só por igualdade exata**; separação da própria carteira; limites de índice **contados e declarados**. Sai uma **lista de revisão** com os campos do caso (`risk_level`, `confidence`, `analysis_status`, `actionability`, `recommend_send_to_client`, `approval_status`; IDs `C01…` persistidos) e uma `Rodada` com estados. ⛔ **Fora do MVP:** a análise técnico-jurídica (é juízo — IA + humano, etapa seguinte), o renderer do parecer (Python ao lado; o Wallet emite o `case` v1.1) e a via visual (dHash/pHash + CFE; snapshot incompleto). Os slots existem; o motor de juízo não. |
| **Portão humano** | nada é marcado "enviar ao cliente" sem decisão humana registrada. É o comportamento medido do método vivo (RPI 2903: 6 altos, **zero** aprovados). |

**Entrega 1C — o histórico de serviços por ativo (Ploomes como histórico)**

Casa card ↔ ativo pelo número do processo extraído do **título** (4 gramáticas medidas; N:N).
Entra por exportação do Ploomes (arquivo) no MVP; por sync na fase 2. Valor no pacote do cliente **só
com procedência documental** — `nota_fiscal`, `cobranca` ou `declarado`; `order_amount` nunca,
porque é o campo do CRM e card espelhado repete o valor do irmão (§5). E `papel_na_conta` impede
a soma dupla proposta × derivado: o cliente pagou **uma** vez, na proposta, e quem soma é o
**derivado**, porque é ele que sabe a qual ativo o dinheiro pertence.
⚠️ 42,98% dos cards **não têm** número em lugar nenhum — o histórico nasce parcial e
**diz** que é parcial (`completude.servicos=false` + motivo).

### Sprint 2 — Comunicações (e-mail + WhatsApp)

Comunicados oficiais, modernos, bilíngues, disparados por **evento do ativo**: despacho publicado,
prazo abrindo, retribuição/prorrogação, revista lida. A referência técnica é a carta do APOL
(única sobrevivente: `.msg` de 12/07/2022, despacho `I235`) — **absorver a anatomia, não o texto**:
`{rpi, data, código, título, processo, marca, classe, titular, país, imagem, corpo, chamada}`.

- A biblioteca de textos começa em **1 de 64/76 códigos**. Cada código de despacho = um texto
  curado (PT/EN). É o item de maior alavancagem do sprint.
- **Gatilho de anuidade e prorrogação não existe em fonte nenhuma da casa** (F1, F10). Ele nasce
  no Sprint 1 como `Prazo` com `firmeza: estimado` até a régua ser confirmada pelo Gui.
- Canal: **um motor de envio**, no lado interno, consumindo uma **caixa de saída** do Wallet — §7.
- ⚠️ A imagem da marca **não está no XML** (0 em 54,6 MB). Vem do PDF por extração dirigida (o
  método vivo já faz: 1.828 sinais em 1.569 páginas na RPI 2903) ou do upload. O comunicado tem de
  funcionar **sem** imagem.

### Sprint 3 — Base própria + INPI + internacionais + buscas (com o Breno)

**Fronteira**: o front do Sprint 1 **assume** que vai existir e **nunca calcula** — detalhado em
`ONBOARDING-BRENO.md` §4 e `CONTRATO-DADOS.md` §14. Ordem dimensionada pela carteira real, não
pelo tamanho do escritório:

| ordem | fonte | cobre | caminho | veredito |
|---|---|---|---|---|
| 1º | **INPI BR — consulta ao registro por procurador** = **a carteira** (marcas + patentes) | **1.951 de 2.225** pares card×país (87,7%) | consulta pública (HTML com sessão), sem termo proibitivo encontrado — **é o "scraping" do Breno**; sem SLA: vigia que avise quando quebrar | 🟢 — é o que substitui a exportação manual do Webseek |
| 2º | **INPI BR — XML semanal da RPI** = eventos dos monitorados + colidências | os mesmos 87,7% | bulk público, sem chave | 🟢 — o 1B já faz manual; aqui vira automático |
| 3º | **EPO OPS** | patentes de 100+ escritórios (UE, CN, JP, KR, IN) | OAuth2, 4 GB/semana grátis | 🟢 |
| 4º | **EUIPO** (42) · **USPTO** (57) | ~100 ativos | OAuth2 / API key | 🟢 |
| — | **WIPO / Madri / Global Brand Database** | 19 + 939 pontes | ⛔ termos **proíbem por escrito** "automated queries" e "web scraping"; `Disallow: /`; altcha em toda rota | 🔴 **não construir**. Único caminho legítimo é o feed pago |
| — | **CNIPA** | 22 + 71 agentes | HTTP 412, sem API | 🔴 upload/certificado do agente |
| — | **LATAM, 21 escritórios** | **148** (2º maior bloco) | não sondados | 🔴 presumir manual até prova |
| — | **DI brasileiro** | 66 | só PDF | 🔴 upload, `vigilancia.ativa=false` |

**270 de 2.225 cards (12,13%) + os 66 DI não têm origem automatizável.** O upload manual é
**permanente** para eles, não andaime. Buscas (substituir o Webseek) = a base própria de marcas
acumulada revista a revista (37 mil processos por edição).

### Sprint 4 — Extranet OpenIpWorld (cliente final + parceiros)

**Gatilho: o primeiro socket público** = o dia de mudar de máquina (D1). Nasce com: autenticação
**no servidor**, sessão revogável, bcrypt ≥ 12, uma identidade por segredo, projeção por
**lista branca executável**, log de acesso, allowlist de rotas com 404 no resto. As 10 regras estão
no `CLAUDE.md` §5, cada uma com o incidente da casa que a justifica.

- **Cliente final** (foco): grande porte com gerentes/diretores acompanhando. Régua da casa para
  "recorrente": **19 aptos** (R$ 276.964,00 nos 12m); por porte ≥ R$ 50k: **8** (4 frios). O Gui
  escolhe a régua (§10).
- **Parceiro** (visão à parte, menor escala): §6.
- Convite por e-mail alcança **337 de 385** clientes (87,53%); **26** têm e-mail compartilhado
  entre entidades distintas → **segundo fator obrigatório** para esses. ⚠️ Os JSONs do BI têm
  **zero** e-mails — o convite puxa do Ploomes.

### Posterior — E-renewal (Stripe + GRU)

Fora do foco, **mas o Sprint 1 nasce pronto para ele**: anuidade e prorrogação como `Prazo` de
primeira classe; a GRU tem **pelo menos 6 códigos** de anuidade (220 · 224 · 226 · 228 · 240 ·
221/225 extraordinário) e o 374 de prorrogação — "anuidade" nunca é código único. Dois fluxos que
não se misturam: a GRU se gera no INPI (PagTesouro); o Stripe cobra o cliente. Stripe já tem 2
contas (LLC, IP) ligadas ao painel financeiro, **zeradas** e só leitura — infraestrutura pronta,
histórico nenhum.

---

## 4. As entidades — e por que são estas

| entidade | por que existe separada | fato que força |
|---|---|---|
| **Pessoa** | titular, cliente, parceiro, agente e procurador são a mesma tabela com papéis diferentes; há contatos que são cliente MP, cliente IP, IPartner **e** correspondente ao mesmo tempo | F4 |
| **Ativo** | o identificador muda (pedido → registro; PCT → fase nacional) e 17,86% ainda não têm número | F5, F6 |
| **Vínculo** (pessoa × ativo × papel × vigência) | papel é da relação, não da pessoa; um `contact_id` tem até 4 carteiras candidatas | F4 |
| **Evento** | o despacho é fato datado e imutável; "situação" é opinião derivada | F2, F8 |
| **Prazo** | derivado de evento por régua nomeada, com firmeza; errar é perda de direito | F10 |
| **Documento** | referência com dono e allowlist; nunca URL do blob | F9 |
| **Serviço** (histórico) | card do Ploomes pendurado no ativo por número extraído do título; N:N | F1, F5 |
| **Colidência** | candidata → parecer → decisão → relatório; o portão é estado | F8 |

Contrato completo, com exemplo e tipos: [`CONTRATO-DADOS.md`](CONTRATO-DADOS.md).

### As cinco decisões estruturais (e a medição que força cada uma)

1. **`ativo_id` é ULID, emitido por quem cria o registro, opaco, imutável.** A API do Breno **aceita
   o id vindo do cliente** na criação — assim a conciliação feita no MVP casa com o dado dele sem
   recasar por nome (chave proibida) ou número (ausente em 17,86%).
2. **`identificadores[]` é lista** com `tipo`, `valor_bruto`, `valor_normalizado`, `jurisdicao`,
   `desde`, `ate`, `fonte`. O mesmo campo do CRM guarda hoje `BR102021000102-0`, `912000101`,
   `PCT/CN2022/000101`, `29/000,101` e `EP3000101`.
3. **`eventos[]` é append-only e `evento_id` deriva do conteúdo**
   (`jurisdicao + processo + codigo + data_publicacao + revista`), nunca da posição. Manual e
   varredura retroativa da mesma revista produzem o **mesmo** id → viram duas *observações* do
   mesmo evento, não dois eventos. Republicação corrigida não cria órfão.
4. **`Prazo` carrega a régua inteira**: `regra.id`, `fundamento`, `dias`, `contagem`,
   `dies_a_quo`, `ajuste_dia_nao_util`, `calendario`, `firmeza`, `evento_base`. O front lê
   `vence_em`; **nunca soma dias**.
5. **`dias_restantes` não existe no arquivo.** Grava-se `vence_em`; o número nasce na leitura com
   `hoje` explícito. Agregado gravado cedo apodrece — cicatriz registrada da casa.

E três campos que a segunda medição obrigou: **`fonte`** em todo ativo e evento (valores fechados);
**`vigilancia.ativa`** por ativo com `motivo` quando falso; **`atualizado_em` + `proxima_verificacao`
por ativo**, nunca carimbo global de rodapé — o Brasil atualiza toda semana, a China só quando
alguém digita.

---

## 5. O que o cliente NÃO vê — exclusões deliberadas do pacote

| excluído | por quê (medido) |
|---|---|
| **Valor de serviço de procedência `order_amount`** | Exclusão **qualificada em 07/09/2026**: o valor passou a ir ao cliente, mas **só com procedência documental** — `nota_fiscal`, `cobranca`, `declarado` (`ORIGENS_DE_VALOR_PUBLICAVEIS`, em `src/projecao/cliente.ts`). O que fica de fora é o `order_amount`: é o `Deal.Amount` do card, e infla o nacional em **R$ 145.153,79** porque card espelhado repete o valor do irmão (SEGUE: 39 cards, 26 "ganhos", **6** vendas reais). A soma dupla proposta × derivado é barrada por `papel_na_conta`: só `derivado` e `avulso` somam, `indefinido` **não** — total menor e certo vale mais que maior e errado, e a tela conta quantos ficaram de fora. |
| **Consumo de saldo pré-pago como cobrança** | `ObjectValueId 500420404` é excluído em 5 lugares do código vivo; sem o conceito, o retainer de um correspondente mostraria US$ 12.061,00 contra US$ 10.000,00 pagos. |
| **Score cru de colidência** | o combinado não decide (Verin × Vaerin); publicar score é publicar falso positivo e destruir o portão. O cliente vê **candidata com parecer aprovado**. |
| **Nome do agente correspondente e notas internas** | desintermediação e processo interno. "Não pode ver" = **não está no arquivo**, nunca "está com flag". |
| **Documento por URL do blob** | F9. |
| **CPF de co-titular pessoa física que não é o logado** | LGPD. A projeção é por lista branca **executável**; a lista está no `CONTRATO-DADOS.md` §11. |
| **Fatura de agente e e-mails** | `03 - FATURA DO AGENTE` é pasta irmã de `08 - CERTIFICADO DE REGISTRO`; 38% dos anexos são `.msg`/`.eml`. Compartilhar pasta do Drive **não é opção**. |

---

## 6. O parceiro (IPartners e agentes) — o modelo

**O que o Gui propôs:** o parceiro vê o que contratou, que é dos clientes dele; as vendas no Ploomes
estão no nome do parceiro; dentro do login dele, uma subdivisão com os clientes dele — histórico,
contratos, procurações, pagamentos, status.

**O que a medição mostra:** 76 parceiros distintos por `ContactId` nos 461 cards IPartners, e
**72 de 76 (94,74%) têm zero cliente final nomeado**. 25 IPartners na carteira MP, **11 quentes**.
No exterior, **121 de 121** clientes da APEX IP são agentes; 22 são bilaterais (mandam e recebem
trabalho). Um `contact_id` → até quatro carteiras candidatas.

**Recomendação (para o Gui decidir):**

1. **O modelo de vínculos já resolve sem tabela nova.** Parceiro é `Pessoa` com papel `parceiro`
   no ativo; o cliente final dele é `Pessoa` com papel `titular` e um campo `gerido_por` apontando
   para o parceiro. A "subdivisão" do login é a lista das pessoas com `gerido_por = ele`.
2. **O parceiro cadastra e corrige os próprios clientes finais (Sprint 4), com trilha.** Hoje o dado
   não existe (94,74%); quem sabe quem é o titular é o parceiro. Self-service tira da Apex um
   cadastro que ela não tem como fazer.
3. **Escopo do que ele vê:** ativos onde ele é `parceiro` ou `agente` **e** o titular é cliente dele.
   Ativos bilaterais (ele manda e recebe) têm **duas visões separadas** — `inbound` e `outbound` —
   nunca uma lista só.
4. **Pagamentos: não; valor, só com procedência documental.** O parceiro passa pela **mesma**
   projeção do cliente — `projetarParaCliente` alcança as pessoas com `gerido_por` apontando para
   ele — então vale a regra de 07/09 (§5): `nota_fiscal`, `cobranca` e `declarado` atravessam,
   `order_amount` não. Situação de pagamento — o que foi quitado, quando — continua fora: não
   está no arquivo. Status de serviço, documentos com allowlist (procuração, certificado),
   histórico: sim.
5. **Prioridade:** cliente final primeiro (foco declarado). O parceiro é uma projeção diferente do
   **mesmo** modelo — por isso o modelo nasce certo no Sprint 1 mesmo que a tela dele só exista no
   Sprint 4.

---

## 7. Comunicações e WhatsApp — uma decisão que serve a três produtos

**O que o Gui quer:** CSAT/NPS com o nome/foto dele (BI); pushes de despacho e prazo do portfólio
(Wallet) com nome de assistente ou institucional, indeciso; um **assistente SDR** para atendimento
inicial das conversões de tráfego (fins de semana, depois das 18h), que pode marcar reunião na
agenda do consultor por matéria, com o consultor podendo intervir (BI). Todos por API. Dúvida:
mesmo número? qual simula a foto dele? qual precisa ser formal? qual pode ter "avatar"?

**O que está medido:** a WABA **não existe** (zero workflows, zero provedor de e-mail
transacional). O que existe é o guia `G1-WABA-passo-a-passo.md` (Meta Cloud API direto, número
Vono R$ 29,90/mês, verificação por voz) e três decisões de 08/08: manter o widget da RD, o 63
pessoal fica fora, não criar BM novo. Os passos 0–4 são **físicos do Gui** (3–10 dias úteis) e a
verificação da empresa é **por CNPJ, uma vez**. A Apex já pagou mensageria (Neppo, R$ 630,00/mês)
e cortou em mar/2026. ⚠️ A linha `mp|2.06.92` "Taxa de Mensageria e Whatsapp" do DRE é **taxa do
Asaas** (700 títulos, R$ 507,44) — não é canal.

**Decisão — "De acordo" do Gui em 06/09 — infraestrutura compartilhada, personas separadas:**

| peça | decisão | por quê |
|---|---|---|
| **Business Manager + verificação** | **uma**, a existente | é por CNPJ; o guia proíbe BM novo (atrito, recusa de até 14 dias) |
| **WABA** | **uma** | token, webhook, biblioteca de templates, cartão PJ — uma vez |
| **Números** | **três, na mesma WABA**, cada um com nome de exibição, foto e propósito próprios | a **nota de qualidade** e o status *Flagged* são **por número e por template** (desde 07/10/2025 o **limite de envio** é por portfólio, compartilhado — irrelevante no nosso volume): um bloqueio em pesquisa não derruba a qualidade do aviso de prazo; opt-out de um não apaga o outro; persona clara. ⚠️ Portfólio novo começa com **2 números**; o 3º exige pedido de aumento após a verificação |
| ① `Guilherme · Apex IP` | CSAT, NPS, relacionamento pós-venda — foto dele, voz pessoal (BI) | pessoalidade onde ela vende |
| ② `Apex Propriedade Intelectual` | despachos, prazos, comunicados do portfólio — institucional, formal, logo (Wallet). **Push-only**: o WhatsApp não permite desligar o recebimento, então uma **auto-resposta** redireciona ("veja no Wallet [link]; para falar com seu consultor, [contato]") e a caixa é monitorada só para exceção | é obrigação contratual, não conversa; o cliente precisa reconhecer a fonte oficial; quem tem app (iFood, Nubank) faz exatamente isso |
| ③ `Assistente Apex` | SDR inbound das conversões de tráfego e do número — **declarado assistente**, com passagem para humano (BI) | ⚠️ **não usar nome de funcionário fictício**: a política da Meta exige caminho claro para um humano e transparência sobre automação; e "descobrir que era bot com nome de gente" custa confiança |
| **Motor de envio** | **um só, no lado interno** (n8n), com o token da WABA e do e-mail transacional | regra 8 da fronteira: nenhuma credencial de sistema interno do lado que atende a internet |
| **Wallet → cliente** | o backend do Wallet grava numa **caixa de saída** (`Comunicado` com destinatário, template, variáveis, idioma); o motor interno consome pela Tailscale e envia; o resultado volta como `Evento` do ativo | o Wallet nunca segura o token; a trilha de envio fica no ativo |
| **Opt-in** | **três flags** no Ploomes/Pessoa, uma por propósito (pesquisa · portfólio · atendimento) | "SAIR" das pesquisas **não** pode calar o aviso de prazo — utility contratual |
| **Aba Mensageria do BI** | painel de **todos** os disparos, dos três números | já desenhada assim no briefing da Frente 3 |

**Onde cada coisa mora:** a WABA, o motor, a Mensageria e os números ① e ③ são do **BI** (pasta
`DASHBOARD BI APEX`, sem acesso do Breno). O Wallet **produz** comunicados e **consome** o
resultado. A persona por número muda sem mexer em nada além do cadastro na Meta.

**Quando:** a WABA se registra na **Frente 3 (CSAT/NPS), no BI, depois do commit do Wallet**. O
SDR ainda não começou; o ② entra em produção quando o Breno fechar o Sprint 3. O que o Wallet
precisa **agora** é só o contrato de `Comunicado`. ⏰ O domínio recomendado para a verificação
(`apexpi.com.br`) **expira em 07/10/2026**.

**Benchmark (06/09, fontes no plano aprovado):** os grandes bancos brasileiros separam números
**por finalidade** — Santander tem três oficiais (geral, Financiamentos, Esfera), Itaú dois
(conta/cartão, renegociação); o bot é sempre **assistente declarado com nome próprio** (BIA do
Bradesco, Lu do Magalu) com passagem a humano; quem tem app (iFood, Nubank) **não conversa** por
WhatsApp — direciona ao app. A Meta exige "prompt, clear, and direct escalation paths" para humano
quando há automação; "feedback surveys" são categoria *utility*; pesquisa com oferta vira
*marketing*; utility dentro da janela de 24h é grátis desde 01/07/2025. A rotina nacional de
colidências (terça 12h) e a hora de qualquer disparo são **configuração**, nunca constante.

---

## 8. Definição de pronto — quando desligar APOL e Webseek

Os dois contratos só são cancelados quando, **medido**:

1. **Portfólio:** todo ativo da base-mestra (1.540) está no Wallet com titular, identificadores e
   situação; a régua 1.540 → 429 está **escrita** e a tela diz quem é vigiado e quem não é.
2. **Vigilância:** a RPI de Marcas **e** de Patentes é lida toda semana pelo Sprint 3 (ou pelo
   1B manualmente, por um ciclo inteiro), com aviso quando **não** roda — o Papi ficou 9 dias em
   silêncio quando o INPI mudou um header.
3. **Comunicação:** o Sprint 2 emite o comunicado de despacho para os códigos que a casa opera,
   conferido contra o que o APOL emitiria, por **4 revistas** seguidas.
4. **Busca (Webseek):** a base própria responde à busca de anterioridade que a casa faz hoje, e a
   base-mestra passa a ser alimentada pelo Wallet, não pela exportação manual.
5. **Prazos:** os prazos que o escritório opera saem do Wallet com régua e firmeza declaradas, e
   foram conferidos contra a planilha por um ciclo.
6. **Backup restaurado**, não só gerado.

⛔ Enquanto 2 e 3 não valerem, o APOL fica. Enquanto 4 não valer, o Webseek fica.

---

## 9. Riscos nomeados

| # | risco | evidência | peso |
|---|---|---|---|
| R1 | **Dependência circular do Webseek**: a base-mestra nasce de uma exportação manual dele, feita à mão numa máquina da casa — o fornecedor que o Sprint 3 mata | `relatorio_ingestao_<lote>_2026-09-03.json` | 🔴 |
| R2 | **Fonte única sem contrato**: o XML do INPI não tem SLA, versionamento nem changelog; já quebrou por header `Accept` e ninguém avisou por 9 dias | Papi, 01/09 | 🔴 |
| R3 | **Prazo errado exibido ao cliente**: dies a quo não escrito, 62 × 60 dias, anuidade sem régua | F10 | 🔴 |
| R4 | **Silêncio do mecanismo** = perda de direito. O Papi herda `if not match: continue` | `pct_pipeline.py:361` | 🔴 |
| R5 | **Desligar o APOL antes do motor de cartas** apaga a única comunicação automática da casa | F9 dossiê cartas | 🔴 |
| R6 | **Colidência publicada antes do portão** transforma decisão de não agir em cobrança do cliente | RPI 2903: 6 altos, 0 aprovados | 🔴 |
| R7 | **12,13% da carteira + DI sem origem automatizável** e sem estado que diga isso | F3, Sprint 3 | 🟠 |
| R8 | **Titular anônimo** em 61,54% / 75,71% dos casos titular ≠ cliente | F4 | 🟠 |
| R9 | **Imagem da marca** não está no XML; vem do PDF ou do upload | F2 | 🟠 |
| R10 | **Automação sem operador**: o Papi importa todo dia e a fila tem 1 interação em 80 dias; o aviso que ele escreve não é lido por nenhum dos 31 workflows | Papi | 🟠 |
| R11 | **Segredos em claro no repo do BI**: chave do Ploomes num snapshot **versionado**; JWT do n8n no `.codex/` untracked e não ignorado | conferido 06/09 | 🔴 (do BI, mas o Wallet não pode herdar por cópia de diretório) |

---

## 10. O que falta decidir — dono marcado

### Bloqueia o Sprint 1

- [ ] **Gui** — a **política única de elegibilidade** (1.540 → 429): a skill mostra que hoje são
      duas — `includedInWeeklyScreening`/`strongTerminal` no normalizador **e** um filtro extra da
      carga piloto. O Wallet precisa de uma, escrita. Sem ela, o painel mente sobre 1.111 ativos.
- [ ] **Gui** — **confirmar** a regra de contagem da skill §9.1 (1º dia útil após a publicação,
      dias corridos, vencimento sem expediente prorroga) como `firmeza: legal`. Hoje entra como
      `praticado` — é o que não produz 62 dias — a casa pratica **60 dias** — o "62" que aparecia aqui era artefato de medição, porque as datas de RPI foram derivadas de uma âncora (RPI 2824 + 7 dias por revista), e a diferença era do cálculo, não do escritório. Corrigido pelo Gui em 07/09/2026: **prazo administrativo é 60 dias, ou 30 — 62 não existe** medidos contra a data da RPI.
- [ ] **Gui** — **anuidade e prorrogação**: a base normalizada já traz `renewalStart/End` e
      `vigencyEnd` por processo; falta a régua para os que **não** vieram com data (entram como
      `firmeza: estimado` com aviso visível).
- [ ] **Gui/Breno** — **IndexedDB** como implementação do "banco no navegador" (§3, Sprint 1).
      Construo com ele por padrão; trocar é só a implementação.
- [ ] **Gui** — a base-mestra normalizada **é** a 1ª carga e o formato canônico de upload?
      (recomendo que sim — 1.540 linhas curadas, regras escritas, datas de vigência já dentro).

### Bloqueia o Sprint 2

- [ ] **Gui** — o de-para **código de despacho → texto** que o APOL usa (exportável?). Sem ele o
      motor nasce com 1 template.
- [ ] **Gui** — as personas dos três números (§7) e a decisão de tratar a WABA como infra do BI
      compartilhada.

### Bloqueia o Sprint 3 (Breno)

- [ ] **Breno** — a API é fonte de **documento** (lote datado) ou de **estado** (CRUD)? Muda a
      chave de idempotência. O contrato prevê os dois; ele escolhe e registra.
- [ ] **Breno** — endpoint de emissão/aceite de `ativo_id` (ULID) desde o dia 1.
- [ ] **Breno** — confirmar que o scraping **não** mira WIPO/Madri/GBD/CNIPA (termos proíbem).

### Bloqueia o Sprint 4

- [ ] **Gui** — a régua de "grande porte recorrente": 19 aptos, 8 por porte, ou 9 porte+aquecimento?
- [ ] **Gui/Breno** — provedor de autenticação pronto ou construído?
- [ ] **Gui** — LGPD: responsável formal; retenção; log de acesso. Bloco 4 do `PERGUNTAS-ABERTAS.md`.

### Já respondido (sai das perguntas abertas quando o Gui confirmar por escrito)

- ✅ Chave de reconciliação de **cliente**: documento (CNPJ/CPF) — 0 colisões em 1.567, 100% no MP.
  ⚠️ Cobre o cliente, **não** o titular (37,76% / 0,00%) — por isso `Pessoa` tem `documentos[]`
  opcional e a conciliação é tela.
- ✅ PF × PJ pelo `TypeId` — 0 contradições em 1.567.
- ✅ Login por e-mail: 337/385; 26 exigem segundo fator.
- ✅ Repo: `rogerinkingcode`, privado, tudo. Skills com material da casa entram como documentação de
  domínio **sem** dado real de cliente.

---

## 11. Próximos passos, na ordem

1. ✅ **Plano aprovado** (06/09).
2. ✅ **Entrega 1A** — scaffold Next + contrato executável + repositório + importador + lista +
   ficha + conciliação + prazos + exportação com auditoria, rodando em `localhost` com dados
   fictícios. 106 testes, 0 erro de console.
3. ⬜ **Gui vê em `localhost`** e diz o que muda.
4. ⬜ **Entrega 1B** — RPI → eventos próprios + prazos + triagem de candidatas com portão humano.
   Depende de: os JSONs `RPI_290x_*` para conferir contra uma rodada real.
5. ⬜ `git init` + primeiro commit no repo novo, **só com o "pode commitar"** — `.gitignore` e
   dados de exemplo fictícios já estão na pasta, conferidos sem segredo.
6. ⬜ Breno recebe o clone com `ONBOARDING-BRENO.md`.
7. ⬜ Entrega 1C (histórico do Ploomes) e Sprint 2 (comunicações).
8. ⬜ **Frente 3 do BI** (CSAT/NPS/WABA) — onde a WABA se registra — e a fila salva.

### O que trava cada um (respostas em `PERGUNTAS-ABERTAS.md`)

| passo | precisa de |
|---|---|
| 1B | os JSONs de processamento das RPIs 2902–2904, para conferir contra rodada real |
| carga real | `Base_Processual_Apex_Normalizada.json` (fica na tua máquina, não no repo) |
| prazos `legal` | tua confirmação da régua de contagem da skill §9.1 |
| a régua dos 429 | a política única de elegibilidade, escrita |
| Sprint 2 | o de-para código de despacho → texto que hoje mora no APOL |
| Sprint 3 | as 3 respostas do Breno (documento × estado · aceita ULID do cliente · dono de campo) |
