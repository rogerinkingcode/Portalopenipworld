// ⛔ ARQUIVO GERADO — NÃO EDITE AQUI.
// Fonte: backend/src/projecao/cliente.ts (edite lá; esta cópia é refeita por scripts/sincronizar-compartilhado.mjs,
// que roda sozinho antes de dev, testes e build).
// hash-da-fonte: 2eeee5f4b6214a9e

/**
 * Projeção para o cliente — lista branca EXECUTÁVEL.
 *
 * O pacote que o navegador do cliente baixa é OUTRO objeto, produzido por esta função pura, que
 * **só copia** o que está na lista. Tudo que não está aqui **não existe** no arquivo dele.
 *
 * ⛔ Regra 14 do `CLAUDE.md`: "não pode ver" significa **não está no arquivo**, nunca
 * "está com uma flag". Filtro de front é apresentação; autorização mora em quem PRODUZ o recorte.
 *
 * As cicatrizes que esta função existe para não repetir:
 *  · 12/08/2026 — `/data/financeiro.json` dava 403 e o `.bak` dava 200 com 3,6 MB.
 *  · O HTML do BI entrega 8 perfis com hash SHA-256 a quem abrir a página.
 *  · A URL do anexo do Ploomes responde 206 sem credencial, sem expiração.
 *  · 69,6% dos ativos apontam pelo `ContactId` para um AGENTE, não para o dono.
 */

import type { Pacote } from '../contrato/tipos.ts'

/** O que o cliente recebe. Note o que NÃO está aqui: contato, documentos de pessoa, valor, scores. */
export type PacoteCliente = {
  contrato_versao: string
  gerado_em: string
  cobertura: Pacote['cobertura']
  completude: Pacote['completude']
  lacunas: Pacote['lacunas']
  ativos: AtivoCliente[]
  pessoas: PessoaCliente[]
  vinculos: VinculoCliente[]
  eventos: EventoCliente[]
  prazos: PrazoCliente[]
  documentos: DocumentoCliente[]
  servicos: ServicoCliente[]
  colidencias: ColidenciaCliente[]
}

export type PessoaCliente = {
  pessoa_id: string
  tipo: 'fisica' | 'juridica'
  nome: string
  pais: string
  uf?: string
}

type AtivoInterno = Pacote['ativos'][number]

/**
 * ⛔ Estes quatro campos NÃO atravessam, e o tipo é quem garante:
 *   `marca.imagem.hash`      impressão digital interna, chave de deduplicação nossa
 *   `vigilancia.elegivel`    decisão de negócio — é a régua 1.540 → 429
 *   `vigilancia.motivos`     juízo interno sobre o ativo, em vocabulário nosso
 *   `vigilancia.fonte_feed`  procedência é do dossiê, não do portal
 *
 * ⚠️ Os quatro escapavam até 07/09/2026 por `marca: a.marca` e `vigilancia: a.vigilancia` —
 *    o ramo que copia o objeto inteiro, a mesma família do `filter` sem `map`. A auditoria
 *    não pegou: ela confere a lista de proibidos, e nem `hash` nem `elegivel` estavam nela.
 *    Com o `Omit` abaixo, o `map` que esquecer de tirar **não compila**.
 */
export type MarcaCliente = Omit<NonNullable<AtivoInterno['marca']>, 'imagem'> & {
  imagem?: { documento_id: string }
}

export type VigilanciaCliente = Omit<
  AtivoInterno['vigilancia'],
  'elegivel' | 'motivos' | 'fonte_feed'
>

export type AtivoCliente = Omit<
  AtivoInterno,
  'datas' | 'situacao' | 'pendencias' | 'externo' | 'fonte' | 'marca' | 'vigilancia'
> & {
  marca?: MarcaCliente
  vigilancia: VigilanciaCliente
  datas: { deposito?: string | null; publicacao?: string | null; concessao?: string | null; vigencia_ate?: string | null }
  situacao: { codigo?: string; texto: string; derivada_em: string }
  pendencias: { tipo: string; detalhe?: string }[]
}

export type VinculoCliente = { ativo_id: string; pessoa_id: string; papel: string; desde?: string; ate?: string }
export type EventoCliente = Omit<Pacote['eventos'][number], 'observacoes' | 'visivel_ao_cliente' | 'payload'>
export type PrazoCliente = Omit<Pacote['prazos'][number], 'prazo_interno_em' | 'fonte'>
export type DocumentoCliente = {
  documento_id: string
  ativo_id?: string
  tipo: string
  nome: string
  mime: string
  tamanho_bytes: number
  idioma?: string
}
/**
 * As procedências de valor que podem chegar ao cliente.
 * ⛔ `order_amount` fica de fora: é o campo do CRM que infla o nacional em R$ 145.153,79.
 */
export const ORIGENS_DE_VALOR_PUBLICAVEIS = new Set(['nota_fiscal', 'cobranca', 'declarado'])

export type ServicoCliente = {
  servico_id: string
  ativo_ids: string[]
  tipo?: string
  materia?: string[]
  paises?: string[]
  estado: string
  datas: { abertura?: string; conclusao?: string }
  /** Só presente quando a procedência o sustenta — ver ORIGENS_DE_VALOR_PUBLICAVEIS. */
  valor?: {
    moeda: 'BRL' | 'USD' | 'EUR'
    total: number
    honorario?: number
    taxa_oficial?: number
    taxa_internacional?: number
    origem: string
  }
  /** proposta guarda-chuva × derivado por ativo — ver `contabilizavel` em lib/investimento. */
  papel_na_conta?: 'proposta' | 'derivado' | 'avulso' | 'indefinido'
}
export type ColidenciaCliente = {
  colidencia_id: string
  caso_id: string
  ativo_id: string
  terceiro: {
    processo: string
    marca: string
    titular: string
    pais?: string
    uf?: string
    /** Sai na RPI. Sem ele o cartão mostrava "—" e a comparação de anterioridade não fechava. */
    deposito?: string
    apresentacao?: string
    natureza?: string
    classes: { codigo: string; edicao_ncl?: string; especificacao_bruta?: string }[]
  }
  dimensoes: { dimensao: string; avaliacao: string; fundamento: string }[]
  evento_gatilho: { revista: number; data: string; codigo: string; pagina?: number }
  medida: string
  risco: string
  parecer_em: string
  prazo_id?: string
  relatorio_documento_id?: string
}

/** Papéis que o cliente pode ver. ⛔ `agente` NUNCA — é desintermediação do negócio da casa. */
const PAPEIS_PUBLICAVEIS = new Set(['titular', 'cotitular', 'cliente', 'parceiro', 'procurador'])

/** Tipos de evento que nunca chegam ao cliente, mesmo marcados como visíveis. */
const EVENTOS_INTERNOS = new Set(['nota_interna', 'conciliacao', 'importacao'])

/** Pendências que o cliente pode ver — as outras revelam processo interno. */
const PENDENCIAS_PUBLICAVEIS = new Set(['sem_numero', 'imagem_ausente'])

/**
 * Produz o pacote de um cliente. `pessoaId` é quem está logado.
 *
 * Regra de escopo: o cliente vê os ativos em que ele (ou alguém que ele gere, se for parceiro)
 * tem vínculo **publicável**. Ativo com titular anônimo não é publicável para ninguém.
 */
export function projetarParaCliente(pacote: Pacote, pessoaId: string): PacoteCliente {
  const geridas = new Set(
    pacote.pessoas.filter((p) => p.gerido_por === pessoaId).map((p) => p.pessoa_id),
  )
  const minhas = new Set([pessoaId, ...geridas])

  // Ativos onde o logado tem vínculo publicável com papel publicável.
  const ativoIds = new Set(
    pacote.vinculos
      .filter((v) => v.publicavel && minhas.has(v.pessoa_id) && PAPEIS_PUBLICAVEIS.has(v.papel))
      .map((v) => v.ativo_id),
  )

  // Ativo cujo titular está anônimo não vai para ninguém.
  const semTitular = new Set(
    pacote.ativos
      .filter((a) => a.pendencias.some((p) => p.tipo === 'titular_anonimo'))
      .map((a) => a.ativo_id),
  )
  for (const id of semTitular) ativoIds.delete(id)

  const vinculos = pacote.vinculos.filter(
    (v) => ativoIds.has(v.ativo_id) && v.publicavel && PAPEIS_PUBLICAVEIS.has(v.papel),
  )

  const pessoaIds = new Set(vinculos.map((v) => v.pessoa_id))

  const ativos: AtivoCliente[] = pacote.ativos
    .filter((a) => ativoIds.has(a.ativo_id))
    .map((a) => ({
      ativo_id: a.ativo_id,
      especie: a.especie,
      jurisdicao: a.jurisdicao,
      identificadores: a.identificadores,
      familia_id: a.familia_id,
      // ⛔ `marca` NÃO é copiada inteira: o `imagem.hash` é chave interna de deduplicação.
      //    A referência do documento fica — é o que permitiria mostrar a imagem um dia.
      marca: a.marca && {
        ...a.marca,
        imagem: a.marca.imagem ? { documento_id: a.marca.imagem.documento_id } : undefined,
      },
      patente: a.patente,
      // procedência sai: é rastro interno de quem escreveu o quê
      datas: {
        deposito: a.datas.deposito,
        publicacao: a.datas.publicacao,
        concessao: a.datas.concessao,
        vigencia_ate: a.datas.vigencia_ate,
      },
      // `evento_id` e `fonte` saem; o texto e o código ficam
      situacao: { codigo: a.situacao.codigo, texto: a.situacao.texto, derivada_em: a.situacao.derivada_em },
      /*
       * A vigilância FICA — é a promessa do produto, e onde não vigiamos o cliente tem de
       * saber. Mas só a PARTE que responde a ele: "está vigiado?" e "se não, por quê?".
       * ⛔ `elegivel` e `motivos` são a régua interna (1.540 → 429) e o juízo da casa sobre
       *    o ativo, em vocabulário nosso ('terminal', 'fora da política'). `fonte_feed` é
       *    procedência. Os três eram copiados junto até 07/09/2026.
       */
      vigilancia: {
        ativa: a.vigilancia.ativa,
        motivo: a.vigilancia.motivo,
        atualizado_em: a.vigilancia.atualizado_em,
        proxima_verificacao: a.vigilancia.proxima_verificacao,
      },
      pendencias: a.pendencias.filter((p) => PENDENCIAS_PUBLICAVEIS.has(p.tipo)),
      criado_em: a.criado_em,
      atualizado_em: a.atualizado_em,
    })) as AtivoCliente[]

  const pessoas: PessoaCliente[] = pacote.pessoas
    .filter((p) => pessoaIds.has(p.pessoa_id))
    .map((p) => ({ pessoa_id: p.pessoa_id, tipo: p.tipo, nome: p.nome, pais: p.pais, uf: p.uf }))
  // ⛔ `documentos`, `contato`, `externo` e `gerido_por` NÃO são copiados: o CPF de uma
  //    co-titular pessoa física que não é o cliente logado não pode ir no pacote dele.

  const eventos: EventoCliente[] = pacote.eventos
    .filter((e) => ativoIds.has(e.ativo_id) && e.visivel_ao_cliente && !EVENTOS_INTERNOS.has(e.tipo))
    .map((e) => ({
      evento_id: e.evento_id,
      ativo_id: e.ativo_id,
      tipo: e.tipo,
      codigo: e.codigo,
      titulo: e.titulo,
      texto: e.texto,
      ocorrido_em: e.ocorrido_em,
      publicacao: e.publicacao,
    })) as EventoCliente[]

  const prazos: PrazoCliente[] = pacote.prazos
    .filter((p) => ativoIds.has(p.ativo_id))
    .map((p) => ({
      prazo_id: p.prazo_id,
      ativo_id: p.ativo_id,
      evento_base: p.evento_base,
      /*
       * ⛔ A régua NÃO vai inteira. O objeto vivo do catálogo tem 12 campos; o contrato
       *    declara 9. Os três extras são internos:
       *      `firmeza_padrao`  o valor de fábrica — o que vale é a `firmeza` do prazo
       *      `gatilhos`        os códigos de despacho que a disparam, mecânica nossa
       *      `observacao`      ⚠️ nota OPERACIONAL da casa. A da anuidade diz "a GRU tem pelo
       *                        menos 6 códigos e tratar anuidade como código único emite a
       *                        guia errada" — recado para quem opera, não para quem contrata.
       *
       * ⚠️ TERCEIRA ocorrência da mesma família em 07/09/2026, depois de `marca` e
       *    `vigilancia`: o ramo que copia o objeto inteiro. Aqui o `Omit` não bastava — o
       *    tipo do contrato já era o certo, e quem divergia era o OBJETO em memória, que
       *    carrega campos a mais. Contra isso só monta-campo-a-campo funciona.
       */
      regua: {
        id: p.regua.id,
        nome: p.regua.nome,
        fundamento: p.regua.fundamento,
        dias: p.regua.dias,
        contagem: p.regua.contagem,
        dies_a_quo: p.regua.dies_a_quo,
        ajuste_dia_nao_util: p.regua.ajuste_dia_nao_util,
        calendario: p.regua.calendario,
        prazo_extraordinario: p.regua.prazo_extraordinario,
      },
      abre_em: p.abre_em,
      vence_em: p.vence_em,
      vence_extraordinario_em: p.vence_extraordinario_em,
      firmeza: p.firmeza,
      cumprido: p.cumprido,
    }))
  // ⛔ `prazo_interno_em` sai: é a antecedência OPERACIONAL da casa (medida: legal − 10 dias), o
  //    mesmo campo que o parecer em PDF trata como interno. `fonte` sai: procedência é do dossiê.

  const documentos: DocumentoCliente[] = pacote.documentos
    .filter((d) => d.publicavel && (!d.ativo_id || ativoIds.has(d.ativo_id)))
    .map((d) => ({
      documento_id: d.documento_id,
      ativo_id: d.ativo_id,
      tipo: d.tipo,
      nome: d.nome,
      mime: d.mime,
      tamanho_bytes: d.tamanho_bytes,
      idioma: d.idioma,
    }))
  // ⛔ `origem.ref` e `sha256` saem: a referência interna nunca vira link no navegador.

  const servicos: ServicoCliente[] = pacote.servicos
    .filter((s) => s.ativo_ids.some((id) => ativoIds.has(id)))
    .map((s) => ({
      servico_id: s.servico_id,
      ativo_ids: s.ativo_ids.filter((id) => ativoIds.has(id)),
      tipo: s.tipo,
      materia: s.materia,
      paises: s.paises,
      estado: s.estado,
      datas: s.datas,
      /*
       * O papel atravessa porque é ele que impede a soma dupla no lado do cliente também:
       * sem ele, a tela do cliente contaria a proposta E os derivados dela.
       */
      papel_na_conta: s.papel_na_conta,
      /*
       * O valor atravessa APENAS quando a procedência o sustenta. Sem isto, o "custo do
       * portfólio" somaria `Deal.Amount` — o mesmo campo que infla o nacional em
       * R$ 145.153,79 porque card espelhado repete o valor do irmão.
       */
      valor:
        s.valor && ORIGENS_DE_VALOR_PUBLICAVEIS.has(s.valor.origem)
          ? {
              moeda: s.valor.moeda,
              total: s.valor.total,
              honorario: s.valor.honorario,
              taxa_oficial: s.valor.taxa_oficial,
              taxa_internacional: s.valor.taxa_internacional,
              origem: s.valor.origem,
            }
          : undefined,
    }))
  // ⛔ `valor` de origem `order_amount` sai: Deal.Amount infla o nacional e card de serviço repete o
  //    valor do pai. `responsavel` e `titulo_bruto` também saem (processo interno).

  const colidencias: ColidenciaCliente[] = pacote.colidencias
    .filter((c) => ativoIds.has(c.ativo_id) && c.parecer?.decisao === 'enviar')
    .map((c) => ({
      colidencia_id: c.colidencia_id,
      caso_id: c.caso_id,
      ativo_id: c.ativo_id,
      terceiro: {
        processo: c.terceiro.processo,
        marca: c.terceiro.marca,
        // O titular do terceiro é PÚBLICO: sai na RPI, e sem ele o cliente não sabe QUEM se aproximou.
        titular: c.terceiro.titular,
        pais: c.terceiro.pais,
        uf: c.terceiro.uf,
        // Tudo abaixo é publicação oficial: já é público antes de a Apex olhar.
        deposito: c.terceiro.deposito,
        apresentacao: c.terceiro.apresentacao,
        natureza: c.terceiro.natureza,
        classes: c.terceiro.classes.map((k) => ({
          codigo: k.codigo,
          edicao_ncl: k.edicao_ncl,
          // A especificação é o campo que tem VETO sobre o score — é o que explica ao cliente
          // por que dois sinais parecidos podem não ser conflito. Não faz sentido escondê-la.
          especificacao_bruta: k.especificacao_bruta,
        })),
      },
      dimensoes: c.dimensoes ?? [],
      evento_gatilho: c.evento_gatilho,
      medida: c.medida,
      risco: c.parecer!.risco,
      parecer_em: c.parecer!.em,
      prazo_id: c.prazo_id,
      relatorio_documento_id: c.relatorio?.documento_id,
    }))
  // ⛔ `scores`, `tier` e `triagem` saem: publicar score é publicar o falso positivo
  //    (Verin × Vaerin: fonético 100,00, combinado 78,80, veredito BAIXO) e destruir o portão.

  return {
    contrato_versao: pacote.contrato_versao,
    gerado_em: pacote.gerado_em,
    cobertura: pacote.cobertura,
    completude: pacote.completude,
    lacunas: pacote.lacunas,
    ativos,
    pessoas,
    vinculos: vinculos.map((v) => ({
      ativo_id: v.ativo_id,
      pessoa_id: v.pessoa_id,
      papel: v.papel,
      desde: v.desde,
      ate: v.ate,
    })),
    eventos,
    prazos,
    documentos,
    servicos,
    colidencias,
  }
}

/** Padrões que NUNCA podem aparecer no pacote serializado do cliente. */
export const PROIBIDOS_NA_PROJECAO = [
  'blob.core.windows.net',
  '"contato"',
  /*
   * ⚠️ Era `'"valor"'` — proibição cega. Passou a ser específica em 07/09/2026, quando o
   *    valor investido virou informação do cliente: o que não pode sair é o valor de
   *    procedência DUVIDOSA. `order_amount` é o campo do card no CRM e infla o nacional em
   *    R$ 145.153,79, porque card espelhado repete o valor do irmão.
   *
   *    A auditoria pegou esta mudança na hora — o gerador do exemplo abortou até esta linha
   *    ser reescrita. É o comportamento certo: mudar o que pode ser publicado tem de doer.
   */
  '"origem":"order_amount"',
  /*
   * ⚠️ Acrescentados em 07/09/2026, depois que os dois escaparam de verdade. Não substituem
   *    o `Omit` no tipo — são a SEGUNDA barreira, para o caso de alguém montar o objeto por
   *    fora do `projetarParaCliente`. A lição, de novo: a auditoria confere o que alguém
   *    lembrou de proibir; quem impede o esquecimento é o tipo.
   */
  '"elegivel"',
  '"fonte_feed"',
  '"observacao"',
  '"gatilhos"',
  '"firmeza_padrao"',
  '"scores"',
  '"tier"',
  '"triagem"',
  '"observacoes"',
  '"nota_interna"',
  '"responsavel"',
  '"titulo_bruto"',
  '"sha256"',
  /* `origem.ref` do documento (a URL do anexo, que responde 206 sem credencial). O valor
     também tem um campo `origem`, e por isso a proibição não pode ser pelo nome solto. */
  '"origem":{"sistema"',
  '"externo"',
  '"gerido_por"',
  '"procedencia"',
  '"documentos":[{"tipo":"cpf"',
  '"documentos":[{"tipo":"cnpj"',
  '"papel":"agente"',
  '"decidido_por"',
  '"prazo_interno_em"',
  '"publicavel"',
] as const

/**
 * Auditoria da projeção. **Aborta** — não avisa.
 *
 * ⚠️ A lição que justifica o `throw`: o cron do painel externo prometia varredura de PII que
 * **não existia no script** (0 ocorrências em 86 linhas). Documentação descrevendo proteção
 * inexistente é pior que não ter.
 */
export function auditarProjecao(projetado: PacoteCliente): void {
  const serializado = JSON.stringify(projetado)
  const vazamentos = PROIBIDOS_NA_PROJECAO.filter((p) => serializado.includes(p))
  if (vazamentos.length > 0) {
    throw new Error(
      `VAZAMENTO NA PROJEÇÃO DO CLIENTE — abortado. Encontrados: ${vazamentos.join(', ')}`,
    )
  }
}

/** Projeta e audita. É esta que a aplicação usa; a crua existe só para o teste. */
export function projetarEauditar(pacote: Pacote, pessoaId: string): PacoteCliente {
  const p = projetarParaCliente(pacote, pessoaId)
  auditarProjecao(p)
  return p
}
