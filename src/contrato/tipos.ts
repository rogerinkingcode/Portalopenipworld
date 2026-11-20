// ⛔ ARQUIVO GERADO — NÃO EDITE AQUI.
// Fonte: backend/src/contrato/tipos.ts (edite lá; esta cópia é refeita por scripts/sincronizar-compartilhado.mjs,
// que roda sozinho antes de dev, testes e build).
// hash-da-fonte: 635dc54f26e01226

/**
 * OpenIpWorld — CONTRATO DE DADOS v0.1, executável.
 *
 * Este arquivo é a referência de MÁQUINA do `CONTRATO-DADOS.md`. O upload manual, o parser da RPI
 * e a API do Breno produzem o MESMO objeto — por isso a fase 2 é troca de origem, não de lógica.
 *
 * ⛔ Mudança de campo passa pelo `CONTRATO-DADOS.md`, com versão e data. Não editar aqui sozinho.
 */

import { z } from 'zod'

export const CONTRATO_VERSAO = '0.1' as const

// ───────────────────────────────────────────────────────────────────────────
// Primitivos
// ───────────────────────────────────────────────────────────────────────────

/**
 * Identificador de registro. Opaco e imutável.
 *
 * ⚠️ Quem EMITE o id é o servidor (decisão do Gui em 03/11/2026): UUID gerado pelo backend na
 *    criação, no mesmo padrão das demais tabelas dele. O navegador nunca cria id persistente.
 *
 * O ULID continua aceito só como REFERÊNCIA PROVISÓRIA dentro de um pacote que ainda não foi
 * gravado: a planilha importada precisa ligar vínculo → pessoa → ativo antes de existir id de
 * verdade. Ao gravar, o servidor troca cada referência provisória por um UUID e devolve o pacote
 * com os ids definitivos.
 */
export const zId = z
  .string()
  .regex(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9A-HJKMNP-TV-Z]{26})$/,
    'id inválido (UUID do servidor, ou ULID como referência provisória)',
  )

/** Data civil ISO: 2026-09-01. Sem hora, sem fuso — publicação, vencimento, depósito. */
export const zDataCivil = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data civil deve ser AAAA-MM-DD')

/** Instante ISO com fuso: 2026-09-01T13:00:00-03:00. */
export const zInstante = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'instante deve ser ISO-8601 COM fuso',
  )

/**
 * Jurisdição: ISO-3166-1 alfa-2 + códigos de escritório.
 * CÓDIGO, nunca string de país — a picklist do CRM tem 'Coreia do Sul' E 'Coréia do Sul'.
 */
export const zJurisdicao = z
  .string()
  .regex(/^[A-Z]{2}$/, "jurisdição é código de 2 letras: 'BR', 'US', 'EM' (EUIPO), 'WO' (Madri/PCT), 'EP'…")

/**
 * Fonte do dado. Vocabulário FECHADO.
 * ⚠️ `inpi_consulta` (a carteira) é diferente de `rpi_xml` (o que mudou na semana).
 */
export const zFonte = z.enum([
  'inpi_consulta',
  'rpi_xml',
  'rpi_pdf',
  'api_oficial',
  'upload_manual',
  'certificado_agente',
  'declarado_cliente',
  'ploomes',
  'decisao_humana',
])
export type Fonte = z.infer<typeof zFonte>

export const zCompletude = z.object({
  completo: z.boolean(),
  motivo: z.string().optional(),
  n: z.number().int().nonnegative(),
})

// ───────────────────────────────────────────────────────────────────────────
// Pessoa
// ───────────────────────────────────────────────────────────────────────────

export const zDocumento = z.object({
  tipo: z.enum(['cnpj', 'cpf', 'estrangeiro']),
  valor: z.string().min(1),
  pais: zJurisdicao,
})

export const zPessoa = z.object({
  pessoa_id: zId,
  /** `Contact.TypeId` do Ploomes decide: 0 contradições em 1.567. Nunca heurística de nome. */
  tipo: z.enum(['fisica', 'juridica']),
  nome: z.string().min(1),
  /** Upper, sem acento — para BUSCA. ⛔ Nunca para dedupe: 40 grupos colidem na base ampla. */
  nome_normalizado: z.string().min(1),
  razao_social: z.string().optional(),
  /** Pode ser vazio: o titular está anônimo em 61,54% dos serviços nacionais. */
  documentos: z.array(zDocumento),
  pais: zJurisdicao,
  uf: z.string().optional(),
  /** pessoa_id do PARCEIRO que gere este cliente final. */
  gerido_por: zId.optional(),
  /** ⛔ INTERNO — removido pela projeção; nunca chega ao navegador do cliente. */
  contato: z
    .object({
      emails: z.array(z.string()),
      telefones: z.array(z.string()),
      /** 26 clientes medidos compartilham e-mail → exigem segundo fator. */
      email_compartilhado: z.boolean(),
    })
    .optional(),
  externo: z.object({
    ploomes_contact_id: z.number().int().optional(),
    omie_codigo: z.string().optional(),
    apol_id: z.string().optional(),
  }),
  fonte: zFonte,
  criado_em: zInstante,
  atualizado_em: zInstante,
})
export type Pessoa = z.infer<typeof zPessoa>

// ───────────────────────────────────────────────────────────────────────────
// Ativo
// ───────────────────────────────────────────────────────────────────────────

/**
 * ⛔ NUNCA 'patente' genérico: PI = 20 anos do depósito, MU = 15, DI = 10 + 3×5.
 * Vigências diferentes exigem espécies diferentes.
 */
export const zEspecie = z.enum([
  'marca',
  'patente_invencao',
  'modelo_utilidade',
  'certificado_adicao',
  'desenho_industrial',
  'programa_computador',
  'indicacao_geografica',
  'dominio',
  'direito_autoral',
])
export type Especie = z.infer<typeof zEspecie>

export const zTipoIdentificador = z.enum([
  'inpi_marca',
  'inpi_patente',
  'inpi_di',
  'inpi_programa',
  'pct',
  'madri',
  'euipo',
  'uspto_serial',
  'uspto_reg',
  'ep',
  'nacional_estrangeiro',
  /** ⛔ Regra 2 do LEIA-ME: nunca convertido nem comparado como número INPI. */
  'nd_interno',
  'outro',
])

export const zIdentificador = z.object({
  tipo: zTipoIdentificador,
  /** Como veio: 'BR 10 2022 000101-0', '936000104 (3º)'. Regra 1: o bruto sobrevive. */
  valor_bruto: z.string().min(1),
  /** 'BR102022000101-0' — ⚠️ DÍGITO VERIFICADOR PRESERVADO. Um \d{9,} o perde. */
  valor_normalizado: z.string().min(1),
  jurisdicao: zJurisdicao,
  papel: z.enum(['pedido', 'registro', 'publicacao', 'internacional', 'interno']),
  desde: zDataCivil.optional(),
  ate: zDataCivil.optional(),
  fonte: zFonte,
})
export type Identificador = z.infer<typeof zIdentificador>

export const zClasse = z.object({
  codigo: z.string().min(1),
  /** Regra 4: `Ncl(7)` ≠ `Ncl(12)` ≠ classe nacional antiga `40/15`. */
  edicao_ncl: z.string().optional(),
  especificacao_bruta: z.string().optional(),
  especificacao_normalizada: z.string().optional(),
  status: z.string().optional(),
})

export const zProcedenciaCampo = z.object({ fonte: zFonte, observado_em: zInstante })

export const zAtivo = z.object({
  /** Emitido pelo servidor na criação. ⛔ Nunca derivado do número: 17,86% dos ativos ainda não têm. */
  ativo_id: zId,
  especie: zEspecie,
  jurisdicao: zJurisdicao,
  /** Lista: um ativo é pedido e DEPOIS registro; PCT e depois fase nacional. Pode nascer vazia. */
  identificadores: z.array(zIdentificador),
  /** Regra 9: famílias por nome dominante, titular, imagem e CFE. */
  familia_id: zId.optional(),
  marca: z
    .object({
      nome: z.string().min(1),
      nome_normalizado: z.string().min(1),
      apresentacao: z
        .enum(['nominativa', 'mista', 'figurativa', 'tridimensional', 'posicao', 'sonora', 'outra'])
        .optional(),
      natureza: z.enum(['produto', 'servico', 'coletiva', 'certificacao']).optional(),
      /** Regra 5: UMA relação por classe, mantendo a linha original. */
      classes: z.array(zClasse),
      /** Classificação de Viena. */
      cfe: z.array(z.string()).optional(),
      /** Referência — ⚠️ a imagem NÃO vem no XML da RPI (0 em 54,6 MB). */
      imagem: z.object({ documento_id: zId, hash: z.string() }).optional(),
    })
    .optional(),
  patente: z
    .object({
      titulo: z.string().optional(),
      ipc: z.array(z.string()).optional(),
      inventores: z.array(z.string()).optional(),
      pct: z.object({ numero: z.string(), data: zDataCivil }).optional(),
      ompi: z.object({ numero: z.string(), data: zDataCivil }).optional(),
      prioridades: z
        .array(z.object({ numero: z.string(), data: zDataCivil, pais: zJurisdicao }))
        .optional(),
    })
    .optional(),
  datas: z.object({
    /** `null` quando desconhecida. ⛔ NUNCA inventar data. */
    deposito: zDataCivil.nullable().optional(),
    publicacao: zDataCivil.nullable().optional(),
    concessao: zDataCivil.nullable().optional(),
    vigencia_ate: zDataCivil.nullable().optional(),
    procedencia: z.record(z.string(), zProcedenciaCampo),
  }),
  situacao: z.object({
    codigo: z.string().optional(),
    texto: z.string().min(1),
    /** Situação é OPINIÃO derivada de um fato. O fato é o evento. */
    evento_id: z.string().optional(),
    derivada_em: zInstante,
    fonte: zFonte,
  }),
  vigilancia: z.object({
    /** ⛔ Default FALSE. Só vira true quando existe feed que cobre a jurisdição. */
    ativa: z.boolean(),
    /** Decisão de NEGÓCIO: entra no cruzamento semanal? (a régua 1.540 → 429) */
    elegivel: z.boolean(),
    /** Por que não é elegível: 'terminal', 'indeferido', 'fora da política'… */
    motivos: z.array(z.string()),
    /** Obrigatório quando `ativa` é false: 'DI: RPI só em PDF', 'CN: sem API'. */
    motivo: z.string().optional(),
    fonte_feed: zFonte.optional(),
    /** ⚠️ POR ATIVO — nunca carimbo global de rodapé. BR atualiza toda semana, CN só à mão. */
    atualizado_em: zDataCivil.optional(),
    proxima_verificacao: zDataCivil.optional(),
  }),
  pendencias: z.array(
    z.object({
      tipo: z.enum([
        'sem_numero',
        'titular_anonimo',
        'classe_inferida',
        'imagem_ausente',
        'especificacao_ausente',
        'outro',
      ]),
      detalhe: z.string().optional(),
    }),
  ),
  fonte: zFonte,
  externo: z.object({
    apol_processo: z.string().optional(),
    ploomes_deal_ids: z.array(z.number().int()).optional(),
    base_mestra_linha: z.number().int().optional(),
  }),
  criado_em: zInstante,
  atualizado_em: zInstante,
})
export type Ativo = z.infer<typeof zAtivo>

// ───────────────────────────────────────────────────────────────────────────
// Vínculo — pessoa × ativo × papel × vigência
// ───────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ Papel é da RELAÇÃO, não da pessoa: há contato que é cliente MP, cliente IP, IPartner e
 *    agente correspondente ao mesmo tempo — os quatro papéis, a mesma pessoa.
 *
 * O modelo, conforme o Gui definiu em 06/09/2026:
 *   · titular   — dono do direito. A PROCURAÇÃO É SEMPRE COM O TITULAR.
 *   · cliente   — quem compra, e bate com o Ploomes. Pode ser o titular, mas nem sempre:
 *                 escritórios de PI contratam a Apex para os titulares que são clientes DELES.
 *   · contato   — a quem a comunicação vai. Normalmente o contato do Ploomes, e em regra quem
 *                 fechou o negócio que gerou aquele ativo — ou aquela ETAPA dentro dele. Por isso
 *                 pode variar por serviço; ver `escopo`.
 *   · parceiro  — IPartner que revende; vê os ativos dos clientes dele.
 *   · agente    — correspondente no exterior. ⛔ nunca publicável ao cliente.
 *   · procurador— quem consta no INPI; é a Apex, e é a chave da consulta ao registro.
 *
 * A automação virá da sincronização com os órgãos de cada país e do protocolo do pedido inicial,
 * onde constam titular e endereço — mas o cadastro e o ajuste humano continuam existindo, como em
 * todo sistema de gestão de ativos.
 */
export const zPapel = z.enum([
  'titular',
  'cotitular',
  'cliente',
  'contato',
  'parceiro',
  'agente',
  'procurador',
  'licenciado',
  'cedente',
  'cessionario',
])
export type Papel = z.infer<typeof zPapel>

export const zVinculo = z.object({
  vinculo_id: zId,
  ativo_id: zId,
  pessoa_id: zId,
  papel: zPapel,
  /**
   * Onde o papel vale. `ativo` é o padrão (titular, cliente, parceiro).
   * `servico` existe porque o CONTATO muda por etapa: quem fechou o depósito pode não ser quem
   * fechou a anuidade três anos depois, e a comunicação vai para quem fechou aquela.
   *
   * ⚠️ `escopo: 'servico'` é para EXIBIR a autoria, não para filtrar visão. Decisão do Gui:
   * o login do responsável vê o portfólio inteiro, mesmo que vários contatos diferentes tenham
   * autorizado serviços distintos. `contato` é rastreabilidade e destinatário de comunicação —
   * ⛔ NUNCA escopo de autorização.
   */
  escopo: z.enum(['ativo', 'servico']).optional(),
  /** Obrigatório quando `escopo` é `servico`. */
  servico_id: zId.optional(),
  desde: zDataCivil.optional(),
  ate: zDataCivil.optional(),
  /** Co-titulares: 1..4 (medido: até 4 titulares por deal). */
  ordem: z.number().int().positive().optional(),
  fonte: zFonte,
  decidido_por: z.string().optional(),
  /**
   * Confiança do vínculo:
   *   derivado   — o sistema inferiu (protocolo, sync do órgão, CRM) e ninguém olhou ainda
   *   confirmado — alguém confirmou
   *   manual     — alguém digitou
   * ⚠️ O sync NUNCA sobrescreve `confirmado` nem `manual`. É a regra de dono de campo, e é o que
   * permite automatizar sem apagar o que um operador já corrigiu à mão.
   */
  confianca: z.enum(['derivado', 'confirmado', 'manual']).optional(),
  /** ⛔ Default FALSE. Um agente NUNCA enxerga por omissão — 69,6% dos ativos apontam para um. */
  publicavel: z.boolean(),
})
export type Vinculo = z.infer<typeof zVinculo>

// ───────────────────────────────────────────────────────────────────────────
// Evento — append-only
// ───────────────────────────────────────────────────────────────────────────

export const zObservacao = z.object({
  fonte: zFonte,
  observado_em: zInstante,
  autor: z.string().optional(),
  documento_hash: z.string().optional(),
  /** ⚠️ INFORMATIVO. Nunca entra na chave: republicação corrigida criaria órfão. */
  ordinal: z.number().int().optional(),
})

export const zEvento = z.object({
  /** Hash do CONTEÚDO (ver `identidade.ts`). ⛔ Nunca da posição no arquivo. */
  evento_id: z.string().min(1),
  ativo_id: zId,
  tipo: z.enum([
    'despacho',
    'publicacao',
    'protocolo',
    'transferencia',
    'pagamento_taxa',
    'comunicado_enviado',
    'conciliacao',
    'importacao',
    'nota_interna',
  ]),
  /** Como o INPI publica: 'IPAS009', '6.1', '2.10'. */
  codigo: z.string().optional(),
  titulo: z.string().min(1),
  texto: z.string().optional(),
  /** Data civil do FATO (a publicação), não de quando lemos. */
  ocorrido_em: zDataCivil,
  publicacao: z
    .object({
      tipo: z.enum(['marcas', 'patentes', 'di']),
      revista: z.number().int().positive(),
      data: zDataCivil,
      /** ⚠️ A página impressa na RPI ≠ índice zero-based do PDF. */
      pagina: z.number().int().positive().optional(),
    })
    .optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  /** Manual e varredura do MESMO despacho viram 2 observações do MESMO evento. */
  observacoes: z.array(zObservacao),
  /** ⚠️ `false` significa REMOVIDO da projeção — nunca "vai com flag". */
  visivel_ao_cliente: z.boolean(),
})
export type Evento = z.infer<typeof zEvento>

// ───────────────────────────────────────────────────────────────────────────
// Prazo — derivado por régua nomeada, com firmeza
// ───────────────────────────────────────────────────────────────────────────

export const zRegua = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  /** Dispositivo legal, ou 'PRÁTICA DA CASA — não documentado'. */
  fundamento: z.string().min(1),
  dias: z.number().int().nonnegative(),
  contagem: z.enum(['corridos', 'uteis']),
  /**
   * `primeiro_dia_util_seguinte` é a regra escrita na skill do Codex §9.1 — e explica os
   * 62 dias que a casa pratica contra a data da RPI, onde a lei diz 60.
   */
  dies_a_quo: z.enum(['incluido', 'excluido', 'primeiro_dia_util_seguinte']),
  ajuste_dia_nao_util: z.enum(['proximo_dia_util', 'dia_util_anterior', 'nenhum']),
  calendario: z.string().min(1),
  /**
   * Regra de CICLO — para o prazo que não conta a partir de uma publicação, e sim do
   * ciclo de vida do processo: anuidade, prorrogação decenal, quinquênio do DI.
   *
   * ⚠️ É por isso que essas réguas têm `dias: 0`. Zero não quer dizer "vence hoje": quer
   *    dizer "não é regra de contagem". A tela imprime "Data fixa", não "0 dias".
   *
   * Decisão do Gui em 07/09/2026: seguem a lei, e por isso nascem `legal`.
   */
  ciclo: z
    .object({
      /** De onde o relógio parte. */
      base: z.enum(['deposito', 'concessao']),
      /** Anuidade: 24 — "a partir do início do terceiro ano" (art. 84 LPI). */
      primeiro_apos_meses: z.number().int().nonnegative().optional(),
      /** Anuidade 12 · marca 120 · DI 120 e depois 60. */
      periodo_meses: z.number().int().positive(),
      /** Marca: 365 — o pedido cabe no último ano (art. 133 §1º). DI: 90 (art. 108 §1º). */
      janela_abre_antes_dias: z.number().int().nonnegative().optional(),
      /** Anuidade: 90 — os três primeiros meses de cada período anual (art. 84 §2º). */
      janela_apos_inicio_dias: z.number().int().nonnegative().optional(),
      /** Repete a cada período? Anuidade e marca sim; o quinquênio do DI tem teto. */
      recorrente: z.boolean(),
      /** DI: 4 — o decênio inicial mais três prorrogações de 5 anos (art. 108). */
      periodos_max: z.number().int().positive().optional(),
    })
    .optional(),
  prazo_extraordinario: z
    .object({
      dias: z.number().int().positive(),
      fundamento: z.string(),
      taxa_adicional: z.boolean(),
    })
    .optional(),
})
export type Regua = z.infer<typeof zRegua>

/**
 * legal      = régua com dispositivo confirmado pela casa
 * praticado  = o que o escritório faz (62 dias medidos), sem confirmação do dies a quo
 * estimado   = derivado por regra ainda não confirmada (anuidade, prorrogação) — a tela AVISA
 * informado  = veio de fonte externa (agente, cliente) sem régua
 */
export const zFirmeza = z.enum(['legal', 'praticado', 'estimado', 'informado'])
export type Firmeza = z.infer<typeof zFirmeza>

export const zPrazo = z.object({
  prazo_id: zId,
  ativo_id: zId,
  /** De onde conta. Sem evento base não há prazo. */
  evento_base: z.string().min(1),
  /** A régua INTEIRA viaja junto: a tela mostra de onde saiu a data. */
  regua: zRegua,
  /**
   * Quando a janela ABRE. Nem todo prazo corre desde já: a prorrogação decenal só pode ser
   * pedida no último ano de vigência (art. 133 §1º), e a caducidade contra terceiro só cabe
   * 5 anos após a concessão dele (art. 143).
   *
   * ⚠️ Sem este campo, um prazo que abre em 2033 e vence em 2034 aparece hoje na mesma lista
   *    dos que correm — e "13 dias" ao lado de "em 7 anos" faz o de 13 dias parecer rotina.
   *    Ausente significa "já aberto", que é o caso da maioria.
   */
  abre_em: zDataCivil.optional(),
  vence_em: zDataCivil,
  /** Prática medida: legal − 10 dias. É CONFIGURAÇÃO, não lei. */
  prazo_interno_em: zDataCivil.optional(),
  vence_extraordinario_em: zDataCivil.optional(),
  firmeza: zFirmeza,
  cumprido: z.object({ em: zDataCivil, evento_id: z.string() }).optional(),
  fonte: zFonte,
})
export type Prazo = z.infer<typeof zPrazo>
// ⛔ NÃO EXISTE `dias_restantes`, `vencido` nem `estado`: são f(vence_em, hoje) na leitura.

// ───────────────────────────────────────────────────────────────────────────
// Documento
// ───────────────────────────────────────────────────────────────────────────

export const zDocumentoArquivo = z.object({
  documento_id: zId,
  ativo_id: zId.optional(),
  pessoa_id: zId.optional(),
  tipo: z.enum([
    'certificado',
    'procuracao',
    'peticao',
    'comprovante_gru',
    'recibo_protocolo',
    'carta_agente',
    'relatorio_colidencia',
    'comunicado',
    'contrato',
    'imagem_marca',
    'outro',
  ]),
  nome: z.string().min(1),
  mime: z.string().min(1),
  tamanho_bytes: z.number().int().nonnegative(),
  sha256: z.string(),
  /** ⛔ `ref` é o ID no sistema de origem. NUNCA uma URL: o blob do Ploomes responde 206 sem credencial. */
  origem: z.object({
    sistema: z.enum(['ploomes', 'drive', 'upload', 'gerado']),
    ref: z.string(),
  }),
  /** ⛔ Default FALSE. Allowlist POSITIVA por documento, com carimbo humano. */
  publicavel: z.boolean(),
  publicavel_por: z.string().optional(),
  publicavel_em: zDataCivil.optional(),
  idioma: z.enum(['pt', 'en']).optional(),
  fonte: zFonte,
  criado_em: zInstante,
})
export type DocumentoArquivo = z.infer<typeof zDocumentoArquivo>

// ───────────────────────────────────────────────────────────────────────────
// Serviço — histórico de contratação (Ploomes)
// ───────────────────────────────────────────────────────────────────────────

export const zServico = z.object({
  servico_id: zId,
  /** N:N — 286 títulos carregam mais de um processo. */
  ativo_ids: z.array(zId),
  origem: z.object({
    sistema: z.literal('ploomes'),
    deal_id: z.number().int(),
    funil_id: z.number().int(),
    titulo_bruto: z.string(),
    /**
     * O card que ORIGINOU este — no Ploomes, `OriginDealId`.
     *
     * ⚠️ Uma proposta fechada costuma cobrir mais de um ativo (uma marca E uma patente), e
     *    ao ser executada gera um card derivado por ativo, cada um com a sua GRU. A proposta
     *    é onde o cliente PAGOU; os derivados são onde o dinheiro se REPARTE.
     *
     * ⛔ Por isso o papel abaixo é obrigatório para somar sem errar: contar a proposta E os
     *    derivados dá o dobro. Se a proposta é R$ 10.000 e os três derivados somam R$ 10.000,
     *    o total honesto é R$ 10.000, não R$ 20.000.
     *
     * ⚠️ `OriginDealId` NÃO significa "sou espelho": significa "nasci de outro card". Colar
     *    todo filho no pai funde 77 dos 106 serviços do funil comercial e apaga
     *    US$ 33.136,63 de venda ganha — o que separa é o FUNIL, não o parentesco.
     */
    origem_deal_id: z.number().int().optional(),
  }),
  /**
   * O papel deste card na conta.
   *
   *   proposta  — o guarda-chuva onde o cliente pagou. Tem o valor cheio.
   *   derivado  — a execução por ativo, com a GRU daquele ativo. NÃO soma com a proposta.
   *   avulso    — não faz parte de nenhum guarda-chuva; soma normalmente.
   *
   * ⛔ Enquanto for `indefinido`, o valor NÃO entra em soma nenhuma: não dá para saber se
   *    somá-lo duplicaria. Preferimos um total menor e certo a um total maior e errado.
   */
  papel_na_conta: z.enum(['proposta', 'derivado', 'avulso', 'indefinido']).optional(),
  tipo: z.string().optional(),
  materia: z.array(z.string()).optional(),
  paises: z.array(zJurisdicao).optional(),
  estado: z.enum(['em_andamento', 'concluido', 'perdido', 'cancelado']),
  datas: z.object({ abertura: zDataCivil.optional(), conclusao: zDataCivil.optional() }),
  responsavel: z.string().optional(),
  /**
   * O que o serviço custou.
   *
   * ⚠️ A PROCEDÊNCIA decide se o número pode ser publicado, e isto não é preciosismo:
   *    `order_amount` é o campo do card no CRM e **infla o nacional em R$ 145.153,79**, porque
   *    card espelhado repete o valor do irmão. Somar isso e mostrar ao cliente seria publicar
   *    um número que a casa sabe estar errado — e para o cliente, número de dinheiro errado é
   *    o pior tipo de erro que existe.
   *
   * ⚠️ A NATUREZA importa porque, para quem paga, honorário e taxa oficial são coisas
   *    diferentes: um é a Apex, o outro é repasse ao INPI. Um total que funde os dois não
   *    responde "quanto custa manter minha marca" nem "quanto eu pago a vocês".
   */
  valor: z
    .object({
      moeda: z.enum(['BRL', 'USD', 'EUR']),
      total: z.number(),
      /** Quanto do total é honorário da casa (o resto é taxa oficial e despesa). */
      honorario: z.number().optional(),
      /**
       * GRU do INPI — repasse à autarquia brasileira, não receita da Apex.
       * ⚠️ Separada da taxa internacional de propósito: "quanto é repasse ao INPI" e "quanto
       *    custa estar no exterior" são perguntas diferentes, e um total que as funde não
       *    responde nenhuma das duas.
       */
      taxa_oficial: z.number().optional(),
      /** Associado/agente no exterior, autarquia estrangeira, tradução, câmbio. */
      taxa_internacional: z.number().optional(),
      /**
       * ⛔ `order_amount` NUNCA é publicável. As outras três são: nasceram de documento
       *    (nota, cobrança) ou de alguém que digitou sabendo o que digitava.
       */
      origem: z.enum(['order_amount', 'nota_fiscal', 'cobranca', 'declarado']),
    })
    .optional(),
  fonte: z.literal('ploomes'),
  observado_em: zInstante,
})
export type Servico = z.infer<typeof zServico>

// ───────────────────────────────────────────────────────────────────────────
// Colidência
// ───────────────────────────────────────────────────────────────────────────

export const zScores = z.object({
  nominativo: z.number().optional(),
  fonetico: z.number().optional(),
  classe: z.number().optional(),
  especificacao: z.number().optional(),
  combinado: z.number().optional(),
})

/** ⚠️ P0–P3 é fila de RECUPERAÇÃO, não risco. Alto/médio/baixo nasce do parecer humano. */
export const zTier = z.enum(['P0', 'P1', 'P2', 'P3'])

export const zColidencia = z.object({
  colidencia_id: zId,
  /** IDs de exibição `C01…` são PERSISTIDOS e nunca renumerados depois de aprovados. */
  caso_id: z.string().min(1),
  revisao: z.number().int().positive(),
  ativo_id: zId,
  terceiro: z.object({
    processo: z.string().min(1),
    marca: z.string().min(1),
    titular: z.string().min(1),
    pais: zJurisdicao.optional(),
    uf: z.string().optional(),
    classes: z.array(zClasse),
    apresentacao: z.string().optional(),
    natureza: z.string().optional(),
    cfe: z.array(z.string()).optional(),
    deposito: zDataCivil.optional(),
  }),
  evento_gatilho: z.object({
    revista: z.number().int().positive(),
    data: zDataCivil,
    /** I009/I421/I756/I757 → oposição; IPAS158/IPAS770/IPAS403 → PAN. */
    codigo: z.string().min(1),
    pagina: z.number().int().positive().optional(),
  }),
  medida: z.enum(['oposicao', 'pan']),
  scores: zScores,
  tier: zTier,
  /** Campos SEPARADOS — a skill é explícita: não colapsar num só. */
  risk_level: z.enum(['alto', 'medio', 'baixo']).optional(),
  confidence: z.enum(['alta', 'media', 'baixa']).optional(),
  analysis_status: z.enum(['complete', 'incomplete']),
  actionability: z.enum(['open', 'closed', 'pending_confirmation']),
  recommend_send_to_client: z.boolean(),
  triagem: z.object({
    elementos_comuns: z.string().optional(),
    elementos_distintivos: z.string().optional(),
    especificacoes_colidentes: z.string().optional(),
    analise: z.string().optional(),
    fundamento: z.string().optional(),
    pendencia: z.string().optional(),
  }),
  /** ⛔ JUÍZO HUMANO. Sem ele, nada é publicado nem enviado. */
  /**
   * As dimensões da aproximação, em TEXTO — é a tabela `DIMENSÃO | AVALIAÇÃO | FUNDAMENTO` que o
   * parecer em PDF já leva ao cliente. Existe para responder "quão perto?" sem publicar o score.
   *
   * ⛔ O número cru (`scores`) NUNCA sai: 78,80 de combinado com especificação 0,00 é BAIXO, e um
   *    cliente lendo "78,80" lê ameaça. O juízo é da pessoa; a tela mostra o juízo, não o insumo.
   * ⚠️ Só se preenche para caso que passou o portão humano — nasce vazio.
   */
  dimensoes: z
    .array(
      z.object({
        dimensao: z.string().min(1),
        avaliacao: z.string().min(1).max(70),
        fundamento: z.string().min(1),
      }),
    )
    .optional(),
  parecer: z
    .object({
      por: z.string().min(1),
      em: zDataCivil,
      risco: z.enum(['alto', 'medio', 'baixo']),
      decisao: z.enum(['enviar', 'nao_enviar', 'avaliar']),
      justificativa: z.string().min(1),
      /** Prova de que a aprovação é DESTA revisão: mudança material não herda. */
      hash_conteudo: z.string().min(1),
    })
    .optional(),
  approval_status: z.enum(['pending', 'approved', 'rejected']),
  prazo_id: zId.optional(),
  relatorio: z.object({ documento_id: zId, id_documento: z.string() }).optional(),
  fonte: zFonte,
  criado_em: zInstante,
})
export type Colidencia = z.infer<typeof zColidencia>

/** Uma execução: jurisdição + revista + snapshot da carteira + versão do método. */
export const zRodada = z.object({
  rodada_id: zId,
  jurisdicao: zJurisdicao,
  escopo: z.enum(['nacional', 'internacional']),
  modo: z.enum(['recorrente', 'proativo']),
  revista: z.object({ tipo: z.enum(['marcas', 'patentes']), numero: z.number().int(), data: zDataCivil }),
  fonte_formato: z.enum(['xml', 'pdf']),
  sha256_fonte: z.string().optional(),
  /** Quantos ativos entraram no cruzamento — a régua 1.540 → 429, auditável. */
  base_monitoravel: z.number().int().nonnegative(),
  /** ⚠️ Quantos itens bateram no teto do índice. Sem isso, "exame sem perdas" é mentira. */
  limites_atingidos: z.record(z.string(), z.number().int()),
  estado: z.enum([
    'created',
    'sources_verified',
    'analyzing',
    'preview_ready',
    'awaiting_approval',
    'approved_subset',
    'pdf_validated',
    'delivered',
    'partial',
    'failed',
    'no_cases_approved',
  ]),
  motivo_estado: z.string().optional(),
  criado_em: zInstante,
})
export type Rodada = z.infer<typeof zRodada>

// ───────────────────────────────────────────────────────────────────────────
// Comunicado — caixa de saída (Sprint 2)
// ───────────────────────────────────────────────────────────────────────────

export const zComunicado = z.object({
  comunicado_id: zId,
  ativo_id: zId.optional(),
  pessoa_id: zId,
  canal: z.enum(['email', 'whatsapp']),
  /** O Wallet só usa a persona institucional (número ② da WABA). */
  persona: z.literal('portfolio'),
  template_id: z.string().min(1),
  idioma: z.enum(['pt', 'en']),
  variaveis: z.record(z.string(), z.union([z.string(), z.number()])),
  estado: z.enum(['rascunho', 'pronto', 'enviado', 'falhou', 'cancelado']),
  criado_em: zInstante,
  enviado_em: zInstante.optional(),
  erro: z.string().optional(),
  evento_resultante: z.string().optional(),
})
export type Comunicado = z.infer<typeof zComunicado>
// ⛔ O Wallet NUNCA segura o token da WABA. O motor de envio é interno (n8n) e consome esta caixa.

// ───────────────────────────────────────────────────────────────────────────
// Envelope
// ───────────────────────────────────────────────────────────────────────────

export const zPacote = z.object({
  contrato_versao: z.literal(CONTRATO_VERSAO),
  gerado_em: zInstante,
  gerado_por: z.object({
    modo: z.enum(['upload_manual', 'rpi_xml', 'inpi_consulta', 'api', 'exportacao']),
    autor: z.string().optional(),
    ferramenta: z.string().optional(),
  }),
  /** O que foi lido para produzir este pacote. Sem isso a tela não sabe o que NÃO sabe. */
  cobertura: z
    .object({
      revistas: z
        .array(
          z.object({
            tipo: z.enum(['marcas', 'patentes', 'di']),
            numero: z.number().int(),
            data: zDataCivil,
            sha256: z.string().optional(),
            fonte_formato: z.enum(['xml', 'pdf', 'txt']),
          }),
        )
        .optional(),
      periodo: z.object({ de: zDataCivil, ate: zDataCivil }).optional(),
    })
    .optional(),
  /** Por LISTA, nunca global: a lista de prazos pode ser parcial com os eventos completos. */
  completude: z.object({
    pessoas: zCompletude,
    ativos: zCompletude,
    vinculos: zCompletude,
    eventos: zCompletude,
    prazos: zCompletude,
    documentos: zCompletude,
    servicos: zCompletude,
    colidencias: zCompletude,
  }),
  lacunas: z.array(z.object({ onde: z.string(), motivo: z.string() })),
  pessoas: z.array(zPessoa),
  ativos: z.array(zAtivo),
  vinculos: z.array(zVinculo),
  eventos: z.array(zEvento),
  prazos: z.array(zPrazo),
  documentos: z.array(zDocumentoArquivo),
  servicos: z.array(zServico),
  colidencias: z.array(zColidencia),
  rodadas: z.array(zRodada).optional(),
  comunicados: z.array(zComunicado).optional(),
})
export type Pacote = z.infer<typeof zPacote>

/** Pacote vazio, para semear um portfólio novo. */
export function pacoteVazio(agora: string): Pacote {
  const zero = { completo: true, n: 0 }
  return {
    contrato_versao: CONTRATO_VERSAO,
    gerado_em: agora,
    gerado_por: { modo: 'upload_manual', ferramenta: 'ipaw-front' },
    completude: {
      pessoas: zero,
      ativos: zero,
      vinculos: zero,
      eventos: zero,
      prazos: zero,
      documentos: zero,
      servicos: zero,
      colidencias: zero,
    },
    lacunas: [],
    pessoas: [],
    ativos: [],
    vinculos: [],
    eventos: [],
    prazos: [],
    documentos: [],
    servicos: [],
    colidencias: [],
  }
}
