# OpenIpWorld — o que foi MEDIDO (setembro/2026)

> **Por que este arquivo existe.** Todo número citado no `PLANO.md`, no `CONTRATO-DADOS.md` e no
> `ONBOARDING-BRENO.md` sai daqui. Antes de dizer "eu acho que o CRM tem…", olhe a tabela. Onde não
> medimos, está escrito **NÃO MEDIDO** — e isso é informação, não lacuna a preencher com suposição.
>
> **Método.** Duas rodadas em 05–06/09/2026, 24 agentes, ~5 milhões de tokens de leitura, sobre: o
> repo do BI, o CRM Ploomes vivo (só `GET`), o Google Drive, o Desktop do Gui, a VPS interna
> (Tailscale) e o XML da RPI do INPI. **Fase 100% leitura**: nenhum arquivo alterado, nenhuma API de
> escrita chamada, nenhuma chave impressa.
>
> ⚠️ **Dado tem validade.** As contagens do CRM são de 05–06/09/2026. Antes de decidir algo caro em
> cima de um número daqui, remeça — a casa já teve o caso de nota velha repetida como verdade.

---

## 1. O Ploomes não tem o ciclo de vida do ativo

Varredura sobre os **488 campos customizados de Deal** (`GET /Fields`, `EntityId eq 2`):

```
deposito   -> NENHUM CAMPO      concessao   -> NENHUM CAMPO
vigencia   -> NENHUM CAMPO      validade    -> NENHUM CAMPO
anuidade   -> NENHUM CAMPO      prorrogacao -> NENHUM CAMPO
oposicao   -> NENHUM CAMPO      caducidade  -> NENHUM CAMPO
renova     -> NENHUM CAMPO      expira      -> NENHUM CAMPO
```

Os **32 campos de data** existentes são todos de dinheiro ou prazo interno: `Data do Pagamento
(1ª a 4ª parcela)`, `Data da Fatura do Agente`, `Data de Pagamento (GRU)`, `Prazo oficial`,
`Prazo Gerencial`, `Prazo de Abertura`, `Forecast de Venda`. O único com nome parecido,
`deal_D57F7DAF "Data do Vencimento"`, é vencimento de **pagamento**.

Medido duas vezes, por agentes independentes, com o mesmo resultado.

> **Consequência:** o Ploomes modela a venda e a execução do serviço, não o bem. O ciclo de vida do
> ativo é exatamente o que o APOL entrega — e é por isso que ele custa R$ 2.030,21/mês.

### Campos que descrevem o ativo, com preenchimento real

`node` sobre `deals_all.json` (6.350 cards dos 5 funis), contando valor não-vazio:

| Campo | FieldKey | Todos (6.350) | Serviços (2.225) |
|---|---|---|---|
| País do Serviço | `deal_3388F098` (picklist múltipla) | 6.230 · **98,1%** | 2.224 · **100,0%** |
| Matéria do Serviço | `deal_726617F0` (picklist múltipla) | 6.179 · **97,3%** | 2.211 · **99,4%** |
| Titular(es) cadastrado(s) no APOL? | `deal_CD736552` (bool) | 2.163 · 34,1% | 2.163 · **97,2%** |
| Processo(s)/ND cadastrado(s) no APOL? | `deal_0FBFDBC3` (bool) | 2.156 · 34,0% | 2.156 · **96,9%** |
| **Processo Vigente 1** | `deal_0C5F3AC7` (texto livre) | **1.692 · 26,6%** | 614 · 27,6% |
| Nome Titular 1 | `deal_EE2D7DBC` | 1.028 · 16,2% | 1.004 · 45,1% |
| Processo Vigente 2 | `deal_992DC97A` | 114 · 1,8% | 46 · 2,1% |
| **Nome da Marca** | `deal_31A125DF` | **18 · 0,3%** | 7 · 0,3% |
| **Classe(s)** | `deal_CB9372BF` | **18 · 0,3%** | 7 · 0,3% |
| Número da última RPI | `deal_F0EC3AFF` | 2 · 0,03% | 1 · 0,04% |

**Zerados (0 de 6.350):** `Processo/ND no Apol` (`deal_02D5FAB3`), `Marca` (`deal_96031D5B`),
`Apresentação de Marca`, `Especificações de Classe`, `Número de Classes`, `Nome(s) do Titular`,
`CNPJ do Titular`, `CPF do Titular`, `Cadastro do Titular no INPI`, `Tipo de Titular`, `País`
legado (`deal_23F7026B` — armadilha de autocomplete; o campo vivo é `deal_3388F098`).

⚠️ **O MCP `ploomes_list_fields` devolve só 200 dos 488 campos de Deal.** Quem parar nele perde
metade do CRM, incluindo `Classe(s)` e `Processo Vigente 2–10`.

⚠️ **Correções a premissas que circulavam:** `deal_E0245E70` **não** é "Nosso Número" genérico — é
**`N° da GRU`**, o nosso número do boleto (87% preenchido, casou **63 de 63** na conciliação com o
Omie). `Num GRU` (`deal_3CE5C882`) está em **3 de 6.350 (0,05%)** — morto.

---

## 2. O número do processo mora no TÍTULO do card

Regex sobre 6.350 cards (`BR\d{2}\d{4}\d{6}-\d`, `PCT/XX####/#`, `(?<!\d)[89]\d{8}(?!\d)`):

| Fonte | Cards com ≥1 processo | % |
|---|---|---|
| **Título do card** | **3.055** | **48,1%** |
| — 10015008 Serviços Estrangeiros | 943 / 1.262 | 74,7% |
| — 10015006 Comercial Estrangeiro | 1.496 / 2.097 | 71,3% |
| — 10015007 Serviços Nacionais | 325 / 963 | 33,7% |
| — 10015005 Comercial Nacional | 291 / 2.001 | 14,5% |
| Campos `Processo Vigente 1–10` | 1.771 | 27,9% |
| **União (campo OU título)** | **3.137** | **49,4%** |
| **Só no título** | **1.792** | — |
| **Só no campo** | **82** | — |

O título carrega **22× mais** informação de ativo que o campo criado para isso. **286 títulos
carregam mais de um número** — serviço ↔ ativo é **N:N**, não 1:N.

⚠️ Isso **inverte** a regra do Dashboard OS (`CLAUDE.md` do BI: *"Matéria vem do campo, não do
título"*): para **matéria** o campo ganha (99,4%); para **número de processo** o título é a fonte
real. As duas regras convivem — não confundir uma com a outra.

**Gramáticas medidas no mesmo campo** (o extrator precisa cobrir todas):

```
912000101                 marca INPI, 9 dígitos
BR 102022000101-0         patente BR — o dígito verificador NÃO pode ser descartado
                          (11 de 56 títulos vivos trazem o hífen; um \d{9,} o perde e o
                           casamento com a RPI falha em silêncio)
PCT/CN2022/000101         PCT
29/000,101                design US
EP3000101                 patente europeia
501000108                 designação de Madri — 9 dígitos começando com 5,
                          formato IDÊNTICO ao Id de card do Ploomes
936000104 (3º)            sujeira anexada
943000105 e 943000106     DOIS ativos num campo
ND00101                   identificador interno — NUNCA convertido nem comparado como INPI
```

**Universo:** **1.532 números de processo distintos** — 1.125 marcas INPI, 308 patentes BR, 99 PCT.
**837 (54,6%)** aparecem em 2+ cards, ou seja já têm linha do tempo.
**42,98% dos cards (2.729 de 6.350) não têm número em lugar nenhum** — o histórico por ativo nasce
parcial e tem de **declarar** que é parcial.

---

## 3. Titular ≠ cliente — e o dono do ativo quase nunca está identificado

`deal_21FE7CDC` = *"O cliente e o titular são os mesmos?"*, medido nos 6.350 cards:

| funil | respondeu | **titular ≠ cliente** | com nome | com documento | **titular ANÔNIMO** |
|---|---|---|---|---|---|
| 10015007 Serviços Nacionais | 891/963 · 92,52% | **143 · 16,05%** | 21 · 14,69% | 54 · 37,76% | **88 · 61,54%** |
| 10015005 Comercial Nacional | 1032/2001 · 51,57% | **295 · 28,59%** | 17 · 5,76% | 73 · 24,75% | **221 · 74,92%** |
| 10015008 Serviços Estrangeiros | 722/1262 · 57,21% | **704 · 97,51%** | 659 · 93,61% | **0 · 0,00%** | 45 · 6,39% |
| 10015006 Comercial Estrangeiro | 1304/2097 · 62,18% | **1272 · 97,55%** | 309 · 24,29% | **0 · 0,00%** | **963 · 75,71%** |

**Co-titularidade existe e é comum:** 18 deals no 10015005, 28 no 10015007, 70 no 10015008, 92 no
10015006 têm **2 ou mais titulares** (até 4). Qualquer chave 1:1 a ignora.

### 69,6% dos ativos apontam para um AGENTE

O `ContactId` é a única chave com 100% de cobertura (6.350 de 6.350) — mas **1.067 de 1.532 ativos
(69,6%)** têm um escritório correspondente como contato, não o dono:

```
os 5 maiores correspondentes concentram 430 dos 1.532 ativos
(120 · 119 · 83 · 56 · 52) — nomes fora do repositório, por serem relação comercial da casa
```

**Só 465 ativos (30,4%)** têm dono final identificável hoje.

> **Consequência:** uma extranet chaveada em `ContactId` mostraria a carteira de um correspondente como se fosse
> de um cliente. Autorização deriva de **vínculo** (pessoa × ativo × papel × vigência), nunca do
> contato do card.

### O parceiro e os clientes dele

461 cards com `Segmento do Cliente Nacional = Apex IPartners` → **76 parceiros** distintos, e
**72 de 76 (94,74%) têm ZERO cliente final nomeado**. Só 12 dos 461 cards (2,60%) trazem nome de
titular. O maior parceiro tem 77 cards e 1 cliente final nomeado.

> **Consequência:** o nível 2 da árvore (parceiro → clientes dele → ativos) **não existe como dado**.
> Quem sabe quem é o titular é o parceiro — por isso o cadastro é self-service dele no Sprint 4.

### A ponte com o APOL já foi tentada e está morta

| campo | preenchimento |
|---|---|
| `deal_02D5FAB3` "Processo/ND no Apol" | **0 de 6.350 · 0,00%** |
| `contact_6375A510` "ID do Titular no Apol" | **1 de 383 · 0,26%** |
| `deal_0FBFDBC3` "Processo cadastrado no APOL?" (bool) | **96,9%** dos cards de serviço |

O único valor gravado em "ID do Titular no Apol" é **o nome completo de uma pessoa física** —
alguém usou o campo de id para escrever o nome que o campo `Name` não tinha.

> **Consequência:** não existe migração pronta. Mas o booleano preenchido em 97% prova o que o APOL
> é para a casa: **o cadastro de titulares e processos**.

---

## 4. Identidade do cliente

| | valor | prova |
|---|---|---|
| Clientes APEX MP (nacional) | **264** | `clientes.json` → `mp.n_clientes` |
| Clientes APEX IP (estrangeiro) | **121** | `ip.n_clientes` |
| ContactIds distintos | **383** (2 nos dois lados) | script `m1.js` |
| Chave usada hoje | **`ContactId`** (inteiro) | `back/clientes/gerar_clientes.js:91,176` |

### Preenchimento no Ploomes vivo (não nos JSONs do repo)

| campo | APEX MP (264) | APEX IP (121) |
|---|---|---|
| **Qualquer documento (CNPJ/CPF)** | **264 · 100,00%** | 2 · 1,65% |
| — CNPJ | 173 · 65,53% | 2 |
| — CPF | 91 · 34,47% | 0 |
| E-mail extraível | 250 · 94,70% | 120 · 99,17% |
| Telefone (≥8 díg.) | 260 · 98,48% | 116 · 95,87% |
| sem e-mail **e** sem telefone | 2 · 0,76% | 1 · 0,83% |

⚠️ **Os JSONs do repo têm ZERO e-mails, ZERO telefones e ZERO documentos.** Causa medida:
`gerar_clientes.js:113` pede ao Ploomes só `Id,Name,CreateDate,LineOfBusinessId,StateId`. **O convite
da extranet obriga a puxar do Ploomes.**

⚠️ **O campo `Email` é texto livre, não um endereço.** 4 casos no MP com 2 a 5 endereços na mesma
string, com rótulos (`"Cobranças: financeiro@… ; Contato: luishenrique@…"`). Parser ingênuo grava a
string inteira e falha em silêncio.

### Dedupe

| chave | grupos duplicados | veredito |
|---|---|---|
| **documento exato (CNPJ\|CPF)** | **0 em 1.567 registros** | ✅ chave perfeita |
| CNPJ raiz (8 díg.) | 0 | ✅ |
| nome normalizado (264 clientes MP) | 0 | ✅ neste recorte |
| nome normalizado (base ampla, 1.567) | **40 grupos, 53 excedentes** | ❌ inutilizável |
| e-mail exato | 9 grupos (MP) / 31 (ampla) | ⚠️ **não são duplicatas** — são PJ+PF do mesmo dono, ou escritório representando terceiros |
| regra da casa (telefone OU e-mail) | 49 grupos, 58 excedentes | → 1.509 identidades para 1.567 ids (3,70% de inflação) |

**17 clientes reais ocupam 2 ContactIds cada**; em **11 deles a venda está num id e o serviço no
outro** (comercial nacional aponta para a PESSOA em 55,72%; serviço nacional aponta para a EMPRESA
em 67,08%). Uma carteira chaveada em ContactId mostraria metade do portfólio.

Caso `ELLEN` (em `carteira.json`): dois contatos criados com **0,43 segundo** de diferença, mesmo
telefone, e-mail diferindo em 1 dígito, mesma marca, um card perdido e outro aberto com R$ 3.500,00.

### PF × PJ

`Contact.TypeId` separa com **0 contradições em 1.567**. `LegalName` é exclusivo de PJ (0 de 979 PF
o têm). Heurística de nome (sufixos LTDA/S.A./…) perderia **202 PJ** na base ampla.

### Convite por e-mail

| critério | MP (264) | IP (121) | **total (385)** |
|---|---|---|---|
| tem ≥1 e-mail | 250 · 94,70% | 120 · 99,17% | 370 · 96,10% |
| exatamente 1 endereço no campo | 246 | 117 | 363 · 94,29% |
| endereço **exclusivo** | 232 | 112 | 344 · 89,35% |
| **convite seguro (B ∩ C)** | **228 · 86,36%** | **109 · 90,08%** | **337 · 87,53%** |

**26 clientes compartilham e-mail com outra entidade** → exigem segundo fator (o documento), senão o
dono do cliente **A** enxerga a carteira pessoal do cliente **B**. 3 são inalcançáveis por canal
digital.

### Universo do Wallet

| população | n |
|---|---|
| clientes nacionais + estrangeiros − interseção | 383 |
| agentes com `contact_id` | 129 (121 já contados no lado IP) |
| **universo com identidade no CRM** | **390** |
| agentes **sem** `contact_id` (só string de fatura/extrato) | **146** |
| **universo máximo teórico** | **536** |

**Ativos por cliente:** nacional mediana **1**, p90 4, máx 21 → **lista simples**. Parceiro/agente
mediana 3, p90 **22**, máx 90 → **busca com paginação**. 64,4% dos clientes MP têm uma venda só.

---

## 5. A RPI do INPI — o que o XML entrega

### Marcas (`RM####.zip`) — RPI 2902, 37.130 processos, 54,6 MB descompactado

```
/processo @numero                                        37.130
/processo @data-deposito                                 18.730
/processo @data-concessao                                 8.615
/processo @data-vigencia                                  8.615   <- expiração, NATIVA
/processo/marca @apresentacao @natureza                  18.730
/processo/marca/nome                                     18.328
/processo/titulares/titular @nome-razao-social @pais @uf 36.914
/processo/procurador                                     26.509   <- ATTORNEY OF RECORD, estruturado
/processo/lista-classe-nice/classe-nice + especificacao  28.505
/processo/classes-vienna/classe-vienna                   37.996
/processo/dados-de-madri @numero-inscricao-internacional    812   <- ponte INPI<->Madri, já casada
/processo/prioridade-unionista/prioridade                   829
/processo/despachos/despacho @codigo @nome               37.349
/processo/despachos/.../{cedentes,cessionarios}         ~578/616  <- transferência de titularidade
```

Na RPI 2904 (36.995 processos): `procurador` **33.625**, mas com **4.498 grafias distintas** na
mesma revista — Dannemann aparece em duas formas (416 + 345). **A Apex aparece em 2 grafias**
(`Apex Propriedade Intelectual LTDA` 8 processos + `APEX INTELLECTUAL PROPERTY SERVICOS
ADMINISTRATIVOS LTDA` 3). `WHERE procurador = 'Apex'` perde 3 de 11.

🔴 **A IMAGEM da marca NÃO está no XML.** Medido: `<imagem` = 0 e `imagem="` = 0 em 54,6 MB. As
1.306 ocorrências da palavra "imagem" são texto de especificação Nice. A figura só existe no PDF e
na página do pePI — por isso o método vivo faz extração dirigida do PDF (1.828 sinais em 1.569
páginas na RPI 2903, 1.824 no primeiro passe e 4 corrigidos à mão).

⚠️ **`data-vigencia` é do EVENTO, não do ativo:** 2.977 de 36.995 (8,05%) na RPI 2904 — só os
concedidos **naquela** revista. A marca concedida em 2019 não tem a data em revista nenhuma que se
leia hoje. **Vem da base do INPI, não da revista.**

### Patentes (`P####.zip`) — RPI 2904, 3,86 MB

`numero` ✅ · `data-deposito` ✅ (3.655) · `titular` ✅ (3.567, com país) · `inventor` ✅ (2.156) ·
`classificacao-internacional` ✅ (4.252) · `numero-pct` ✅ (249) · `numero-ompi` ✅ (245) ·
`prioridade-unionista` ✅ (619) · `concessao` ✅ (136).

🔴 **`procurador`: ZERO.** 🔴 **anuidade e vigência: ZERO.** Censo completo de tags.

> **Consequência:** descoberta por procurador só serve para marcas. Patentes entram por número.

### Desenho Industrial

🔴 **Não há feed estruturado.** `revistas.inpi.gov.br/txt/DI2902.zip` devolve **302 → /error/404.html**
(medido). A RPI publica DI só em PDF. **66 cards** de DI na carteira → `vigilancia.ativa = false`.

### A tabela de despachos vem de graça

Cada `<despacho>` traz `<codigo>` **e** `<titulo>`. **76 códigos distintos** na RPI 2904 de Patentes,
**64** na de Marcas. Não há tabela a manter.

Distribuição por volume (2904, Patentes): `6.23`=555 · `2.1`=253 · `9.1`=250 · `1.3`=224 ·
`2.10`=194 · `16.1`=193 · `2.5`=191 · `7.1`=183.

⚠️ **Códigos SEM ponto existem:** `130` (30 processos), `111` (21), `115`, `135`. O parser de **PDF**
do Papi exige `Código X.YY` **com ponto** e por isso perde **~58% dos registros** fora do 2.10. Em
prospecção custa lead; em acompanhamento custa **prazo de cliente**. → **XML sempre, PDF nunca como
padrão.**

### O feed é frágil e já quebrou em silêncio

```
GET https://revistas.inpi.gov.br/rpi/  -H "Accept: application/json"  -> HTTP 404
GET https://revistas.inpi.gov.br/rpi/  -H "Accept: */*"               -> HTTP 200
```

O INPI mudou o comportamento do header e a ingestão do Papi **morreu 9 dias sem avisar** (RPIs 2903 e
2904 não entraram até 01/09). Re-medido em 06/09: o bug é real e o conserto (`Accept: */*`) está em
produção.

⚠️ E o XML **pode faltar**: na RPI 2904 o método vivo registrou
`"xml_zip": {"status":"UNAVAILABLE_AFTER_RETRY", "direct_request_status":403,
"retry_result":"302 para /error/404.html, seguido de 403"}` e declarou a degradação para PDF.
**Degradar é permitido; degradar em silêncio, não.**

---

## 6. O APOL e o Webseek — custo e identidade

### No financeiro nenhum dos dois se chama pelo nome: os dois são VELA

```
grep -rniI "apol" no repo do BI          -> 3 arquivos, todos do Dashboard OS (a trilha)
grep -i "VELA" em regras-humanas.json    -> vazio
grep -ri "webseek" no repo + memória     -> ZERO
```

A palavra **Webseek** só existe em **2 arquivos**: os CSVs de extrato do Inter da APEX IP
(7 + 9 ocorrências).

### APOL

| campo | valor | prova |
|---|---|---|
| Fornecedor | `VELA SOFTWARE BRAZIL PARTICIPACOES LTDA` | `out/omie-titulos.json` |
| CNPJ | **o mesmo nos dois** | é o que prova que APOL e Webseek são um fornecedor só |
| Empresa | **APEX IP** · categoria Omie `2.04.98` · DRE `desp_administrativas` | `mapa-dre.json:372-380` |
| Provisão | **R$ 2.024,68/mês** | `financeiro.json` → `previsto.saidas` |
| Boleto real ago/26 | **R$ 2.030,21** (corrigido no Omie em 02/09) | `extrato-carimbo.json:2036` |
| Histórico da faixa viva | **9 pagamentos · R$ 18.384,50** (28/07/2025 → 31/08/2026) | extrato |
| Run-rate | **R$ 24.296,16/ano** (provisão) ou R$ 24.362,52 (boleto) | — |

### Webseek

| campo | valor |
|---|---|
| Fornecedor | `VELA SOFTWARE E SERVICOS LTDA` · **mesmo CNPJ** |
| Empresa | **APEX MP** · categoria `2.04.96` "Software ADM" |
| Valor hoje | **R$ 735,52/mês** (era R$ 699,00 até set/2025) |
| Cadeia provada | `16/09/2024 "09. WebSeek" -699,00` (APEX IP, **único -699,00 do arquivo**) → título Omie `8941765437` Vela IP, pago 16/09 → `15/10/2024 VELA SOFTWARE E SERVICOS -699,00` (APEX **MP**) |
| Vida total | ~36 pagamentos · ≈ R$ 21.333,62 |
| Títulos abertos no Omie | até **2033-06-25** |
| **O que ele faz** | 🔴 **NÃO MEDIDO.** Zero documentação. A cobrança variou 5,8× em 12 meses (R$ 255,32 → R$ 1.483,40 → estabilizou) — compatível com cobrança por consumo de busca, mas isso é **inferência** |

### As quatro cobranças Vela, separadas pelo apelido do agendamento no Inter

| apelido (set/2024) | valor | vira | empresa | hoje |
|---|---|---|---|---|
| `"09. Apol"` | R$ 1.275,08 | Vela IP `2.04.98` | IP | **ATIVO** R$ 2.030,21 |
| `"09. WebSeek"` | R$ 699,00 | Vela MP `2.04.96` | **MP** | **ATIVO** R$ 735,52 |
| `"09. Aquiles"` | R$ 119,26 | Vela IP | IP | **ENCERRADO 25/08/2025** |
| *(sem apelido)* | — | Vela IP | IP | **ENCERRADO 30/03/2026** — produto **NÃO IDENTIFICADO** |

**Total Vela hoje: R$ 2.765,73/mês = R$ 33.188,76/ano** — **25,06%** do gasto anual de software da
casa (R$ 132.433,20, somando 20 assinaturas no Omie + 3 recorrentes só no cartão).

⚠️ **Correção:** o `mp|2.02.97` de R$ 344,83 **não é Vela** — é NEUROLOGIC (Leadster), CNPJ
outro fornecedor. Cortar APOL + Webseek economiza R$ 2.765,73, não mais.

### O Aquiles era a ferramenta da leitura semanal da RPI

`docs/painel-pm/REF_Tecnico_Leitura_Marcas.md:52` — a planilha "Leitura RPI Marcas" (80 linhas,
RPIs 2824–2862) tem uma coluna **`DATA DO AQUILES`**, sempre 2 a 9 dias depois da `DATA DA RPI`, e
rastreia exatamente os despachos de colidência (`i1756`, `i009`, `i158`, `i770`). **Foi cortado em
25/08/2025**; desde 27/07/2026 a leitura é feita por agente no Codex.

### O passo "Drive + APOL" na trilha do OS

`back/n8n/workflows/ploomes-sync-servicos.js:244,256` — `{ n: 3, nome: 'Organizacao - Drive + APOL',
etapa: 2 }`, idêntico nos dois ramos (nacional e exterior), executado pela **Wivyanne** (`adminKey`;
o doc de 20/05 ainda diz Bruna/Lucas, desligados).

### ⛔ O que só o Gui sabe

O que o APOL faz funcionalidade por funcionalidade · quem usa além do passo 3 · o que há dentro e
como exporta · se o cliente já acessa algo dele · contrato, prazo e rescisão · **o que o Webseek
faz**.

---

## 7. O método de colidência que já existe

### Duas gerações, e a viva é de 2026

| | **AQUILES** (2025) | **Leitura de Colidências** (jul/2026 → hoje) |
|---|---|---|
| motor | fornecedor externo | agente no **ChatGPT/Codex** com Drive + Slack |
| entregável | `.xlsm` "Lista Colidências Processo x Processo" | prévia `.md` + JSONs + **PDF por caso** + resumo no Slack |
| semelhança | **% entre palavras** (50,00–100,00) | **4 scores + combinado** |
| decisão | coluna `Selecionado` (0/1) | `risk` + `confidence` + `sendToClient` |
| cobertura | RPIs 2821–2845 | RPIs 2895–2904 |

O funil Ploomes `#50001028 BETA - Colidências e Revista` existe e tem **0 deals** — a rotina não
está no CRM.

### A base-mestra

`Base_Processual_Apex_ATUAL.xlsx` (Drive `1BHgucjtiAdR6gAjGMUsWxonmFfi-_QrH`, 3,73 MB, 03/09/2026)
+ `Base_Processual_Apex_Normalizada.json` (**10.162.922 bytes**) + `manifesto_ingestao.json`:

```
records                1.540      officialInpiProcesses  1.532
internalNdRecords          8      registrations          1.114
applications             426      recordsWithImages        871
multiClass                27      legalReview               94
missingImages             14      unconfirmedTitular        24
```

**Mas o cruzamento semanal usa 429** (`"national_monitorable_base": 429` nos JSONs das RPIs 2902,
2903 e 2904). A régua 1.540 → 429 mora em `legalStatus.includedInWeeklyScreening` + `strongTerminal`
**mais** um filtro próprio da carga piloto — e a skill admite que hoje são **duas políticas**:
*"unificar a política de elegibilidade na aplicação"*. 🔴 **A política única não está escrita em
lugar nenhum.**

🔑 **Dependência circular:** a base-mestra nasce de
`sourceFile: <exportação manual do Webseek, no Desktop de uma máquina da casa>` — **exportação
manual do Webseek**, o fornecedor que o Sprint 3 promete matar. Cargas: 27/07 (1.258) → 18/08
(1.283) → 03/09 (1.540, +257).

### O esquema do registro normalizado (é o adaptador do `Ativo`)

```
source{sheet,excelRow}
portfolio{owner,sourceFlag,controlStatus}
process{raw,normalized,kind,depositDate,concessionDate,protectionUseDate,
        vigencyStart,vigencyEnd,renewalStart,renewalEnd,irn,originalProcess,splitProcess}
mark{raw,normalized,presentation,nature,colorClaim,cfeRaw,autoFamilyId,autoFamilyValidated}
classification{raw,system,edition,classes[],source,oldNationalSubclasses[]}
specification{raw,searchNormalized,blocksRaw[],blocksSearch[]}
visualAsset|null{fileName,relativePath,sha256,dHash64,format,width,height,channels}
parties{titularRaw,titularNormalized,procurador,primaryForRouting,involved[]}
legalStatus{sourceSituation,monitoringStatus,includedInWeeklyScreening,
            strongTerminal,reviewReasons[],lastRpi,lastDispatchCode,lastDispatchDescription}
businessContext{segmentSourceRaw,economicSegmentValidated,channels[],territory,strategicImportance}
warnings[]
```

`process.kind` distingue `INPI_OFICIAL` de `INTERNO_ND`; `classification.system` distingue `NCL`,
`CLASSIFICACAO_NACIONAL_ANTIGA`, `NAO_RECONHECIDA`, `SEM_CLASSE`. `autoFamilyValidated = false`
exige confirmação humana antes de usar o agrupamento como família jurídica.

> **É aqui que está o ciclo de vida do ativo** — `depositDate`, `concessionDate`, `vigencyEnd`,
> `renewalStart/End`. Confirma: a carteira vem da **base do INPI**, não da revista.

### As 10 regras obrigatórias de ingestão (`LEIA-ME_EXECUTOR_SEMANAL.md`, verbatim)

1. Preservar o valor bruto de cada campo e criar valores normalizados separadamente.
2. Separar processo oficial de identificador interno `ND`.
3. Não usar `SITUAÇÃO` isoladamente para decidir se um direito está ativo; derivar
   `status_monitoramento` a partir do último despacho, vigência e revisão jurídica.
4. Preservar a edição histórica da NCL. Classificações nacionais antigas não devem ser tratadas como
   classes Nice atuais.
5. Desdobrar registros multiclasse em uma relação por classe, mantendo a linha original.
6. Normalizar a especificação para busca sem apagar o texto jurídico original.
7. Vincular cada imagem à linha pela âncora do desenho, pois a célula `FIGURA` não contém valor
   textual.
8. Diferenciar titular, cliente/instrutor, agente exterior e procurador.
9. Criar famílias de marca por nome dominante, titular, imagem e CFE; `GRUPO DA MARCA` está vazio na
   fonte.
10. Não usar `SEGMENTO` como segmento econômico: o campo está praticamente vazio e os valores
    existentes parecem referências internas.

### O comparador v1.2.0 — parâmetros exatos

```
combined = 0,55·nominativo + 0,20·fonético + 0,10·classe + 0,15·especificação
affinity = max(classe, especificação)

retenção:  nominativo >= 75
        |  nominativo >= 66 E fonético >= 75
        |  identidade compacta
        |  marca base <= 3 chars: nominativo >= 90 E fonético >= 85
        |  token idêntico >= 5 chars com DF <= 250 E nominativo >= 60

P0: combinado >= 88 | identidade E afinidade >= 60 | (nom >= 97 E fon >= 95 E afinidade >= 40)
P1: combinado >= 80 | (nom >= 92 E fon >= 88)
P2: combinado >= 70 | nom >= 84 | (nom >= 72 E afinidade >= 45)
P3: resto

mesma classe NCL = 100; 44 pares de afinidade tabelados (09/42=88, 05/44=82, 30/43=80, 29/30=78…)
same_owner: SÓ por igualdade exata da chave normalizada (nunca similaridade textual)
limites de índice: DF token 2.500 · DF fonético 2.500 · DF n-grama 5.000
                   2.500 candidatos por n-grama · 6.000 por bloqueio por base
```

⚠️ **P0–P3 é fila de recuperação, não risco.** A própria skill: *"o código recupera e ordena
candidatos; a análise técnico-jurídica e a classificação final são produzidas em etapa posterior"*.

### A especificação tem VETO sobre o score

Caso **Verin × Vaerin** (RPI 2903): nominativo 90,91 · fonético **100,00** · combinado 78,80 →
veredito **BAIXO**, porque `specification = 0,00` e a afinidade 09/42 era *"apenas heurística"*.
Copiar só o combinado reproduz esse falso positivo.

### O portão humano morde

| RPI | publicações analisadas | risco alto | PDFs entregues |
|---|---|---|---|
| 2902 | 16.425 | 6 | **2** |
| 2903 | 21.427 | 6 | **0** (`COMPLETED_NO_CASES_APPROVED`, `REJECTED_ALL`) |
| 2904 | 13.078 | 7 | **1** |

**3 aprovações em 19 casos altos** nas últimas três revistas. Taxas de sinalização declaradas: 0,043%
a 0,11%. Combinações examinadas: 7.046.325 (2902) e 9.192.183 (2903).

Arquitetura de decisão em 3 camadas (RPI 2903): 9.192.183 combinações → 4.036 pares mecânicos →
61 P0/P1 → 32 substantivos → 5 alto / 6 médio / 27 baixo; + 89 P2 → 65 famílias → 8 retidas.

### Dois defeitos já medidos — viram teste de regressão

**(a) `ownerDeduplicationDefect`** (RPI 2903): o dedupe de titular por similaridade textual fundiu
`APEX PROPRIEDADE INTELECTUAL LTDA` com `EIXO PROPRIEDADE INTELECTUAL LTDA` e excluiu **4 pares** de
concorrentes como "mesmo titular". Conserto declarado: *"exigir identificador coincidente ou
igualdade normalizada preservando tokens distintivos; não excluir por similaridade textual difusa"*.

**(b) Normalização de letras separadas** (RPI 2899): interpretou `c.r.i.a.r.` como letras isoladas,
**eliminou o núcleo CRIAR** e derrubou o par abaixo do limiar. Conserto: comparar como `CRIAR`
**preservando o bruto**. ⚠️ `A B`, `A E B` e `A B C` **não** devem ser unidos.

### A régua de contagem de prazo (skill §9.1) — a única escrita na casa

> *"Na regra ordinária, iniciar a contagem no primeiro dia útil após a publicação e contar dias
> contínuos. Verificar prorrogação do vencimento sem expediente e eventuais suspensões/devoluções
> específicas. Não aplicar automaticamente feriados municipais do cliente ou recesso judicial a
> procedimento administrativo."*

- Oposição: **60 dias**, art. 158 LPI, do `IPAS009`.
- PAN: **180 dias**, arts. 168–169, da **concessão/expedição do certificado** — **nunca** do
  deferimento.
- Ação judicial de nulidade: art. **174** (não 173).
- Sem elementos: `deadline_status = pending_confirmation`.
- **Prazo interno é campo distinto do legal** e é configuração (medido: legal − 10 dias em 5 pares).

**Isso não produz os 62 dias: a casa pratica **60 dias** — o "62" que aparecia aqui era artefato de medição, porque as datas de RPI foram derivadas de uma âncora (RPI 2824 + 7 dias por revista), e a diferença era do cálculo, não do escritório. Corrigido pelo Gui em 07/09/2026: **prazo administrativo é 60 dias, ou 30 — 62 não existe**** medidos contra a data da RPI. Fica `firmeza: praticado` até o
Gui confirmar como `legal`.

### O relatório de saída é contrato

Nome: `Apex_RPI_<revista>_Risco_Alto_[PAN_]<MARCA_CLIENTE>_<proc>_x_<MARCA_TERCEIRO>_<proc>_<PT|EN>.pdf`
ID interno: `APEX-RPI<revista>-<proc_cliente>-<proc_terceiro>-<PT|EN>`
2 páginas · bilíngue (PT para titular BR, EN para estrangeiro, **sem tradução automática**) ·
tabela-motor de 5 dimensões (`DIMENSÃO | AVALIAÇÃO | FUNDAMENTO PRINCIPAL`) · fonte com revista, data
e **página** · **a aritmética do prazo é mostrada** (com o art. 6º §2º da Portaria INPI/PR nº 8/2022
para o ajuste de dia útil) · "Nota importante" fixa.

Geometria medida: A4, margens 16 mm, largura útil 178 mm, logo 47×14,5 mm, colunas 89 mm, tabela
34/33/111 mm. Cores `#212121 #00E0F6 #1A6581 #F3F6F7 #DCE5E8 #5D666A #EAF8FB`. Poppins.

⚠️ O snapshot tem constantes da RPI 2899 e caminhos de máquina; a própria skill lista 13 adaptações
necessárias. ⛔ Não transportar os atalhos do wrapper da carga piloto (`KeepTogether._content`, remover o
último `Paragraph` por posição).

---

## 8. Documentos e anexos

`GET /Attachments?$top=0&$count=true` → **31.660 anexos · 26,97 GB** (média 893,35 KB).
**5.048 cards** com anexo (média 5,65 por card). Vínculo: 28.508 ao Deal, 575 ao Contato, 823 à Task.

| extensão | n | MB |
|---|---|---|
| `.pdf` | 20.776 | 15.873,17 |
| **`.msg`** | 5.596 | 8.038,88 |
| **`.eml`** | 1.728 | 2.447,27 |
| `.png` `.jpeg` `.jpg` | 1.897 | 267,55 |
| `.docx` `.doc` | 794 | 299,09 |
| `.ogg` (áudio de WhatsApp) | 486 | 40,81 |

⚠️ **7.324 arquivos (23,13%) e 10,24 GB (38,00%) são e-mail**, não documento — carregam conversa
interna, preço de agente e thread com terceiros. Crescimento ~8 GB/ano.

### 🔴 A URL do anexo do Ploomes é pública

```
host:  stgploomescrmprd01.blob.core.windows.net
query string na URL: NENHUMA (sem SAS, sem assinatura, sem expiração)
STATUS SEM CREDENCIAL: 206 Partial Content
```

Testado em dois certificados de cliente e numa procuração assinada. **Link portador, permanente e
irrevogável**: trocar a senha não fecha, cancelar o contrato não fecha. A proteção hoje é o GUID de
32 hex no caminho — segurança por obscuridade.

> **Regra derivada:** o Wallet **nunca** entrega essa URL. Endpoint próprio que (1) autentica a
> sessão, (2) verifica que o documento é do titular logado, (3) faz proxy do byte, (4) registra o
> acesso. Ou URL assinada de vida curta. ⚠️ O flag `IsSensitiveData` existe no registro do anexo mas
> **NÃO FOI MEDIDO** se muda o comportamento do blob.

### O certificado de registro é o documento pior arquivado

**59 cards de 5.048** têm certificado, **sem campo** (sempre solto), sempre obtido à mão. Não existe
campo de anexo para certificado entre os 64 existentes. **Migrar acervo de certificado é projeto de
digitalização, não de ETL.**

⚠️ **10,40% dos anexos não estão em campo nenhum** (logo não têm classe) e há **campo usado errado no
dado real** (NF do cliente gravada em "Anexar comprovante de pgto da GRU"). → Classificar "o que o
cliente vê" pelo campo de origem **não fecha**. Allowlist **positiva por documento**, com carimbo
humano.

⚠️ **A junção card ↔ pasta do Drive quase não existe:** `contact_F59B071B` "Link da Pasta (Drive)"
está em **186 de 8.418 (2,21%)**.

⛔ **Compartilhar a pasta do Drive com o cliente não é opção:** `03 - FATURA DO AGENTE` é pasta
**irmã** de `08 - CERTIFICADO DE REGISTRO` — entregar a pasta entrega a margem (Br/Ext ~20%).

---

## 9. Prazos — o que a casa pratica

🔴 **Nenhum dispositivo legal está documentado no repo, na memória, no Papi ou no Desktop.**
`grep -rE "\bLPI\b|9\.279|decenal|sobrestamento|art\. ?36"` → **zero**.
(A única exceção é a skill do Codex, recebida em 06/09 — §7 acima.)

O que existe é **prática digitada**. Medindo `Prazo oficial − data de publicação da RPI` (régua
ancorada em RPI 2824 = 18/02/2025, validada em 4 pontos):

| tipo · matéria | n | dias corridos |
|---|---|---|
| exigência · patente | 63 | **90d ×38** · 60d ×15 · 30d ×5 |
| deferimento/concessão · patente | 20 | **60d ×17** |
| **oposição · marca** | 19 | 60d — ⚠️ a medição bruta deu 62d ×19, mas contra data de RPI DERIVADA por âncora; o Gui confirmou em 07/09 que a casa pratica 60 |
| deferimento/concessão · marca | 17 | 60d ×9 · 62d ×7 |
| **recurso ao indeferimento · marca** | 14 | **60d ×14 (100%)** |
| **manifestação à oposição · marca** | 9 | **60d ×9 (100%)** |
| nulidade · marca | 1 | 180d |

⚠️ **O deslocamento de 2 dias é o risco real** — e a skill §9.1 o explica: a contagem começa no
**primeiro dia útil após a publicação**, não no dia seguinte corrido.

### O `Prazo oficial` do CRM não serve como agenda

| medida | valor |
|---|---|
| cards nos 2 funis de serviço | 2.225 |
| com `Prazo oficial` | 1.365 · 61,3% |
| **cards ABERTOS** | **987** |
| ↳ com `Prazo oficial` | 709 · 71,8% |
| ↳ **prazo já VENCIDO** | **651** ⚠️ |
| ↳ prazo futuro | 58 · ≤30 dias: 19 |

Há card aberto com prazo de **24/05/2023**. Uma tela que lesse esse campo como "seus prazos" abriria
com **651 alarmes falsos** no dia 1 — e a equipe aprenderia em uma semana a ignorar o vermelho.

### Anuidade e prorrogação são volume, não exceção

| serviço | cards no CRM | ganhos no comercial |
|---|---|---|
| **Anuidade** | **710** | 269 |
| **Prorrogação** | **350** | 92 |
| Renovação (marca no exterior) | 76 | 16 |

**GRU movimentada: entre R$ 115 mil e R$ 190 mil/ano**, em ~200 a 340 guias. A anuidade tem **pelo
menos 6 códigos** (220 · 224 · 226 · 228 · 240 · **221/225 em prazo extraordinário**) e a prorrogação
de marca o **374**. Um E-renewal que trate "anuidade" como código único emite a guia errada.

Comprovantes reais no Desktop: 11ª Anuidade GRU 226 R$ 2.200,00 · 4ª Anuidade GRU 220 R$ 400,00 ·
Renovação R$ 1.000,00 (Pix, 31/08/2026).

---

## 10. Jurisdições e fontes internacionais

| jurisdição | ativos (cards) | API oficial | termos permitem automação | risco |
|---|---|---|---|---|
| **Brasil — INPI** | **2.005** | bulk RPI semanal ✅ 200 (consulta ao registro: HTML) | sem termo restritivo encontrado | 🟢 (🟡 sem SLA) |
| **Brasil — DI** | 66 | ❌ só PDF (`DI2902.zip` → 302/404) | — | 🔴 |
| **Estados Unidos — USPTO** | 57 | ✅ ODP + TSDR (401 sem chave) | sim, dado público | 🟢 |
| **União Europeia — EUIPO** | 42 | ✅ OAuth2 (401 medido) + Open Data bulk | sim | 🟢 |
| **Patentes europeias — EPO OPS** | 13 + parte dos 42 | ✅ OAuth2, 4 GB/semana grátis | sim, Fair Use | 🟢 — cobre **100+ escritórios** |
| **WIPO — Madri / Global Brand DB** | 19 + 939 pontes | ❌ | ⛔ **PROÍBEM por escrito** | 🔴 |
| **China — CNIPA** | 22 (+71 agentes) | ❌ (HTTP 412) | sem termos em inglês | 🔴 |
| **LATAM — 21 escritórios** | **148** | **NÃO SONDADOS** | — | 🔴 presumir manual |
| MENA / África / CIS | 15 | NÃO MEDIDO | — | 🔴 |

⛔ **Citação verbatim dos termos da WIPO** (Global Brand Database T&C nov/2022; Madrid Monitor Terms
of Use jul/2025): proíbem *"perform automated queries"*, *"bulk acquisition, bulk downloading and
bulk storing of data"* e *"perform web scraping"*; mais de 10 ações/minuto por IP = abuso.
`www3.wipo.int/robots.txt` = `Disallow: /`. `branddb.wipo.int` serve altcha em toda rota.
**Não é zona cinzenta.** O único caminho legítimo é o feed pago (`gbd@wipo.int`).

**270 de 2.225 cards (12,13%) + os 66 de DI não têm origem automatizável** → upload/certificado é
**permanente** para eles, não andaime.

**Distribuição:** 48 jurisdições; Brasil **82,47%** das marcações; INPI + USPTO + EUIPO + CNIPA +
WIPO cobrem **88,95%**; a cauda de 43 países vale 196 marcações.
🔴 **Defeito de dado:** `Coréia do Sul` (3) e `Coreia do Sul` (2) coexistem como valores distintos do
mesmo picklist → normalização por string parte a Coreia em duas jurisdições.

**Matéria:** Marcas 62,93% (MP) / 43,11% (IP) · Patentes 28,74% / 50,67% · **Software + Domínio =
1,53% do nacional** (8 e 1 cards) — desenhar tela de "ativo de software" no Sprint 1 é otimizar 1,5%
da base.

---

## 11. O Papi — o que reusar

**A única cópia viva é `/opt/papi/` na VPS.** O clone em `~/Desktop/TESTE - PAPI/PAPI/` é de
**02/06/2026** (`ca43b29`) e **não tem** o conserto do `Accept` de 01/09 nem `rpi_collector.py`.
md5 diferentes; 1.292 × 1.105 linhas em `pct_pipeline.py`.

| item | estado medido |
|---|---|
| Stack | Streamlit 1.35 + SQLite + `urllib` + `ElementTree`, Python 3.12.3 |
| Onde | VPS, porta **8501**, bind só na Tailscale, systemd com sandbox |
| **Autenticação** | 🔴 **ZERO** — `grep -niE "password\|senha\|login\|auth"` em 3.310 linhas → **0** |
| Cron | `/etc/cron.d/papi-rpi`, diário 05:40 BRT, funcionando (log de 05/09) |
| Banco | `prospeccao.db`, 6,34 MB, **7.869 prospects** (inclui desqualificados), 7.735 processos distintos |
| Fila real | 7.291 encerrados · 452 aguardando timing · 126 liberados |
| ⚠️ Operação | **1 interação em 80 dias**; 7.855 de 7.869 parados na Etapa 1; `ploomes_link` em **0** |
| ⚠️ O aviso | escreve `papi-rpi-aviso.json` todo dia e **nenhum dos 31 workflows do n8n o lê** |

**Reusar:** descoberta da revista pelo índice (recusa deliberadamente calcular por "semanas desde uma
âncora" — feriado desalinha e o erro seria silencioso) · download + descompactação + `sanitiza()`
(sem ele o XML de Marcas é recusado inteiro) · idempotência lida do **banco**, não de
arquivo-marcador · backup antes de escrever, abortando se falhar · **calendário útil brasileiro** com
Páscoa e feriados móveis (`pct_pipeline.py:200-273`).

**Não reusar:** o `main()` · o filtro `DESPACHO_ALVO` (descarta 3.343 de 3.537 processos) · o caminho
por PDF · e sobretudo a **tolerância a falha silenciosa** (`if not match: continue`,
`except sqlite3.Error: return False`). Prospecção tolera perder; acompanhamento não.

| | Papi (prospecção) | Wallet (acompanhamento) |
|---|---|---|
| chave | **o despacho** (leio o 2.10, pego todo mundo) | **o processo** (tenho N, pergunto o que saiu) |
| quem eu quero | quem **não** é meu cliente | exatamente quem **é** |
| códigos | **1** | **76** (patentes) / **64** (marcas) |
| custo do erro | perder um lead | **perder um prazo do cliente** |
| silêncio é | tolerável | **inaceitável** |

---

## 12. Comunicação com o cliente — o que existe hoje

**Praticamente nada é automático.**

| canal | vai ao cliente? | prova |
|---|---|---|
| **31 workflows n8n vivos** | ❌ **ZERO** | busca por `whatsapp` → 0; todos Slack interno, sync ou webhook |
| E-mail transacional | ❌ **nenhum provedor configurado** | varredura do Desktop por `smtp\|sendgrid\|resend\|mailgun\|nodemailer\|postmark\|ses\|brevo` → só falsos positivos |
| **Carta do APOL** | ✅ **a única** | `.msg` de 12/07/2022, link `ld2.ldsoft.com.br/apol/visualizarnavega.asp?prpi=2688&ppro=921000107&pdes=I235` |
| E-mail de boas-vindas (Ploomes) | ✅ | memória; **não medido na fonte** |
| WABA | ❌ **não existe** | 0 workflows, 1 arquivo em `docs/sprint3/` (o guia) |

**A anatomia da carta do APOL** — 6 blocos, e é a especificação do Sprint 2:
`{rpi_numero, rpi_data, despacho_codigo, despacho_titulo, processo, marca, classe_nice, titular,
pais, imagem_marca, corpo_do_despacho, chamada_comercial}`. Assunto:
`(I235) APPEAL REJECTION - LEGAL ACTION SUGGESTION (Your Ref.: -) (Our Ref.: 921000107) (RPI: 2688)`.

⚠️ **A casa tem 1 texto de despacho, de 64/76 códigos por revista.** O de-para código → texto mora no
APOL.

⛔ **Ordem de desligamento:** desligar o APOL antes do motor de cartas apaga a **única** comunicação
automática de processo que existe. Um cumprimento de exigência tem 60 dias e a omissão gera
arquivamento definitivo (art. 159 LPI).

**O checklist prova que a carta é manual:** no snapshot do OS, `Carta enviada ao cliente?` está
pendente em **22 de 56 cards**; `Anexar carta` em 7. O passo "Comunicação oficial ao cliente" aparece
em **56 de 56**.

⚠️ **`mp|2.06.92` "Taxa de Mensageria e Whatsapp"** no DRE são **700 títulos, R$ 507,44, 100% do
ASAAS** — taxa de notificação de cobrança, **não é canal de WhatsApp**. Quem ler essa linha e
concluir "já temos WhatsApp" está errado.

---

## 13. Fronteira e segurança — o que o Wallet herda como exigência

> ⚠️ **O diagnóstico de segurança do BI não mora neste repositório.** Ele existe, é da mesma casa
> e está na lista do Gui — mas é sobre **outro sistema**, e este repo é clonado por gente de fora.
> Medição, valores e caminhos ficam fora do versionamento, por decisão de 07/09/2026.

O que interessa ao OpenIpWorld é a **conclusão de projeto**, e ela é curta:

| # | exigência | por que, em uma linha |
|---|---|---|
| 1 | **Autenticação no servidor, nunca no navegador** | comparar hash no cliente entrega a lista de perfis a quem abrir o código-fonte da página |
| 2 | **Sessão revogável do lado do servidor** | sessão que o próprio navegador revalida se renova sozinha quando alguém edita o armazenamento local |
| 3 | **bcrypt custo ≥ 12, senha ≥ 16 caracteres, zero reuso entre perfis** | é o único padrão da casa que resistiu a ataque medido |
| 4 | **Um perfil, um segredo** | perfis que dividem credencial tornam o log incapaz de dizer quem entrou |
| 5 | **Allowlist positiva por arquivo, e o nome de backup coberto junto** | regra estreita no arquivo vivo não cobre a cópia `.bak`, e a cópia serve o mesmo conteúdo |
| 6 | **`return 404` como padrão do vhost, não catch-all** | o que não foi liberado explicitamente não deve existir para quem pede |
| 7 | **Nenhum serviço sem autenticação, mesmo dentro da rede privada** | "está atrás da VPN" não é controle de acesso; é uma porta a menos, não zero |
| 8 | **Segredo nunca no repositório, nem em snapshot de workflow** | já aconteceu na casa, com chave de API em claro versionada — é o modo de falha conhecido daqui |

⚠️ **Exposto ≠ vulnerável.** Porta aberta que exige credencial forte é *superfície*; vira brecha
quando a credencial é fraca ou quando a porta não devia estar ali. Tentativa de login vinda de
varredor automático é **ruído de fundo**, não ataque.

---

## O que NÃO foi medido (honestidade)

- **A base do APOL.** Sem credencial; a chave está em `~/Desktop/Documentos/APOL (CHAVES).txt` e
  **não foi aberta**, por regra da fase. Quantos ativos há lá e como exporta: desconhecido.
- **O que o Webseek faz.** Zero documentação em qualquer lugar.
- **A 4ª cobrança Vela** (R$ 443,60 → 1.206,09, nov/24–mar/26): produto não identificado.
- **A política exata que leva 1.540 → 429.**
- **O XML de Marcas completo** para todos os campos de prioridade/edição — o parser do Codex não
  preserva integralmente.
- **Os 21 escritórios LATAM**, um a um. 148 ativos dependem disso.
- **CIPO (Canadá), KIPRIS (KR), JPO** — `jpo.go.jp` devolveu 403 à sonda.
- **Endpoints da WIPO** — não sondados **por decisão**: sondar seria o ato que os termos proíbem.
- **O flag `IsSensitiveData`** do anexo do Ploomes.
- **As ACLs do Drive:** `get_file_permissions` devolveu só o `owner` em 3 pastas testadas — não prova
  ausência de compartilhamento externo. **Auditoria obrigatória antes do Wallet**: se já houver link
  público, o Wallet não é a primeira porta.
- **Se o Business Manager da Apex já está verificado** na Meta — exige login, fora do escopo.
- **`servicos.json` local está de 17/06/2026** (56 cards). Os números do CRM vivo (963 + 1.262 deals)
  são a medida boa; os 56 cards serviram só para provar o **formato**.
