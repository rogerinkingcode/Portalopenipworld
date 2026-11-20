# OpenIpWorld — CONTRATO DE DADOS · v0.1

> **Este é o documento mais importante do projeto.** O upload manual produz este formato. O
> parser da RPI produz este formato. A API do Breno produz **este mesmo formato**. Assim a fase 2
> é troca de **origem**, não troca de **lógica** — e a tela nunca é reescrita.
>
> Estado: **v0.1, proposta — aguarda o aceite do Gui e a leitura do Breno.** Toda mudança de
> campo passa por aqui, com versão e data. A versão vai no envelope de todo arquivo.
>
> Os tipos abaixo estão em TypeScript porque no projeto **o tipo é o contrato executável**: o
> mesmo tipo valida a planilha importada, o JSON exportado e a resposta da API. A referência
> humana é este arquivo; a referência de máquina será `src/contrato/*.ts` no MVP.

---

## 0. Regras que valem para tudo

1. **Bruto preservado ao lado do normalizado.** Todo valor que sofre normalização guarda o original
   (`valor_bruto` / `valor_normalizado`). Regra 1 do `LEIA-ME_EXECUTOR_SEMANAL.md`; é o que salvou
   o caso `c.r.i.a.r.` → `CRIAR`.
2. **O pacote declara o que não sabe.** Toda lista tem a sua própria `completude`; o envelope tem
   `cobertura` e `lacunas[]`. Zero nunca substitui ausência.
3. **Nada derivado é gravado.** `dias_restantes`, contadores, totais: calculados na leitura, com
   `hoje` explícito.
4. **Identidade é opaca e emitida.** `*_id` são **ULID** (26 chars, ordenáveis por tempo), gerados
   por quem cria o registro, aceitos pela API na criação, **nunca** reatribuídos. Nunca derivados
   de número de processo, nome ou documento.
5. **Fonte em tudo.** Ativo, evento, prazo, documento, vínculo e colidência carregam `fonte`, com
   valores fechados (§1.3).
6. **Datas em ISO-8601 com fuso.** Instantes: `2026-09-01T13:00:00-03:00`. Datas civis (publicação,
   vencimento): `2026-09-01` — e a régua diz o fuso e o calendário.
7. **Moeda nunca é somada entre moedas.** Valor, quando existir, carrega `moeda`.
   **Quem decide se ele chega ao cliente é a procedência, não uma flag** — ver §11.
8. **Nome nunca é chave.** Mesmidade de pessoa é por documento ou por decisão humana registrada.
9. **Papel é da relação, não da pessoa.** Uma pessoa é titular de um ativo e agente de outro.
10. **O que o cliente não pode ver não está no arquivo dele.** A projeção é por lista branca
    executável (§11), nunca por flag.

---

## 1. Envelope

Todo arquivo que circula — upload, exportação, resposta de lote da API — é um `Pacote`.

```ts
type Pacote = {
  contrato_versao: '0.1';
  gerado_em: string;                         // instante ISO com fuso
  gerado_por: {
    modo: 'upload_manual' | 'rpi_xml' | 'api' | 'exportacao';
    autor?: string;                          // pessoa ou sistema
    ferramenta?: string;                     // ex.: 'ipaw-front@0.1.0', 'papi_rpi.py'
  };
  cobertura?: {                              // o que foi lido para produzir este pacote
    revistas?: { tipo: 'marcas' | 'patentes' | 'di'; numero: number; data: string;
                 sha256?: string; fonte_formato: 'xml' | 'pdf' | 'txt' }[];
    periodo?: { de: string; ate: string };
  };
  completude: {                              // por lista, nunca global
    pessoas: Completude; ativos: Completude; vinculos: Completude; eventos: Completude;
    prazos: Completude; documentos: Completude; servicos: Completude; colidencias: Completude;
  };
  lacunas: { onde: string; motivo: string }[]; // ex.: { onde:'eventos', motivo:'XML da RPI 2904 indisponível (403); derivado do PDF com validação amostral' }
  pessoas: Pessoa[];
  ativos: Ativo[];
  vinculos: Vinculo[];
  eventos: Evento[];
  prazos: Prazo[];
  documentos: Documento[];
  servicos: Servico[];
  colidencias: Colidencia[];
  comunicados?: Comunicado[];                // só em pacotes internos
};

type Completude = { completo: boolean; motivo?: string; n: number };
```

### 1.3 Fontes (vocabulário fechado)

```ts
type Fonte =
  | 'inpi_consulta'        // consulta ao REGISTRO do INPI por procurador — e a origem da CARTEIRA
  | 'rpi_xml'              // XML semanal da RPI — o que MUDOU (despachos e publicacoes de terceiros)
  | 'rpi_pdf'              // PDF da RPI — degradação declarada, nunca padrão
  | 'api_oficial'          // EUIPO, USPTO, EPO OPS…
  | 'upload_manual'        // planilha/JSON subido por operador
  | 'certificado_agente'   // documento enviado pelo correspondente
  | 'declarado_cliente'    // informado pelo cliente/parceiro no portal
  | 'ploomes'              // histórico de contratação (nunca dado do ativo)
  | 'decisao_humana';      // conciliação, parecer, aprovação
```

---

## 2. Pessoa

```ts
type Pessoa = {
  pessoa_id: string;                         // ULID
  tipo: 'fisica' | 'juridica';
  nome: string;                              // como consta
  nome_normalizado: string;                  // upper, sem acento — para busca, NUNCA para dedupe
  razao_social?: string;
  documentos: { tipo: 'cnpj' | 'cpf' | 'estrangeiro'; valor: string; pais: string }[]; // pode ser vazio (titular anônimo)
  pais: string;                              // ISO-3166-1 alfa-2
  uf?: string;
  gerido_por?: string;                       // pessoa_id do PARCEIRO que cadastra/gere este cliente final (§6 do PLANO)
  contato?: {                                // INTERNO — nunca vai ao pacote do cliente
    emails: string[]; telefones: string[]; email_compartilhado: boolean;   // 26 casos medidos exigem 2º fator
  };
  externo: { ploomes_contact_id?: number; omie_codigo?: string; apol_id?: string }; // chaves de outros sistemas, só referência
  fonte: Fonte;
  criado_em: string;
  atualizado_em: string;
};
```

⚠️ `TypeId` do Ploomes decide `tipo` (0 contradições em 1.567). Heurística de nome perde 202 PJ.
⚠️ **Dedupe de pessoa é por documento** ou decisão humana. O defeito `ownerDeduplicationDefect`
(APEX × EIXO PROPRIEDADE INTELECTUAL fundidos por similaridade textual) é teste de regressão.

---

## 3. Ativo

```ts
type Especie =
  | 'marca' | 'patente_invencao' | 'modelo_utilidade' | 'certificado_adicao'
  | 'desenho_industrial' | 'programa_computador' | 'indicacao_geografica'
  | 'dominio' | 'direito_autoral';
// NUNCA 'patente' genérico: PI = 20 anos do depósito, MU = 15, DI = 10+3×5 — vigências diferentes.

type Jurisdicao = string;   // ISO-3166-1 alfa-2 + escritórios: 'BR','US','EM'(EUIPO),'WO'(Madri/PCT),'EP','EA','OA','AP','CN'…
                            // CÓDIGO, nunca string de país: a picklist do CRM tem 'Coreia do Sul' E 'Coréia do Sul'.

type Identificador = {
  tipo: 'inpi_marca' | 'inpi_patente' | 'inpi_di' | 'inpi_programa' | 'pct' | 'madri' | 'euipo'
      | 'uspto_serial' | 'uspto_reg' | 'ep' | 'nacional_estrangeiro' | 'nd_interno' | 'outro';
  valor_bruto: string;                       // como veio: 'BR 10 2022 000101-0', '936000104 (3º)'
  valor_normalizado: string;                 // 'BR102022000101-0' — DÍGITO VERIFICADOR PRESERVADO
  jurisdicao: Jurisdicao;
  papel: 'pedido' | 'registro' | 'publicacao' | 'internacional' | 'interno';
  desde?: string; ate?: string;              // vigência do identificador (pedido vira registro)
  fonte: Fonte;
};
// `nd_interno` (8 casos na base-mestra) NUNCA é convertido nem comparado como número INPI (regra 2 do LEIA-ME).

type Ativo = {
  ativo_id: string;                          // ULID — opaco, imutável, emitido por quem cria
  especie: Especie;
  jurisdicao: Jurisdicao;
  identificadores: Identificador[];          // lista; um ativo sem número ainda tem lista vazia + `pendencias`
  familia_id?: string;                       // agrupa a mesma marca em várias classes/jurisdições (regra 9 do LEIA-ME)
  marca?: {
    nome: string; nome_normalizado: string;
    apresentacao?: 'nominativa' | 'mista' | 'figurativa' | 'tridimensional' | 'posicao' | 'sonora' | 'outra';
    natureza?: 'produto' | 'servico' | 'coletiva' | 'certificacao';
    classes: { codigo: string; edicao_ncl?: string; especificacao_bruta?: string; especificacao_normalizada?: string;
               status?: string }[];          // UMA relação por classe (regra 5); edição preservada (regra 4)
    cfe?: string[];                          // classificação de Viena
    imagem?: { documento_id: string; hash: string };  // referência — a imagem NÃO vem no XML
  };
  patente?: {
    titulo?: string; ipc?: string[]; inventores?: string[];
    pct?: { numero: string; data: string }; ompi?: { numero: string; data: string };
    prioridades?: { numero: string; data: string; pais: string }[];
  };
  datas: {                                   // civis, ISO; null quando desconhecida — NUNCA inventar
    deposito?: string | null; publicacao?: string | null; concessao?: string | null; vigencia_ate?: string | null;
    procedencia: Partial<Record<'deposito'|'publicacao'|'concessao'|'vigencia_ate', { fonte: Fonte; observado_em: string }>>;
  };
  situacao: {
    codigo?: string;                         // código do último despacho relevante
    texto: string;                           // ex.: 'Registro em vigor', 'Pedido em exame'
    evento_id?: string;                      // o evento que a produziu — situação é opinião derivada de fato
    derivada_em: string;
    fonte: Fonte;
  };
  vigilancia: {
    ativa: boolean;                          // ⛔ default FALSE. Só vira true quando existe feed que cobre a jurisdição
    elegivel: boolean;                       // decisao de NEGOCIO: entra no cruzamento semanal? (a regua 1.540 -> 429)
    motivos: string[];                       // por que NAO e elegivel: 'terminal', 'indeferido', 'fora da politica da carga piloto'...
    motivo?: string;                         // obrigatório quando ativa=false: 'DI: RPI só em PDF', 'CN: sem API; certificado do agente'
    fonte_feed?: Fonte;
    atualizado_em?: string;                  // POR ATIVO — nunca carimbo global
    proxima_verificacao?: string;
  };
  pendencias: { tipo: 'sem_numero' | 'titular_anonimo' | 'classe_inferida' | 'imagem_ausente' | 'especificacao_ausente' | 'outro';
                detalhe?: string }[];
  fonte: Fonte;
  externo: { apol_processo?: string; ploomes_deal_ids?: number[]; base_mestra_linha?: number };
  criado_em: string;
  atualizado_em: string;
};
```

---

## 4. Vínculo (pessoa × ativo × papel × vigência)

### O modelo de papéis, definido pelo Gui em 06/09/2026

| papel | quem é | observação |
|---|---|---|
| **titular** | o dono do direito | **A procuração é SEMPRE com o titular.** |
| **cliente** | quem compra — e bate com o Ploomes | Pode ser o titular, mas nem sempre: escritórios de PI contratam a Apex **para os titulares que são clientes deles** (é o caso da APEX IP) |
| **contato** | a quem a comunicação vai | Normalmente o contato do Ploomes, e em regra **quem fechou o negócio** que gerou aquele ativo — ou aquela **etapa** dentro dele. Por isso pode variar por serviço |
| **parceiro** | IPartner que revende | vê os ativos dos clientes dele |
| **agente** | correspondente no exterior | ⛔ nunca publicável ao cliente — desintermediação |
| **procurador** | quem consta no INPI | é a Apex; é a chave da consulta ao registro |

A automação virá da sincronização com os órgãos de cada país e do **protocolo do pedido inicial**,
onde constam titular, endereço e as demais qualificações. Mas o cadastro e o ajuste humano
continuam existindo — como em todo sistema de gestão de ativos. É isso que a `confianca` do
vínculo modela.

```ts
type Papel =
  | 'titular' | 'cotitular' | 'cliente' | 'contato' | 'parceiro'
  | 'agente' | 'procurador' | 'licenciado' | 'cedente' | 'cessionario';

type Vinculo = {
  vinculo_id: string;
  ativo_id: string;
  pessoa_id: string;
  papel: Papel;
  // Onde o papel vale. `ativo` é o padrão (titular, cliente, parceiro).
  // `servico` existe porque o CONTATO muda por etapa: quem fechou o depósito pode não ser quem
  // fechou a anuidade três anos depois — e a comunicação vai para quem fechou aquela.
  escopo: 'ativo' | 'servico';
  servico_id?: string;                       // obrigatório quando escopo === 'servico'
  desde?: string; ate?: string;              // transferência de titularidade fecha um e abre outro
  ordem?: number;                            // co-titulares: 1..4
  fonte: Fonte;
  decidido_por?: string;
  // derivado   = o sistema inferiu (protocolo, sync do órgão, CRM) e ninguém olhou ainda
  // confirmado = alguém confirmou
  // manual     = alguém digitou
  // ⚠️ O sync NUNCA sobrescreve `confirmado` nem `manual` — regra de dono de campo.
  confianca: 'derivado' | 'confirmado' | 'manual';
  publicavel: boolean;                       // ⛔ default FALSE — só vira true por decisão registrada
};
```

Regras:
- **Autorização de visão deriva de vínculo, nunca de `ContactId`.** 69,6% dos ativos apontam pelo
  `ContactId` para o agente.
- Default de `publicavel` é **false**. Um parceiro/agente **nunca** enxerga por omissão.
- `titular` pode não existir (titular anônimo, 61,54%/75,71%). O ativo então tem
  `pendencias: [{tipo:'titular_anonimo'}]` e **não é publicável** a ninguém.
- **O que o sync derivar entra como `derivado`.** Só um humano o promove a `confirmado`. É isso que
  permite automatizar sem apagar o que alguém já corrigiu à mão.

### ⚠️ `contato` é rastreabilidade, NÃO é escopo de visão

Decisão do Gui (06/09): registrar o contato serve para **saber quem contratou e quem autorizou**
cada serviço — é cadastro e trilha. **Não restringe o que a pessoa enxerga.**

> *"É bom registrar para ver quem contratou o serviço (cadastro do usuário e quem autorizou), mas
> claro que o login do usuário responsável ele consegue ver tudo, mesmo que mais de um contato
> tenha autorizado serviços se for o caso."*

Na prática:

| | quem define | efeito |
|---|---|---|
| **o que o login enxerga** | os vínculos de `titular` / `cliente` / `parceiro` da pessoa logada | o portfólio **inteiro** daquele titular ou cliente |
| **quem autorizou cada serviço** | o vínculo `contato` com `escopo: 'servico'` | aparece **na linha do serviço**, como registro |
| **para quem a comunicação vai** | o mesmo vínculo `contato` | e o titular/cliente também recebe, quando configurado |

⛔ Um serviço autorizado pelo contato A **não fica escondido** do responsável logado. Vários
contatos podem ter autorizado serviços do mesmo ativo, e o responsável vê todos, com o nome de
quem autorizou cada um. O `escopo: 'servico'` no vínculo de contato existe **para exibir a
autoria**, não para filtrar.

---

## 5. Evento (append-only)

```ts
type Evento = {
  evento_id: string;                         // HASH DO CONTEÚDO — ver §12.1. Nunca posicional.
  ativo_id: string;
  tipo: 'despacho' | 'publicacao' | 'protocolo' | 'transferencia' | 'pagamento_taxa' | 'comunicado_enviado'
      | 'conciliacao' | 'importacao' | 'nota_interna';
  codigo?: string;                           // ex.: 'IPAS009', '6.1', '2.10' — como o INPI publica
  titulo: string;                            // como vem no XML: <despacho nome> / <titulo>
  texto?: string;                            // texto-complementar / comentário
  ocorrido_em: string;                       // data civil do fato (publicação)
  publicacao?: { tipo: 'marcas' | 'patentes' | 'di'; revista: number; data: string; pagina?: number };
  payload?: Record<string, unknown>;         // cedentes/cessionários, protocolo, requerente…
  observacoes: Observacao[];                 // toda fonte que viu este mesmo evento — manual E varredura viram 2 observações do MESMO evento
  visivel_ao_cliente: false | true;          // nota_interna é sempre false E é REMOVIDA da projeção (nunca fica com flag)
};

type Observacao = {
  fonte: Fonte;
  observado_em: string;
  autor?: string;
  documento_hash?: string;                   // sha256 do XML/PDF de origem, quando fonte é documento
  ordinal?: number;                          // posição no documento — INFORMATIVO, nunca chave
};
```

---

## 6. Prazo (derivado por régua, com firmeza)

```ts
type Regua = {
  id: string;                                // catálogo §6.1 — ex.: 'br.marca.manifestacao_oposicao'
  nome: string;
  fundamento: string;                        // dispositivo legal ou 'PRÁTICA DA CASA — não documentado'
  dias: number;
  contagem: 'corridos' | 'uteis';
  dies_a_quo: 'incluido' | 'excluido' | 'primeiro_dia_util_seguinte';
  // 'primeiro_dia_util_seguinte' e a regra escrita na skill do Codex §9.1 e não produz 62 dias — a casa pratica **60 dias** — o "62" que aparecia aqui era artefato de medição, porque as datas de RPI foram derivadas de uma âncora (RPI 2824 + 7 dias por revista), e a diferença era do cálculo, não do escritório. Corrigido pelo Gui em 07/09/2026: **prazo administrativo é 60 dias, ou 30 — 62 não existe**
  // medidos na pratica da casa contra a data da RPI. Fica com firmeza 'praticado' ate o Gui confirmar.
  ajuste_dia_nao_util: 'proximo_dia_util' | 'dia_util_anterior' | 'nenhum';
  calendario: 'br_inpi' | 'br_forense' | 'civil' | string;
  prazo_extraordinario?: { dias: number; fundamento: string; taxa_adicional: boolean };
};

type Prazo = {
  prazo_id: string;
  ativo_id: string;
  evento_base: string;                       // evento_id — de onde conta
  regua: Regua;                              // a régua INTEIRA vai junto; a tela mostra
  abre_em?: string;                          // quando a JANELA abre — ausente significa "já aberto" (a maioria)
  // Nem todo prazo corre desde já: a prorrogação decenal só cabe no último ano de vigência
  // (art. 133 §1º) e a caducidade contra terceiro só 5 anos após a concessão dele (art. 143).
  // ⚠️ Sem este campo, um prazo que abre em 2033 e vence em 2034 aparece HOJE na mesma lista dos
  //    que correm — e "em 7 anos" ao lado de "13 dias" faz o de 13 dias parecer rotina.
  vence_em: string;                          // data civil calculada por quem produz o pacote
  prazo_interno_em?: string;                 // prática medida: legal − 10 dias
  vence_extraordinario_em?: string;
  firmeza: 'legal' | 'praticado' | 'estimado' | 'informado';
  // legal      = régua com dispositivo confirmado pela casa
  // praticado  = o que o escritório faz (o dies a quo ainda não foi confirmado)
  // estimado   = derivado por regra ainda não confirmada (anuidade, prorrogação) — a tela AVISA
  // informado  = veio de fonte externa (agente, cliente) sem régua
  cumprido?: { em: string; evento_id: string };   // quando a ação foi protocolada
  fonte: Fonte;
};
// ⛔ NÃO EXISTE `dias_restantes`, `vencido`, `estado`. Tudo isso é f(vence_em, hoje) na leitura.
```

### 6.1 Catálogo inicial de réguas (v0.1)

Regenerado a partir do código em 07/09/2026: são **14 réguas** em `CATALOGO` (`src/regras/reguas.ts`)
— e não as 11 que este documento listava. `gatilhos` são os códigos de despacho que disparam a
régua; vazio significa **entrada manual**, porque a casa ainda não mapeou o código (ou porque dar
gatilho seria errado, ver a última linha).

| id | dias | fundamento | firmeza padrão | gatilhos | observação medida |
|---|---|---|---|---|---|
| `br.marca.prazo_oposicao` | 60 | art. 158 LPI — da publicação do pedido para oposição | **legal** | `IPAS009` `I009` `IPAS421` `I421` `IPAS756` `I756` `IPAS757` `I757` | é o relógio da colidência; I756/I757 são designações de Madri |
| `br.marca.manifestacao_oposicao` | 60 | art. 158 §1º LPI — da publicação da oposição | **praticado** | `I339` | 62 medidos em 19/19; ⚠️ *dies a quo* pendente do Gui |
| `br.marca.exigencia` | 60 | art. 159 LPI | legal | `I340` `I105` `I206` | a omissão gera ARQUIVAMENTO DEFINITIVO |
| `br.marca.recurso_indeferimento` | 60 | art. 212 §1º LPI | legal | `I024` | 60 em 14/14 |
| `br.marca.pan` | 180 | arts. 168-169 LPI — da CONCESSÃO / expedição do certificado | legal | `IPAS158` `I158` `IPAS770` `I770` `IPAS403` | ⛔ conta da concessão, NUNCA do deferimento; depois só a via judicial (art. 174, 5 anos) |
| `br.marca.prorrogacao` | 0 (+180 extraordinário, art. 133 §1º, com taxa) | art. 133 LPI — **regra não confirmada pela casa** | **estimado** | — | marca só o TERMO FINAL; a janela útil é `br.marca.prorrogacao_janela` |
| `br.patente.exigencia_tecnica` | 90 | art. 36 LPI | legal | `6.1` `6.23` | 90 em 38/63; 60 em 15; 30 em 5 — há variação por tipo de exigência |
| `br.patente.recurso_indeferimento` | 60 | arts. 212-213 LPI | legal | `9.2` `12.2` | |
| `br.patente.anuidade` | 0 (+180 extraordinário, art. 84 §2º, com taxa) | art. 84 LPI — **regra não confirmada pela casa** | **estimado** | — | GRU tem ≥6 códigos (220 · 224 · 226 · 228 · 240) e o extraordinário MUDA o código (221 · 225): tratar "anuidade" como código único emite a guia errada. 710 cards |
| `br.patente.restauracao` | 90 | art. 87 LPI — 3 meses da **notificação** do arquivamento ou da extinção | **praticado** | — | ⚠️ **não é o art. 161** (esse é a expedição do certificado) — há teste travando isto. O *dies a quo* é a notificação, ainda não modelada como evento |
| `br.marca.caducidade_defesa` | 60 | art. 143 §2º LPI — da intimação, com ônus de provar o uso | **praticado** | — | é a caducidade que corre CONTRA o cliente; perder extingue o registro (art. 142, III). Código da intimação ainda não mapeado |
| `br.patente.pan` | 180 | art. 51 LPI — 6 meses da concessão da patente | **praticado** | — | ⚠️ 6 MESES, não os 180 dias da marca: institutos diferentes. Manifestação do titular em 60 dias (art. 52) |
| `br.di.pan` | 1826 | art. 112 LPI — 5 anos da concessão do registro | **estimado** | — | janela muito mais larga que a da marca e a da patente — confira antes de agir. RPI de DI só sai em PDF, então o gatilho não chega por feed |
| `br.marca.retribuicao_concessao` | 60 (+30 com retribuição adicional) | art. 162 LPI — do deferimento | **praticado** | — (⛔ sem gatilho **de propósito**) | o prazo mais caro do catálogo: perder as duas janelas arquiva em DEFINITIVO, *independentemente de notificação*. `IPAS158` é ambíguo — significa "pague a retribuição" quando o deferimento é SEU e "cabe nulidade" quando é de TERCEIRO, e o lado não está no código |

Três ids que este documento listava **nunca existiram no `CATALOGO`** e foram removidos:
`br.patente.vigencia` e `br.di.vigencia` (vigência não é régua de prazo — é o campo
`datas.vigencia_ate` do ativo, §3) e `br.restauracao`, cujo nome real é **`br.patente.restauracao`**.

Todas: `contagem: corridos`, `dies_a_quo: primeiro_dia_util_seguinte`, `ajuste_dia_nao_util: proximo_dia_util`,
`calendario: br_inpi` — conforme `prazos_estrategicos.md` da skill de peças (*"Não se conta o dia
da publicação, conta-se o dia do término · dias corridos · último dia em fim de semana/feriado
prorroga · recesso forense NÃO suspende prazo administrativo"*). O calendário `br_inpi` reusa o do
Papi (`pct_pipeline.py:200-273`, Páscoa e feriados móveis).

⚠️ **É o `primeiro_dia_util_seguinte` que não produz 62 dias — a casa pratica **60 dias** — o "62" que aparecia aqui era artefato de medição, porque as datas de RPI foram derivadas de uma âncora (RPI 2824 + 7 dias por revista), e a diferença era do cálculo, não do escritório. Corrigido pelo Gui em 07/09/2026: **prazo administrativo é 60 dias, ou 30 — 62 não existe**.** A lei diz 60, e a casa protocola em
62 contra a data da RPI (19 de 19 manifestações medidas). A diferença não é folga nem erro: a
contagem não começa na publicação, começa no primeiro dia útil DEPOIS dela — e é esse deslocamento
que aparece na medição. Enquanto o Gui não confirmar o *dies a quo*, a régua que depende dele fica
com firmeza **`praticado`**, nunca `legal`: o número está medido, o fundamento é que ainda não está
confirmado, e o contrato prefere dizer isso a fingir certeza.

Além das 14 réguas, `reguas.ts` exporta **`JANELAS`** (3): `br.marca.caducidade_ofensiva`,
`br.marca.caducidade_vulnerabilidade` e `br.marca.prorrogacao_janela`. São coisas com data que
**não são prazo que corre** — um prazo vence e some, uma janela abre e permanece. Tratar as duas com
o mesmo relógio produziria contagem regressiva para algo que não expira, e alarme para o que é
oportunidade, não ameaça. Por isso `JANELAS` tem `abre_apos_dias` e `fecha`, e não tem `dias`.

---

## 7. Documento

```ts
type Documento = {
  documento_id: string;
  ativo_id?: string; pessoa_id?: string;     // ao menos um
  tipo: 'certificado' | 'procuracao' | 'peticao' | 'comprovante_gru' | 'recibo_protocolo' | 'carta_agente'
      | 'relatorio_colidencia' | 'comunicado' | 'contrato' | 'imagem_marca' | 'outro';
  nome: string;
  mime: string; tamanho_bytes: number; sha256: string;
  origem: { sistema: 'ploomes' | 'drive' | 'upload' | 'gerado'; ref: string };  // ref = id no sistema, NUNCA URL
  publicavel: boolean;                       // ⛔ default FALSE; allowlist POSITIVA por documento, carimbo humano
  publicavel_por?: string; publicavel_em?: string;
  idioma?: 'pt' | 'en';
  fonte: Fonte;
  criado_em: string;
};
// ⛔ Nunca guardar nem transmitir a URL do blob do Ploomes: responde 206 sem credencial, sem SAS, sem expiração.
// O byte sai por endpoint autenticado que verifica posse e registra o acesso.
```

---

## 8. Serviço (histórico de contratação — Ploomes)

```ts
type Servico = {
  servico_id: string;
  ativo_ids: string[];                       // N:N — 286 títulos carregam mais de um processo
  origem: { sistema: 'ploomes'; deal_id: number; funil_id: number; titulo_bruto: string;
            origem_deal_id?: number };       // o card que ORIGINOU este — `OriginDealId` no Ploomes
  // ⚠️ `OriginDealId` NÃO quer dizer "sou espelho": quer dizer "nasci de outro card". Colar todo
  //    filho no pai funde 77 dos 106 serviços do funil comercial e apaga US$ 33.136,63 de venda
  //    ganha. O que separa é o FUNIL, não o parentesco.
  papel_na_conta?: 'proposta' | 'derivado' | 'avulso' | 'indefinido';
  // O papel deste card NA CONTA. Uma proposta fechada cobre mais de um ativo (uma marca E uma
  // patente) e, ao ser executada, gera um card derivado por ativo, cada um com a sua GRU: a
  // proposta é onde o cliente PAGOU, os derivados são onde o dinheiro se REPARTE.
  // ⛔ Só `derivado` e `avulso` SOMAM. `proposta` não soma (o valor já está nos derivados) e
  //    `indefinido` TAMBÉM NÃO: sem saber o papel, não dá para saber se somar duplica. Somar
  //    proposta + derivado dobra o custo do portfólio — R$ 10.000 vira R$ 20.000. Preferimos um
  //    total menor e certo, e a tela conta quantos ficaram de fora para o silêncio não virar zero.
  //    Regra executável: `contabilizavel()` em `src/lib/investimento.ts`.
  tipo?: string;                             // 'Anuidade', 'Prorrogação', 'Oposição', 'Depósito'…
  materia?: string[];                        // do campo, não do título
  paises?: Jurisdicao[];
  estado: 'em_andamento' | 'concluido' | 'perdido' | 'cancelado';
  datas: { abertura?: string; conclusao?: string };
  responsavel?: string;                      // interno
  valor?: { moeda: 'BRL' | 'USD' | 'EUR'; total: number;
            honorario?: number;              // quanto do total é da Apex
            taxa_oficial?: number;           // GRU do INPI — repasse à autarquia, não receita
            taxa_internacional?: number;     // agente no exterior, autarquia estrangeira, tradução, câmbio
            origem: 'order_amount' | 'nota_fiscal' | 'cobranca' | 'declarado' };
  // ⚠️ A PROCEDÊNCIA decide se o número pode ser publicado (§11): as três últimas nasceram de
  //    documento ou de alguém que digitou sabendo o que digitava; `order_amount` é o campo do card
  //    no CRM e infla o nacional em R$ 145.153,79, porque card espelhado repete o valor do irmão.
  // ⚠️ A NATUREZA é separada porque, para quem paga, honorário e taxa oficial são coisas
  //    diferentes: um total que funde os dois não responde "quanto custa manter minha marca" nem
  //    "quanto eu pago a vocês".
  fonte: 'ploomes';
  observado_em: string;
};
```

---

## 9. Colidência

```ts
type Colidencia = {
  colidencia_id: string;
  caso_id: string;                           // id de EXIBIÇÃO ('C01'…) — persistido, nunca renumerado depois de aprovado
  revisao: number;                           // a aprovação é DESTA revisão; mudança material não herda (parecer.hash_conteudo)
  ativo_id: string;                          // o ativo do cliente (monitorado)
  terceiro: { processo: string; marca: string; titular: string; pais?: string; uf?: string;
              classes: { codigo: string; edicao_ncl?: string; especificacao?: string }[];
              apresentacao?: string; natureza?: string; cfe?: string[]; deposito?: string };
  evento_gatilho: { revista: number; data: string; codigo: string; pagina?: number };  // IPAS009 → oposição; IPAS770/158 → PAN
  medida: 'oposicao' | 'pan';
  scores: { nominativo?: number; fonetico?: number; classe?: number; especificacao?: number; combinado?: number };
  tier: 'P0' | 'P1' | 'P2' | 'P3';
  // ⚠️ P0–P3 é FILA DE RECUPERAÇÃO, não nível de risco: diz em que ordem a casa varre a lista, não
  //    quão perigoso é o caso. O risco mora em `risk_level`, campo separado — e nenhum dos dois,
  //    nem o `tier` nem o score, é publicado ao cliente. Colapsar os dois num campo só é o erro
  //    que faria um P0 de fila virar "ameaça alta" na tela.
  risk_level?: 'alto' | 'medio' | 'baixo';   // separados de propósito: risco ≠ confiança na medição
  confidence?: 'alta' | 'media' | 'baixa';
  analysis_status: 'complete' | 'incomplete';       // a análise terminou? (incompleta não vai a portão)
  actionability: 'open' | 'closed' | 'pending_confirmation';  // ainda cabe medida?
  recommend_send_to_client: boolean;         // RECOMENDAÇÃO da máquina — não é autorização; quem autoriza é `parecer`
  triagem: { elementos_comuns?: string; elementos_distintivos?: string;
             especificacoes_colidentes?: string; analise?: string; fundamento?: string; pendencia?: string };
  dimensoes?: { dimensao: string; avaliacao: string; fundamento: string }[];
      // ↑ A APROXIMAÇÃO EM PALAVRAS. É a tabela DIMENSÃO | AVALIAÇÃO | FUNDAMENTO que o parecer em
      //   PDF já leva ao cliente, e existe para responder "quão perto?" sem publicar o score.
      //   Nasce VAZIA e só se preenche depois do portão: dimensão é leitura de pessoa.
      //   ⛔ `scores` continua sem sair. 78,80 de combinado com especificação 0,00 é BAIXO, e um
      //      cliente lendo "78,80" lê ameaça.
  parecer?: { por: string; em: string; risco: 'alto' | 'medio' | 'baixo'; decisao: 'enviar' | 'nao_enviar' | 'avaliar';
              justificativa: string; hash_conteudo: string };
              // JUÍZO HUMANO — obrigatório antes de qualquer publicação. `hash_conteudo` é a prova
              // de que a aprovação é DESTA revisão: mudou o conteúdo, a aprovação não se herda.
  approval_status: 'pending' | 'approved' | 'rejected';  // estado do portão humano
  prazo_id?: string;                         // o prazo de oposição/PAN derivado
  relatorio?: { documento_id: string; id_documento: string };  // 'APEX-RPI2904-<proc>-<proc>-PT'
  fonte: Fonte;
  criado_em: string;
};
// ⛔ A ESPECIFICAÇÃO TEM VETO SOBRE O SCORE. `combinado` NÃO decide. Verin × Vaerin: fonético 100,00, combinado 78,80, veredito BAIXO.
// ⛔ O cliente só vê colidência com `parecer.decisao === 'enviar'`. Score cru nunca sai.
```

---

## 10. Comunicado (caixa de saída — Sprint 2)

```ts
type Comunicado = {
  comunicado_id: string;
  ativo_id?: string; pessoa_id: string;      // destinatário
  canal: 'email' | 'whatsapp';
  persona: 'portfolio';                      // o número/persona ② institucional — o Wallet só usa este
  template_id: string;                       // ex.: 'despacho.IPAS009.pt'
  idioma: 'pt' | 'en';
  variaveis: Record<string, string | number>;
  estado: 'rascunho' | 'pronto' | 'enviado' | 'falhou' | 'cancelado';
  criado_em: string; enviado_em?: string; erro?: string;
  evento_resultante?: string;                // evento_id 'comunicado_enviado' gravado no ativo
};
// O Wallet NUNCA segura o token da WABA/e-mail. O motor de envio é interno (n8n) e consome esta caixa.
```

---

## 11. Projeção para o cliente — lista branca executável

O pacote que o navegador do cliente baixa é **outro objeto**, produzido por função pura
`projetarParaCliente(pacote, pessoa_id_logado)`, que **só copia** o que está nesta lista. Tudo que
não está aqui **não existe** no arquivo dele.

```
Pacote → contrato_versao, gerado_em, cobertura, completude, lacunas
Ativo  → ativo_id, especie, jurisdicao, identificadores[], familia_id, marca (sem imagem.hash interno),
         patente (titulo, ipc, pct, ompi, prioridades), datas (sem procedencia), situacao (codigo, texto, derivada_em),
         vigilancia (ativa, motivo, atualizado_em, proxima_verificacao), pendencias (só 'sem_numero' e 'imagem_ausente'),
         criado_em, atualizado_em
         ⛔ `marca.imagem.hash` e `vigilancia.elegivel` / `motivos` / `fonte_feed` NÃO saem — o
            hash é chave interna de deduplicação e os outros três são a régua de negócio da casa
            (a 1.540 → 429) e o juízo dela sobre o ativo, em vocabulário nosso ('terminal',
            'fora da política'). ⚠️ Os quatro escapavam até 07/09/2026: `marca` e `vigilancia`
            eram copiadas INTEIRAS — a mesma família do `filter` sem `map` do bloco `Prazo`.
            Hoje o tipo carrega a proibição (`MarcaCliente`, `VigilanciaCliente`, com `Omit`),
            então o `map` que esquecer não compila.
Pessoa → pessoa_id, tipo, nome, pais, uf — APENAS as pessoas com vínculo publicável no ativo E
         SEM `documentos`, SEM `contato`, SEM `externo`, SEM `gerido_por`
Vinculo→ ativo_id, pessoa_id, papel, desde, ate — apenas `publicavel === true` e papel ∈ {titular, cotitular, cliente, parceiro, procurador}
         (⛔ papel 'agente' NUNCA — desintermediação)
Evento → evento_id, ativo_id, tipo, codigo, titulo, texto, ocorrido_em, publicacao — apenas `visivel_ao_cliente === true`
         e tipo ∉ {'nota_interna','conciliacao','importacao'}; SEM observacoes
Prazo  → prazo_id, ativo_id, evento_base, regua (id, nome, fundamento, dias, contagem, dies_a_quo, ajuste, calendario),
         abre_em, vence_em, vence_extraordinario_em, firmeza, cumprido
         `abre_em` é PUBLICÁVEL: a prorrogação decenal só cabe no último ano de vigência
            (art. 133 §1º) e a caducidade contra terceiro só 5 anos após a concessão dele
            (art. 143). Sem ela, um prazo que abre em 2033 aparece na mesma lista dos que
            correm, e "em 7 anos" ao lado de "13 dias" faz o de 13 dias parecer rotina.
         ⛔ `prazo_interno_em` NÃO sai — é a antecedência OPERACIONAL da casa (medida: legal − 10
            dias), o mesmo campo que o parecer em PDF trata como interno. ⛔ `fonte` também não:
            procedência é do dossiê. Corrigido em 06/09: `prazos` era o único ramo da projeção
            com `filter` sem `map`, e o objeto inteiro ia ao navegador do cliente.
Documento → documento_id, ativo_id, tipo, nome, mime, tamanho_bytes, idioma — apenas `publicavel === true`; SEM origem, SEM sha256
Servico→ servico_id, ativo_ids, tipo, materia, paises, estado, datas, `papel_na_conta`, e `valor`
         APENAS quando `valor.origem` ∈ {nota_fiscal, cobranca, declarado} (com a quebra
         `honorario` / `taxa_oficial` / `taxa_internacional`) — SEM responsavel, SEM titulo_bruto
         Mudou em 07/09/2026: o dinheiro PASSA a ir ao cliente, porque "quanto custa manter meu
            portfólio" e "quanto disso é honorário e quanto é repasse ao INPI" são perguntas
            dele. Mas só com PROCEDÊNCIA documental — nota, cobrança, ou alguém que digitou
            sabendo o que digitava.
         ⛔ `order_amount` NUNCA sai: é o campo do card no CRM e infla o nacional em
            R$ 145.153,79, porque card espelhado repete o valor do irmão. Publicar um número que
            a casa sabe estar errado é o pior tipo de erro — dinheiro errado o cliente confere.
            A lista executável é `ORIGENS_DE_VALOR_PUBLICAVEIS` em `src/projecao/cliente.ts`.
Colidencia → apenas `parecer?.decisao === 'enviar'`: colidencia_id, caso_id, ativo_id,
         terceiro (processo, marca, TITULAR, país, uf, deposito, apresentacao, natureza,
                   classes com `especificacao_bruta`), dimensoes,
         evento_gatilho, medida, risco, parecer_em, prazo_id, relatorio_documento_id
         — SEM scores, SEM tier, SEM triagem
         ⚠️ Os nomes chegam ACHATADOS ao cliente: `parecer.risco` → `risco`, `parecer.em` →
            `parecer_em`, `relatorio.documento_id` → `relatorio_documento_id`. O tipo aninhado
            é interno; o que atravessa é plano.
         A `especificacao_bruta` da classe sai de propósito: é o campo que tem VETO sobre o
            score, e é o que explica ao cliente por que dois sinais parecidos não são conflito.
```

**Teste obrigatório** (roda no CI e aborta): serializar a projeção e afirmar que **não** contém:
qualquer `documentos[].valor` de pessoa, `contato`, `agente`, `"origem":"order_amount"`, `scores`,
`tier`, `triagem`, `nota_interna`, `observacoes`, `origem.ref`, `sha256`, ou string que case
`blob.core.windows.net`. A proibição de `valor` era **cega** e virou específica em 07/09/2026: o que
não pode sair é valor de procedência duvidosa, não valor. A auditoria pegou a mudança na hora — o
gerador do exemplo abortou até a linha ser reescrita, que é o comportamento certo: **mudar o que
pode ser publicado tem de doer.** A lista viva é `PROIBIDOS_NA_PROJECAO` em `src/projecao/cliente.ts`.

---

## 12. Identidade e idempotência

### 12.1 `evento_id` — hash do conteúdo, nunca da posição

```
evento_id = 'ev_' + base32(sha256(
  jurisdicao + '|' + identificador_normalizado_principal + '|' + codigo + '|' + ocorrido_em + '|' + (publicacao?.tipo ?? '') + '|' + (publicacao?.revista ?? '')
))
```

- O mesmo despacho visto pela digitação manual e pela varredura retroativa da revista produz o
  **mesmo** `evento_id` → segunda fonte vira uma `Observacao` a mais. Nada duplica, nada
  sobrescreve, a procedência de ambas sobrevive.
- Republicação corrigida da revista com um despacho a menos **não** cria órfão: nenhum id depende
  de `ordinal`.
- Para **fonte de estado** (API CRUD): a resposta precisa trazer `codigo` + `ocorrido_em` +
  identificador + revista quando houver. Com isso o hash é o mesmo e um cron horário **não**
  re-emite nada. ⚠️ Se a API só devolver "situação atual" sem o evento que a produziu, ela não
  cabe neste contrato — **é a pergunta nº 1 para o Breno.**

### 12.2 `*_id` — UUID emitido pelo servidor

> ⚠️ Mudou em 03/11/2026, por decisão do Gui: **quem emite id é o servidor**, no padrão do backend
> (`String @id @default(uuid())`). A versão anterior desta seção mandava a API aceitar o ULID
> gerado no navegador — foi descartada.

- O pacote que chega à gravação (planilha lida no servidor, exemplo) leva **referências provisórias**
  (ULID). O servidor troca cada uma por um UUID e devolve o pacote com os ids definitivos.
- A troca **reconhece o que já existe**: pessoa pelo documento, ativo por (jurisdição,
  identificador normalizado), evento pela chave de conteúdo (§12.1). Reimportar a mesma carteira
  não troca ids — e o login do cliente, ligado à pessoa, continua apontando para o lugar certo.
- Pacote exportado e reimportado traz os UUIDs do próprio servidor, que ficam.
- `evento_id` é o UUID; o hash de §12.1 é gravado como **chave de conteúdo** (única), que é o que
  garante a idempotência.
- Um ativo que ganha número (pedido depositado) **mantém** o `ativo_id`; ganha um
  `Identificador` novo.

### 12.3 Dedupe na importação

- Ativo: por `(jurisdicao, identificador_normalizado)` quando existe número; sem número, **nunca**
  automático — fica em `pendencias` para decisão humana.
- Pessoa: por documento. Sem documento, **nunca** automático.
- **Contagem, não booleano**: três GRUs idênticas são três (cicatriz do financeiro).

---

## 13. Planilha canônica de upload (v0.1)

Uma linha por **ativo × classe** (regra 5 do LEIA-ME). Colunas (nomes exatos, maiúsculas, sem
acento no cabeçalho):

```
ATIVO_ID | ESPECIE | JURISDICAO | PROCESSO | ND | TIPO_IDENTIFICADOR | MARCA | TITULO_PATENTE
| TITULAR | TITULAR_DOCUMENTO | TITULAR_PAIS | COTITULARES | CLIENTE | CLIENTE_DOCUMENTO | PARCEIRO | AGENTE | PROCURADOR
| CLASSE | EDICAO_NCL | ESPECIFICACAO | APRESENTACAO | NATUREZA | CFE
| DATA_DEPOSITO | DATA_CONCESSAO | DATA_VIGENCIA | SITUACAO | ULTIMA_RPI | ULTIMO_DESPACHO | DESCRICAO_ULTIMO_DESPACHO
| FIGURA | VIGILANCIA_ATIVA | VIGILANCIA_MOTIVO | FONTE | OBSERVACOES
```

- `ATIVO_ID` vazio = o importador emite um ULID e **devolve a planilha com a coluna preenchida**
  (para a próxima subida ser atualização, não duplicata).
- O importador **mapeia** a base-mestra atual (`PROCESSO, MARCA, FIGURA, CLASSE, APRESENTAÇÃO,
  NATUREZA, CFE, ESPECIFICAÇÃO, SITUAÇÃO, ÚLTIMA RPI, ÚLTIMO DESPACHO, DESCRIÇÃO DO ÚLTIMO
  DESPACHO, TITULAR…`) para estas colunas. Ela é a primeira carga.
- Validação **recusa e diz o motivo** (linha, coluna, valor esperado). Sem `continue` silencioso.
- `FIGURA` na base-mestra é imagem ancorada na célula (regra 7): o importador exporta a imagem
  para `Documento` tipo `imagem_marca` e liga pela âncora.

---

## 14. O que o Breno precisa confirmar antes de codar a API

1. **Documento ou estado?** A API entrega eventos datados (lote) ou o estado atual do ativo? Se
   estado, o evento que produziu a situação **vem junto** (código + data + revista) — senão o
   `evento_id` por conteúdo não fecha e um cron horário vira ruído.
2. ~~**Aceita `ativo_id` do cliente na criação** (ULID)?~~ **Resolvido em 03/11/2026:** não aceita —
   o servidor emite UUID e troca as referências provisórias do pacote (§12.2).
3. **Dono de campo.** Campo a campo, quem escreve e quem só lê — a conciliação humana
   (`decisao_humana`) **nunca** é sobrescrita pelo sync do CRM, que aponta para o agente em 69,6%.
4. **`fonte` e `vigilancia`** vêm preenchidos por ativo, com `motivo` quando falsa.
5. **Envelope com `cobertura`** — quais revistas foram lidas até quando.
6. **Documentos por endpoint autenticado com verificação de posse** — nunca a URL do blob.
7. **Versionamento**: `contrato_versao` no envelope; campo novo é aditivo; campo removido é
   versão maior.

---

## 15. Versões

| versão | data | o que muda |
|---|---|---|
| 0.1 | 06/09/2026 | proposta inicial, derivada de 24 agentes de medição e das respostas do Gui de 06/09 |
| 0.2 (registrada, **não emitida**) | 07/09/2026 | **Entrou:** `Servico.papel_na_conta` (impede somar proposta + derivado), `Servico.origem.origem_deal_id`, `Prazo.abre_em`, `Servico.valor.origem` (`order_amount` \| `nota_fiscal` \| `cobranca` \| `declarado`) e a quebra `valor.honorario` / `taxa_oficial` / `taxa_internacional`, `Colidencia.dimensoes`. **Saiu:** `Colidencia.enviar_ao_cliente` — o portão virou `approval_status` + `parecer`. |

⚠️ **A constante `CONTRATO_VERSAO` em `src/contrato/tipos.ts` continua `'0.1'`, de propósito.** Subir
a versão maior é decisão do Gui, e a razão é a regra do próprio §14.7: campo novo é **aditivo** e cabe
numa versão menor, mas a remoção de `enviar_ao_cliente` é **subtrativa** — quebra quem lê. Enquanto
nenhum pacote de fora circula, o custo de subir é maior que o de esperar; quando circular, é decisão
dele, não do código. Este documento registra o que mudou; o envelope só muda com o "pode subir".
