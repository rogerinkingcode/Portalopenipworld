# Para o Breno — o que você precisa saber antes da primeira linha

> Escrito pelo Gui com o Claude Code em 06/09/2026, a partir de duas rodadas de medição sobre o
> CRM, o Drive, a VPS e a RPI do INPI. Tudo que tem número aqui foi **medido** — a prova está em
> [`docs/MEDICOES-2026-09.md`](docs/MEDICOES-2026-09.md). Onde não medimos, está escrito
> "NÃO MEDIDO". Você vai encontrar coisas que contradizem o que se assume sobre a casa; confie no
> número, não na suposição.

## 1. O que você recebe neste clone

| arquivo | leia para |
|---|---|
| `README.md` | o que é, como rodar |
| `PLANO.md` | o produto, os sprints, as entidades, o que falta decidir — **§3 tem a fronteira do seu Sprint 3** |
| `CONTRATO-DADOS.md` | **o formato que a sua API produz.** Upload manual, parser da RPI e a sua API produzem o mesmo objeto. §14 tem o que você precisa confirmar |
| `CLAUDE.md` | as regras de código e de fronteira, com o incidente da casa que justifica cada uma |
| `PERGUNTAS-ABERTAS.md` | o que ninguém decidiu ainda. Pergunta sem dono é adiada, não respondida. Se você decidir algo sozinho, registre lá com data |
| `PROJECT_CONTEXT.md` | **o estado vivo**: onde estamos hoje, as 12 decisões travadas, o que bloqueia e de quem é. O `PLANO.md` diz para onde vamos; este diz onde estamos — quando divergirem, **este ganha** |
| `SKILLS.md` | as lições, cada uma com o **incidente** que a gerou — regra sem incidente vira folclore e a próxima pessoa ignora. Leia antes de mexer na projeção ou em componente que serve as duas visões |
| `memoria/` | memória persistente: **um fato por arquivo**, com índice em `memoria/MEMORY.md`. É onde uma confirmação do Gui vira registro datado em vez de ficar só na conversa |
| `docs/MEDICOES-2026-09.md` | a evidência. Antes de "eu acho que o CRM tem…", olhe a tabela |
| `dados-exemplo/` | dados **fictícios** no formato do contrato. Use para desenvolver; nunca dado real |

O front do Sprint 1 (Next + TS + Tailwind, banco no navegador) nasce aqui para você **assumir** —
não é protótipo descartável; é o contrato visual e a camada de repositório que a sua API vai
preencher.

## 2. As onze coisas que mudam como você desenha a base

1. **O Ploomes não tem o ciclo de vida do ativo.** 0 de 488 campos para depósito, concessão,
   vigência, anuidade, prorrogação, oposição. Ele é histórico de contratação — nunca fonte do
   ativo. A camada que você constrói é a que a casa nunca teve.
2. ⚠️ **A carteira NÃO vem da revista — vem da base do INPI.** A RPI só lista quem teve despacho
   na semana. A carteira é o conjunto de processos em que a Apex é **procuradora**, obtido por
   consulta ao registro: hoje por planilha (base-mestra), no seu Sprint 3 **automaticamente por
   procurador** — é esse o "scraping" que você está construindo. A RPI entrega **duas coisas
   diferentes**: (a) despachos dos processos que já monitoramos → eventos e prazos; (b) publicações
   de terceiros → candidatas de colidência. O `procurador` na revista serve só como **alerta de
   cadastro** ("apareceu em nosso nome e não está na carteira"), nunca cadastro automático.
   O XML de Marcas traz `procurador` estruturado (33.625 na RPI 2904) e `data-vigencia` /
   `data-concessao` nativas; a Apex aparece em **duas grafias** (11 processos), então a lista de
   grafias é dado versionado, editável sem deploy — `WHERE procurador = 'Apex'` perde 3 de 11.
3. **O XML de Patentes não tem procurador** (zero), nem vigência, nem anuidade. **DI só sai em PDF**
   (`DI####.zip` → 302/404). Patente entra por número; DI por upload com `vigilancia.ativa=false`.
4. **Titular ≠ cliente** em 16,05% dos serviços nacionais e 97,51% dos estrangeiros; o titular está
   **anônimo** em 61,54% / 75,71% desses. **69,6% dos ativos apontam pelo `ContactId` para um agente**
   (os três maiores concentram 322 ativos: 120, 119 e 83). Autorização deriva de **vínculo**, nunca de
   `ContactId`. Uma mesma pessoa é cliente MP, cliente IP, IPartner **e**
   correspondente ao mesmo tempo — papel é da relação.
5. **O número do processo mora no título do card**, 22× mais que no campo (3.322 × 1.692; só 82
   exclusivos do campo). 286 títulos carregam **mais de um** número — serviço ↔ ativo é **N:N**.
   O extrator cobre 4 gramáticas: `912000101` · `BR 102022000101-0` (**preservar o dígito
   verificador** — um `\d{9,}` o joga fora e o casamento com a RPI falha) · `PCT/CN2022/000101` ·
   `29/000,101` · `EP3000101` · `501000108` (Madri — 9 dígitos começando com 5, **idêntico ao
   formato de id de card do Ploomes**).
6. **17,86% dos ativos vivos não têm número** (pedidos em nascimento). `ativo_id` é ULID emitido na
   criação e **a sua API aceita o id vindo do cliente**. Sem isso, a conciliação feita no MVP não
   casa com o seu dado.
7. **A base-mestra existe**: `Base_Processual_Apex_ATUAL.xlsx` (Drive, 1.540 linhas, 03/09) com 10
   regras de ingestão escritas (`LEIA-ME_EXECUTOR_SEMANAL.md`) — transcritas em
   `docs/MEDICOES-2026-09.md` §7. Ela é a primeira carga **e** o formato canônico. ⚠️ Ela nasce de
   uma **exportação manual do Webseek** — o fornecedor que o seu Sprint 3 substitui. Entregue a
   origem alternativa **antes** de o Webseek ser cortado.
8. **O método de colidência já é software** (pipeline, SHA-256, tiers, 4 scores, portão humano).
   **A especificação tem veto sobre o score**: Verin × Vaerin, fonética 100,00, combinado 78,80,
   veredito BAIXO. Taxa de aprovação humana: 3 em 19 casos altos. O portão é feature. Dois defeitos
   já medidos viram teste de regressão: dedupe de titular por similaridade textual (APEX × EIXO
   PROPRIEDADE INTELECTUAL fundidos) e normalização que apagou o núcleo de `c.r.i.a.r.`.
9. **A URL do anexo do Ploomes é pública**: `stgploomescrmprd01.blob.core.windows.net/…` responde
   **206 sem credencial**, sem SAS, sem expiração (testado em dois certificados). **Nunca** em
   `href`, `iframe` ou JSON que chega ao navegador. Documento sai por endpoint seu que autentica,
   verifica posse, faz proxy do byte e registra.
10. **Nenhum prazo legal está documentado na casa.** O que existe é prática: oposição de marca dá
    60 dias, como manda o art. 158 (o "62" medido era artefato de âncora de RPI). `Prazo oficial` do CRM tem 651 de 709 **já vencidos** em cards
    abertos — é registro, não agenda. Prazo carrega régua e **firmeza**; anuidade e prorrogação
    entram como `estimado` até o Gui confirmar.

11. **As skills do Codex estão no repo** (`referencias/codex-colidencias/`): as duas `SKILL.md`,
    o comparador `match_pipeline_pdfderived.py` v1.2.0, o renderer do parecer
    (`generate_reports.py` / `generate_pan_reports.py`), o `case.schema.json` v1.1, os logos e a
    Poppins com a licença OFL. **É especificação de domínio + snapshot de referência, não backend
    pronto** — a própria skill lista as adaptações necessárias. O comparador vira TS no Sprint 1B
    com os **12 testes de regressão** da skill §14; o **renderer fica em Python** ao lado, e o
    Wallet emite o `case` v1.1 para ele. ⚠️ Os snapshots ainda têm constantes da RPI 2899 e caminhos
    de máquina: nada disso vai para produção sem virar configuração.

## 3. O que se exige de você (o Gui pediu que isto fosse explícito)

- **Endpoints e schema da API documentados neste repo**, no formato do `CONTRATO-DADOS.md`, antes
  de o front ser ligado a ela. Você é dono da implementação; o contrato é compartilhado e
  versionado.
- **Resposta às 7 perguntas do `CONTRATO-DADOS.md` §14**, por escrito, na primeira semana. A nº 1
  (documento ou estado?) muda a idempotência inteira.
- **`fonte`, `vigilancia` e `cobertura` preenchidos** — o painel promete vigilância; onde você
  não vigia, o dado tem de dizer.
- **Dono de campo declarado.** O sync do CRM **nunca** sobrescreve `decisao_humana`.
- ⛔ **Nenhum conector, scraper ou consulta automatizada para WIPO (Madrid Monitor, Global Brand
  Database) nem CNIPA.** Os termos da WIPO proíbem por escrito *"perform automated queries"* e
  *"perform web scraping"* (T&C nov/2022; Madrid Monitor Terms jul/2025, >10 ações/min = abuso);
  `www3.wipo.int/robots.txt` = `Disallow: /`; `branddb` serve altcha em toda rota; CNIPA devolve
  HTTP 412. Não é zona cinzenta. O caminho legítimo para Madri é o feed pago.
- **XML sempre, PDF nunca como padrão.** Quando o XML faltar, a degradação é declarada no envelope.
- **Vigia que avisa quando não roda.** O Papi ficou 9 dias em silêncio quando o INPI mudou o
  comportamento do header `Accept` (`application/json` → 404).

## 4. Fronteira Sprint 1 (front) × Sprint 3 (sua base)

**O front assume que vai existir:** ativo com `jurisdicao` como código, **vindo da base do INPI**
(não da revista); para BR-marca e BR-patente, evento datado com revista e código; para BR-marca,
`data_vigencia` e `data_concessao`; `procurador` como campo; envelope com `cobertura`.

**O front nunca calcula:** prazo (lê `vence_em` + régua), situação (vem com o evento que a
produziu), anuidade/prorrogação, conversão de moeda, casamento titular ↔ cliente (é decisão
humana registrada).

**Ordem recomendada do Sprint 3, dimensionada pela carteira real:**

| ordem | fonte | cobre | acesso |
|---|---|---|---|
| 1º | **INPI BR — consulta ao registro por procurador** = a **carteira** | **1.951 de 2.225** pares (87,7%) | consulta pública (HTML com sessão), sem termo proibitivo encontrado; sem SLA → vigia obrigatório |
| 2º | **INPI BR — XML semanal da RPI** = eventos + colidências | os mesmos 87,7% | bulk público, sem chave |
| 3º | EPO OPS | patentes de 100+ escritórios (UE, CN, JP, KR, IN) | OAuth2, 4 GB/semana grátis |
| 4º | EUIPO (42) · USPTO (57) | ~100 | OAuth2 / API key |
| — | tudo o mais (LATAM 148, CN 22, MENA 15, DI 66) | 12,13% + DI | **upload/certificado**, `vigilancia.ativa=false` |

Não construir conector para base onde a Apex **não tem ativo** (Malásia, Israel, Turquia,
Cazaquistão, Áustria, Noruega, Malta têm agente e zero ativo).

## 5. O que reusar do Papi — e de onde

**A única cópia viva é `/opt/papi/` na VPS** — o endereço vem junto com o teu acesso ao
Tailscale, não num repositório. O clone em
`~/Desktop/TESTE - PAPI/PAPI/` é de **02/06/2026** e não tem o conserto de 01/09 nem
`rpi_collector.py`. Reusar: `bin/papi_rpi.py` (descoberta pelo índice `revistas.inpi.gov.br/rpi/`,
download, `sanitiza()`, idempotência pelo banco, backup) e `pct_pipeline.py:200-273` (calendário
útil br com Páscoa). **Não** reusar: `main()`, `DESPACHO_ALVO`, caminho PDF, `if not match:
continue`, `except sqlite3.Error: return False`.

## 6. Populações, para não superdimensionar

- 390 entidades com identidade no CRM (264 clientes MP + 121 IP − 2 + 129 agentes com contato);
  536 contando 146 agentes **sem** `contact_id` (só existem como string de fatura/extrato).
- Cliente final: mediana **1** ativo, p90 = 4, máx 21 → **lista**. Parceiro/agente: mediana 3,
  p90 = 22, máx 90 → **busca com paginação**.
- 48 jurisdições; Brasil 82,47%; as 5 bases citadas cobrem 88,95%.
- Software + domínio = 1,53% do nacional. Não desenhar tela para isso no Sprint 1.
- 31.660 anexos / 26,97 GB, crescendo ~8 GB/ano; 38% do volume é e-mail `.msg`/`.eml` — nunca vai
  à vitrine do cliente.
- Convite por e-mail: 337 de 385 clientes; **26** com e-mail compartilhado entre entidades →
  segundo fator obrigatório. Os JSONs do BI têm **zero** e-mails; o convite puxa do Ploomes.

## 7. O que NÃO está neste clone, e por quê

- Chave, token, `.env`. O repo do BI tem a chave do Ploomes **em claro num arquivo versionado**;
  aqui o `.gitignore` nasceu antes do primeiro commit.
- Dado real de cliente. Os JSONs do BI (`clientes`, `servicos`, `correspondentes`) são nome,
  valor e carteira de agente.
- A base-mestra real. Você recebe o **formato** e um exemplo fictício; a carga real é feita pelo
  Gui/Márcio no ambiente deles.
- Os PDFs de relatório de colidência reais e as skills do Codex com material da casa. O Gui está
  separando o que pode entrar como documentação de domínio.

## 8. Perguntas para você (respostas vão no `PERGUNTAS-ABERTAS.md`, datadas)

1. A API é fonte de **documento** (lote datado de eventos) ou de **estado** (CRUD)? Se estado, o
   evento que produziu a situação vem junto?
2. Aceita `ativo_id` (ULID) do cliente no `POST`?
3. Qual banco, qual linguagem, qual hospedagem? (a decisão de servidor separado está tomada;
   onde, não)
4. Como você versiona o contrato sem quebrar o front publicado?
5. Há homologação separada de produção?
6. O scraping que você está construindo mira **quais** fontes? (ver §3, ⛔)
7. Como a sua base recebe o upload manual — mesmo endpoint da API, ou importador à parte?
8. Documentos: proxy autenticado ou URL assinada de vida curta? Onde o byte mora?
