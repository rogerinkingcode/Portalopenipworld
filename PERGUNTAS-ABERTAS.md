# OpenIpWorld (IPAW / IPWALLET) — perguntas em aberto

> **Leia isto antes de escrever a primeira linha de código.**
>
> Este arquivo existe porque decisão de arquitetura tomada por omissão é a mais cara de desfazer.
> Quem clonar este repo recebe as **perguntas**, não só as respostas.
>
> **Como usar:** pergunta que vira decisão **sai daqui** e entra na tabela DECIDIDAS abaixo (e no
> `CLAUDE.md` §2), com **data e autor**. Pergunta nova entra **aqui**, não numa conversa. Pergunta
> **sem dono** não é respondida — só adiada. **Se este arquivo não encolhe, o projeto anda com
> dívida.**
>
> Atualizado em **06/09/2026**, depois de duas rodadas de medição (evidência em
> [`docs/MEDICOES-2026-09.md`](docs/MEDICOES-2026-09.md)) e das respostas do Gui.

---

## ✅ DECIDIDAS

| # | decisão | data · autor |
|---|---|---|
| **D1** | O MVP roda **local, sem servidor** (nem a VPS interna). O dev sobe para servidor **novo e separado** quando houver cliente. Gatilho: **o primeiro socket público**, não o código. Consequência desde a 1ª linha: nada de caminho absoluto de disco; todo acesso a dado por `fetch` de URL em variável de ambiente, ou pelo `PortfolioRepository` | 05/09 · Gui |
| **D2** | Stack: **React + Next** (versão estável mais recente no scaffold, registrada no README) + **TypeScript** + **Tailwind**, banco **no navegador**, rodando em `localhost`. Front moderno e responsivo, porque é aplicação web com acesso de cliente — diferente do BI, que é HTML/CSS e já serve internamente | 06/09 · Breno via Gui |
| **D3** | **Não se usa nada do APOL.** Estrutura própria, sem migração de código ou base | 06/09 · Gui |
| **D4** | Entrada inicial por **planilha** (upload); automação depois. O upload é **entrada de primeira classe e permanente** — 12,13% da carteira não tem origem automatizável | 06/09 · Gui |
| **D5** | O **Ploomes é histórico de contratação** (propostas, contratos, serviços por ativo). **Nunca** fonte do ativo nem do acompanhamento | 06/09 · Gui |
| **D6** | Operação ADM (substituir o funil de serviços, Petições IA) está **fora** deste escopo — é segundo momento e é interno, não toca o cliente | 06/09 · Gui |
| **D7** | Sprints: **1** Portfólio (MVP de front) · **2** Comunicações · **3** Base/INPI/internacionais/buscas (**Breno**) · **4** Extranet · posterior **E-renewal** | 06/09 · Gui/Breno |
| **D8** | Repo **privado em `rogerinkingcode`**, tudo. Commit só após aprovação do plano e início do primeiro entregável | 06/09 · Gui |
| **D9** | Quem opera o Sprint 1: **Gui e Márcio**, manual, em `localhost`. O Breno trabalha no clone e assume depois | 06/09 · Gui |
| **D10** | Foco do Sprint 4: **cliente final de grande porte** (gerentes e diretores acompanhando). O **parceiro** é visão à parte, adaptada, no primeiro momento — hoje funciona bem por e-mail | 06/09 · Gui |
| **D11** | **A carteira vem da base do INPI** (manual por planilha; depois automática **por procurador** via API do Breno). **A revista traz só o que mudou**: despachos dos monitorados e colidências com publicações de terceiros. Processo em nosso nome na RPI que não está na carteira vira **alerta de cadastro**, nunca cadastro automático | 06/09 · Gui |
| **D12** | **WhatsApp: 1 Business Manager (o existente) + 1 WABA + 3 números por finalidade** — ① `Guilherme · Apex IP` (CSAT/NPS, foto dele) · ② `Apex Propriedade Intelectual` (pushes do portfólio, **push-only** com auto-resposta que redireciona ao Wallet ou ao consultor) · ③ `Assistente Apex` (SDR, **declarado assistente**, sem funcionário fictício, handoff no mesmo número). Motor de envio **único, no BI/n8n**; o Wallet grava `Comunicado` na caixa de saída e **nunca vê o token**. **3 flags de opt-in** (pesquisa · portfólio · atendimento). Registro só na **Frente 3 (CSAT/NPS), no BI**, depois do commit do Wallet | 06/09 · Gui |
| **D13** | As skills do Codex (`referencias/codex-colidencias/`) são **especificação de domínio**: o comparador v1.2.0 é portado para TS com os 12 testes de regressão; o **renderer do parecer fica em Python/ReportLab** como serviço ao lado, e o Wallet emite o `case` v1.1 | 06/09 · Gui via skills |

### Respondidas pela medição (confirmar por escrito quando conveniente)

| pergunta | resposta medida |
|---|---|
| Qual a chave de reconciliação de **cliente**? | O **documento (CNPJ/CPF)** — **0 colisões em 1.567** registros, **100,00%** de cobertura na carteira nacional. ⚠️ Não serve para o estrangeiro (1,65%) nem para o **titular** (37,76% nac / 0,00% ext) — por isso a conciliação é tela, não algoritmo |
| Como distinguir PF de PJ? | `Contact.TypeId` — **0 contradições em 1.567**. Heurística de nome perderia **202 PJ** |
| Quantos clientes podem receber convite? | **337 de 385 (87,53%)** com endereço único e não compartilhado. **26** têm e-mail compartilhado → **segundo fator obrigatório**. ⚠️ Os JSONs do BI têm **zero** e-mails: o convite obriga a puxar do Ploomes |
| A extranet pode nascer no Sprint 1? | **Não.** Servidor estático não tem sessão nem autorização, só caminho — o recorte viraria nome de arquivo e pedir o `118` devolveria a carteira do vizinho (é a cicatriz do `.bak` de 12/08/2026). Sprint 1 é **ferramenta interna**; extranet é Sprint 4 |
| Dá para semear o portfólio do Ploomes? | **Não.** 0 de 488 campos de ciclo de vida; `Processo/ND no Apol` em **0 de 6.350**. O Ploomes entrega **histórico**, o INPI entrega **o ativo** |

---

## 1. Política única de elegibilidade — a régua 1.540 → 429

**Status: 🔴 BLOQUEIA O SPRINT 1. Dono: Gui.**

A base-mestra tem **1.540 registros**; o cruzamento semanal usa **429** "famílias monitoráveis". A
skill do Codex mostra **onde** a régua mora — `legalStatus.includedInWeeklyScreening` +
`strongTerminal` no normalizador — **mais** um filtro próprio aplicado na carga piloto (excluir
indeferidos, evitar duplicidades). A própria skill diz: *"unificar a política de elegibilidade na
aplicação"*. **Hoje são duas políticas e nenhuma está escrita.**

- [ ] **Gui** — qual é a regra única? O que entra no cruzamento e o que não entra, e por quê.
- [ ] **Gui** — a exclusão de indeferidos é regra **comercial daquele lote** ou regra permanente? A
      skill alerta: *"não transformar essa escolha em regra jurídica universal"*.
- [ ] o contrato prevê `vigilancia.elegivel` + `motivos[]` para tornar isso auditável por ativo.

> **Por que importa:** sem a régua escrita, o painel lista 1.540 ativos com o mesmo selo e 1.111
> deles **não estão sendo lidos contra a RPI** — e ninguém consegue dizer quais. Quando um despacho
> passar batido, não haverá como provar se foi falha do mecanismo ou se o ativo nunca esteve na
> lista.

---

## 2. A régua de contagem de prazo

**Status: 🟡 PARCIALMENTE RESPONDIDA pela skill; falta o Gui confirmar. Dono: Gui.**

A skill §9.1 escreve a regra ordinária: **1º dia contado = primeiro dia útil após a publicação**;
dias corridos; vencimento sem expediente prorroga; recesso forense **não** suspende procedimento
administrativo; **PAN conta da concessão/expedição do certificado, nunca do deferimento**;
retificação não presume reabertura; ação judicial de nulidade é o art. **174** (não 173).

Isso explica o que se mediu como "62 dias" — e a casa pratica **60 dias** — o "62" que aparecia aqui era artefato de medição, porque as datas de RPI foram derivadas de uma âncora (RPI 2824 + 7 dias por revista), e a diferença era do cálculo, não do escritório. Corrigido pelo Gui em 07/09/2026: **prazo administrativo é 60 dias, ou 30 — 62 não existe**.

- [ ] **Gui** — confirma essa regra como `firmeza: legal`? Hoje entra como `praticado`, com a
      diferença visível na tela.
- [ ] **Gui** — o **prazo interno** (medido: legal − 10 dias em 5 pares) é fixo ou varia por tipo?
      No contrato ele é **configuração**, não lei.

---

## 3. Anuidade e prorrogação

**Status: 🟡 EM ABERTO. Dono: Gui.**

A base normalizada já traz `vigencyEnd`, `renewalStart` e `renewalEnd` por processo — então para os
que vieram com data, o prazo é leitura. Falta:

- [ ] **Gui** — de que evento contam os que **não** têm data, quantos dias, e como funciona o
      **prazo extraordinário** (o código da GRU muda: 220→221, 224/226→225, e isso é sinal
      estrutural útil).
- [ ] **Gui** — a prorrogação decenal de marca corre da **concessão** ou da **publicação da
      concessão**? (medido: no exemplo do método vivo há 91 dias entre as duas)

> Sem resposta, entram como `firmeza: estimado` **com aviso visível na tela**. ⚠️ Anuidade é o prazo
> que mais extingue direito de patente, e a casa cobra anuidade hoje: **710 cards**, GRU entre
> R$ 115 mil e R$ 190 mil/ano.

---

## 4. A base-mestra é o formato canônico?

**Status: 🟡 RECOMENDAÇÃO DADA. Dono: Gui.**

- [ ] **Gui** — `Base_Processual_Apex_Normalizada.json` **é** a primeira carga e o formato canônico
      de upload? (recomendo que sim: 1.540 linhas curadas, 10 regras de ingestão escritas, datas de
      vigência já dentro)
- [ ] **Gui** — preciso do arquivo (ou de 5 registros anonimizados) para escrever o adaptador. Ele
      **não entra no repo** — fica na tua máquina.
- [ ] **Gui** — os JSONs `RPI_290x_NACIONAL_PROCESSING` / `_REVISAO` / `_PREVIA.md`, para conferir o
      Sprint 1B contra uma rodada real.

---

## 5. A fronteira com a API do Breno

**Status: 🔴 A MAIS URGENTE DAS OPERACIONAIS. Dono: Breno.**

As 7 perguntas estão em [`CONTRATO-DADOS.md`](CONTRATO-DADOS.md) §14 e as 8 do onboarding em
[`ONBOARDING-BRENO.md`](ONBOARDING-BRENO.md) §8. As três que mudam o desenho:

- [ ] **Breno** — a API é fonte de **documento** (lote datado de eventos) ou de **estado** (CRUD)?
      Se for estado, o evento que produziu a situação **vem junto** (código + data + revista)? Sem
      isso o `evento_id` por conteúdo não fecha e um cron horário vira ruído em massa.
- [ ] **Breno** — a API **aceita `ativo_id` (ULID) vindo do cliente** no `POST` de criação? Sem
      isso, a conciliação titular↔cliente feita no MVP **não casa** com o dado dele — e recasar por
      nome é a chave que a casa proibiu, por número é impossível em 17,86% dos ativos.
- [ ] **Breno** — **dono de campo**, campo a campo: quem escreve e quem só lê. O sync **nunca**
      sobrescreve `decisao_humana`.

E o alerta que precisa chegar antes da primeira linha:

- [ ] ⛔ **Breno** — o scraping mira **quais** fontes? **Nenhum conector para WIPO (Madrid Monitor,
      Global Brand Database) nem CNIPA**: os termos proíbem por escrito *"perform automated
      queries"* e *"perform web scraping"*, `robots.txt` = `Disallow: /`, altcha em toda rota, CNIPA
      devolve HTTP 412. O caminho do Sprint 3 é a **consulta ao registro do INPI por procurador**.

---

## 6. Autenticação e identidade do cliente (Sprint 4)

**Status: EM ABERTO — mas decidir cedo é mais barato. Dono: Gui/Breno.**

⚠️ **Não copiar o modelo do BI.** Lá o hash é comparado **no navegador**, com `sessionStorage`; foi
auditado e **8 de 8 senhas foram quebradas, com 3 perfis compartilhando o mesmo hash**. Aceitável
numa rede privada, **inaceitável** numa extranet. O padrão que resistiu na casa é o do painel 8090:
**bcrypt custo 12**.

- [ ] quem é o **usuário**: a empresa cliente, ou pessoas dentro dela? Uma empresa pode ter vários
      usuários com visões diferentes?
- [ ] **cadastro**: self-service ou a Apex cria? Como se prova que quem entrou é o titular?
- [ ] segundo fator: obrigatório para todos, ou só para os **26 com e-mail compartilhado**?
- [ ] recuperação de senha; sessão (duração, revogação); o que acontece quando o cliente sai.
- [ ] **provedor pronto** (Auth0, Clerk, Supabase, Cognito) ou construído? Construir autenticação é
      onde projetos pequenos mais se machucam.
- [ ] **quem decide: o Breno (é backend) ou o Gui (é produto)?**

---

## 7. LGPD e dado de terceiro

**Status: EM ABERTO. Dono: Gui.**

- [ ] qual é **exatamente** o conjunto que cada cliente pode ver? (a lista branca executável está
      proposta em `CONTRATO-DADOS.md` §11 — falta o aval)
- [ ] retenção: por quanto tempo o Wallet guarda? O que acontece quando o contrato acaba?
- [ ] **dado pessoal de terceiro**: co-titular pessoa física com CPF, procurador, e-mail. Onde mora,
      quem acessa, sob qual base legal.
- [ ] **log de acesso**: quem viu o quê e quando — obrigatório numa extranet, útil no suporte.
- [ ] **quem é o responsável formal pelos dados?**
- [ ] ⚠️ **auditoria prévia obrigatória:** as ACLs das pastas de cliente no Drive **não foram
      enumeradas** (3 pastas testadas devolveram só o `owner`). Se já houver pasta compartilhada com
      link público, **o Wallet não é a primeira porta**.

---

## 8. Escopo do que substitui o APOL — e o de-para dos despachos

**Status: EM ABERTO. Dono: Gui.**

"Substitui completamente o APOL" precisa virar lista. Sem ela não dá para saber se o MVP está pronto.

- [ ] **Gui** — o que o APOL faz, funcionalidade por funcionalidade?
- [ ] **Gui** — quem usa hoje e em que rotina, além do passo 3 da trilha ("Drive + APOL", etapa 2,
      Wivyanne)?
- [ ] **Gui** — o que há dentro dele e **como exporta**? Há prazo de contrato ou rescisão?
- [ ] **Gui** — o cliente já acessa alguma coisa do APOL hoje? (isso é comunicação, não só técnica)
- [ ] 🔴 **Gui** — o **de-para código de despacho → texto** que o APOL usa. A casa tem **1 texto de
      64/76 códigos**; sem esse de-para o motor de cartas do Sprint 2 nasce com um template só. É o
      item de maior alavancagem do sprint.
- [ ] **Gui** — **o que o Webseek faz?** Zero documentação em qualquer lugar. Só o custo é conhecido
      (R$ 735,52/mês, APEX MP, títulos abertos até 2033).

---

## 9. Régua de "grande porte recorrente" (Sprint 4)

**Status: EM ABERTO. Dono: Gui.**

O Sprint 4 fala em "cliente final recorrente (grande porte)". A casa tem **três réguas diferentes**,
e elas divergem:

| régua | n | observação |
|---|---|---|
| **aptidão** (a que o BI já usa: 3+ levas, 2+ anos ou 1 ano com ≥4 vendas, recência ≤365d, concentração ≤75%) | **19** | R$ 276.964,00 nos 12m · 28% da carteira |
| **porte** (vida ≥ R$ 50 mil) | **8** | dos quais **4 estão frios** (u12 = R$ 0,00) e 1 é IPartner |
| **porte + aquecimento** (≥ R$ 25 mil e ≤ 365 dias) | **9** MP + 7 IP | — |

Dos 8 clientes ≥ R$ 50 mil, só **3** são também aptos.

- [ ] **Gui** — qual das três? A palavra é *porte*; a régua da casa mede **ritmo**.

---

## 10. Modelo do parceiro (IPartners)

**Status: RECOMENDAÇÃO DADA. Dono: Gui.**

A proposta do Gui: o parceiro vê o que contratou, que é dos clientes dele; dentro do login dele, uma
subdivisão com os clientes dele — histórico, contratos, procurações, pagamentos, status.

⚠️ **Medido:** **72 de 76 parceiros (94,74%) têm zero cliente final nomeado** no CRM. O nível 2 da
árvore **não existe como dado**.

Recomendação (detalhe em `PLANO.md` §6): parceiro é `Pessoa` com papel `parceiro` no vínculo; o
cliente final dele é `Pessoa` com `gerido_por` apontando para ele; **o parceiro cadastra e corrige
os próprios clientes** (self-service, com trilha), porque quem sabe quem é o titular é ele; os
**22 agentes bilaterais** têm **duas visões separadas** (inbound e outbound), nunca uma lista só;
**valores ficam fora** do pacote, para parceiro também.

- [ ] **Gui** — aprova esse modelo? Em especial: o parceiro cadastra os clientes dele?
- [ ] **Gui** — pagamentos entram na visão do parceiro? (recomendo que não — ver `PLANO.md` §5)

---

## 11. Upload manual — as perguntas que sobram

**Status: PARCIALMENTE RESPONDIDA (D4). Dono: Gui.**

- [ ] o que exatamente se faz upload além da planilha: PDF de certificado, XML da RPI, os três?
- [ ] onde o arquivo enviado fica, e como é indexado?
- [ ] o que acontece quando o **mesmo ativo chega duas vezes** por caminhos diferentes? (o contrato
      resolve por `ativo_id` + `(jurisdicao, identificador_normalizado)`; sem número, **nunca**
      automático — vira pendência para decisão humana)
- [ ] ⚠️ **no dia do servidor:** conteúdo enviado por usuário **não pode ser servido da mesma origem
      da aplicação** — é o furo clássico de extranet. Local não morde, mas o desenho já prevê.

---

## 12. Operação e domínio (Sprint 4)

**Status: EM ABERTO. Dono: Gui.**

- [ ] **domínio** do Wallet: qual? ⚠️ `apexip.com` e `apexpi.com.br` são **diferentes** e a inversão
      já causou confusão na casa. ⏰ `apexpi.com.br` **expira em 07/10/2026**.
- [ ] certificado, renovação, quem é avisado quando vence.
- [ ] backup: o que, com que frequência, e **testado como** (restaurado, não só gerado).
- [ ] monitoramento: quando o Wallet cair, **quem descobre e como?** (no interno isso foi resolvido
      com um vigia que manda DM no Slack)
- [ ] suporte: o cliente que não consegue entrar fala com quem?
- [ ] **onde** fica o servidor separado: mesmo provedor, outro, PaaS gerenciada? E a API do Breno
      mora junto ou numa terceira máquina?

---

## 12-A. Material do APOL que o Gui vai subir — pendência declarada (07/09/2026)

**Status: aguardando o arquivo.** Ele disse, literal: *"Os despachos tanto as cartas (modelos) eu
ainda vou subir e colocar na raiz do projeto para ter como background e referência de como é usado
hoje no APOL. Não subi nada ainda."*

**Onde vai:** `referencias/apol/` na raiz do projeto (a pasta ainda não existe — nasce com o
primeiro arquivo).

**O que muda quando chegar:**

| o material | o que ele destrava |
|---|---|
| a tabela de **código de despacho → texto** que o APOL usa | a pergunta 4 sai da mesa: em vez de escrever ~140 verbetes ou partir do manual do INPI, partimos do texto que o cliente da Apex **já conhece** |
| os **modelos de carta** | o motor de cartas do Sprint 2 nasce com o template certo, e não com um inventado do zero |

⚠️ **Antes de subir, três coisas:**
1. Se o material tiver **nome de cliente real**, ele fica fora do repositório — vai para a máquina
   dele e eu leio de lá. O `.gitignore` já bloqueia `.pdf`, `.docx` e `.xlsx`; a exceção se escreve
   pelo nome exato, como foi feito com o modelo de planilha.
2. Se for **conteúdo licenciado do fornecedor**, ele não entra no repo — usamos como referência de
   leitura e escrevemos o nosso.
3. O texto do despacho **chega ao cliente por padrão** (`src/projecao/cliente.ts` publica `texto`
   do evento). Não existe hoje campo de nota interna no evento: se algum verbete tiver observação
   só para a casa, isso é campo novo no contrato.

---

## 13. Fora do escopo deste projeto, mas urgente (lista do Gui)

Achados de segurança medidos em 06/09 **no repo do BI**, não aqui. Registrados para não se perderem:

- [ ] 🔴 `back/n8n/workflows/ploomes-sync-servicos.json` está **versionado no git** com a chave do
      Ploomes **em claro**, 6 ocorrências de 128 caracteres. A memória registra esse snapshot como
      "com a chave redigida" — **e ele não está**. Rotação do Ploomes virou urgente.
- [ ] 🔴 `.codex/config.toml` do BI tem o **JWT do n8n** e a chave do Ploomes em claro; untracked,
      mas **não ignorado** — um `git add -A` o commita.
- [ ] 🟡 conferir com a Ploomes o flag `IsSensitiveData` do anexo: ele muda o comportamento do blob?
      (hoje a URL responde **206 sem credencial**, sem expiração)

## §N — INVESTIMENTO: o que precisa do CRM para o custo fechar (07/09/2026)

Levantado quando o Gui pediu o custo do portfólio para o cliente. **A tela já existe; o que
falta é o dado ficar redondo no Ploomes.** Enquanto não ficar, a soma sai menor e a tela diz
quantas linhas ficaram de fora — decisão consciente: um total menor e certo vale mais que um
maior e errado, ainda mais quando quem lê é o cliente.

> *"Na Ploomes muitas vezes a proposta cheia que o cliente pagou tem mais de um serviço (marca e
> patente) mas quando subdivide nos cards derivados, é possível ver as taxas das GRUs de cada um.
> Na proposta é possível identificar também. (…) vamos com calma tentando conectar esse dado
> certinho no ativo e serviço específico, até mesmo se for necessário ajustar alguns pontos no
> CRM para ficar redondo."* — Gui, 07/09/2026

### O que já está modelado e esperando o dado

| campo | para que serve | de onde deve vir |
|---|---|---|
| `Servico.papel_na_conta` | `proposta` \| `derivado` \| `avulso` \| `indefinido`. **É o que impede somar a proposta E os derivados dela** | derivar de `OriginDealId` + funil |
| `Servico.origem.origem_deal_id` | o card-pai | `OriginDealId` do Ploomes |
| `valor.honorario` | o que fica com a Apex | ⏳ hoje não existe separado |
| `valor.taxa_oficial` | GRU do INPI | ⏳ está no card derivado, precisa ser lido |
| `valor.taxa_internacional` | associado/autarquia no exterior | ⏳ idem |
| `valor.origem` | `nota_fiscal` \| `cobranca` \| `declarado` \| `order_amount` | ⛔ só as três primeiras chegam ao cliente |

### As perguntas, na ordem em que travam

1. **Qual campo do Ploomes guarda a GRU do card derivado?** O `Nosso Número` (`deal_E0245E70`)
   casa 100% com o título do Omie, mas é o identificador da guia, não o valor. Precisa do campo
   de VALOR da GRU, por card.
2. **Como distinguir proposta de derivado sem ambiguidade?** `OriginDealId` diz "nasci de outro
   card" e **não** diz "sou espelho" — colar todo filho no pai funde 77 dos 106 serviços do funil
   comercial e apaga US$ 33.136,63 de venda ganha. O que separa é o **funil**. Falta escrever a
   regra: *funil X + tem OriginDealId = derivado; funil Y sem OriginDealId = proposta*.
3. **O honorário está separado da taxa em algum campo, ou só no corpo da proposta?** Se estiver
   só no texto, a decomposição precisa de campo novo no CRM — e aí é ajuste de cadastro, não de
   código.
4. **A proposta que cobre marca E patente gera sempre os dois derivados?** Se algum serviço fica
   sem card próprio, o custo daquele ativo desaparece da conta e ninguém percebe.
5. **Taxa de associado no exterior: entra como valor do card ou como despesa em outro lugar?**
   Hoje o painel tem a natureza `taxa_internacional` pronta e nenhuma fonte para ela.

### O que a tela faz enquanto isso

- Só soma valor com procedência de **nota fiscal, cobrança ou declarado**.
- Só soma serviço com papel **derivado** ou **avulso**.
- **Conta e mostra** quantos ficaram de fora, e por quê.
- No painel do gestor, avisa quantos serviços têm valor apenas de `order_amount` — porque nesses
  o número interno e o número do cliente **não vão bater**, e quem opera precisa saber a causa
  antes de o cliente perguntar.

