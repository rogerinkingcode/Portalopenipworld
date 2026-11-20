/**
 * Dataset de demonstração — 100% FICTÍCIO.
 *
 * ⛔ Regra 16 do `CLAUDE.md`: nome, número de processo, CNPJ e e-mail são inventados. Dado real de
 * cliente nunca entra no repo.
 *
 * O realismo vem da ESTRUTURA, não do nome: classes Nice reais, códigos de despacho reais do INPI,
 * jurisdições reais, réguas de prazo reais. Marcas reais num exemplo de colidência imputariam
 * conflito a empresas que não pediram isso — por isso os sinais são inventados.
 *
 * Cobre o que as duas telas precisam mostrar:
 *   · 4 espécies — marca, patente de invenção, modelo de utilidade, desenho industrial
 *   · 12 jurisdições — BR, US, EM (EUIPO), WO (Madri), CN, JP, AR, MX, CL, CO, GB, PT
 *   · cliente direto (titular = cliente) e cliente via PARCEIRO (titular ≠ cliente)
 *   · agente correspondente, que ⛔ nunca é publicável
 *   · contato por SERVIÇO — quem autorizou cada etapa
 *   · ativo sem número (em nascimento) e ativo com titular anônimo
 *   · vigilância ligada (BR) e desligada (DI e jurisdições sem feed)
 *   · ameaças de colidência com parecer aprovado e com parecer pendente
 */

import type {
  Ativo, Colidencia, DocumentoArquivo, Evento, Especie, Identificador, Pacote, Papel, Pessoa,
  Prazo, Servico, Vinculo,
} from '../contrato/tipos.ts'
import { eventoId } from '../regras/identidade.ts'
import { CATALOGO } from '../regras/reguas.ts'
import { calcularPrazo, somarDias } from '../regras/calendario.ts'
import { agoraIso, hojeIso } from './tempo.ts'

// ───────────────────────────────────────────────────────────────────────────
// Identificadores legíveis, dentro do alfabeto Crockford (sem I, L, O, U)
// ───────────────────────────────────────────────────────────────────────────

function id(sufixo: string): string {
  const p = '01J9DEM0'
  return p + '0'.repeat(26 - p.length - sufixo.length) + sufixo
}

// Pessoas
const P = {
  hidrovale: id('PJ001'), terrafe: id('PJ002'), vitrana: id('PJ003'),
  bioenergia: id('PJ004'), kaba: id('PJ005'), renner: id('PF006'),
  parceiro: id('PA007'), padaria: id('CF008'), bertoldi: id('CF009'),
  ferraz: id('PF010'), gerente: id('CT011'), diretora: id('CT012'),
  agDE: id('AG013'), agJP: id('AG014'), agCL: id('AG015'), agCN: id('AG016'),
  apex: id('PR017'),
}

// ───────────────────────────────────────────────────────────────────────────

export function carregarExemplo(): Pacote {
  const agora = agoraIso()
  const hoje = hojeIso()
  const pessoas: Pessoa[] = []
  const ativos: Ativo[] = []
  const vinculos: Vinculo[] = []
  const eventos: Evento[] = []
  const prazos: Prazo[] = []
  const documentos: DocumentoArquivo[] = []
  const servicos: Servico[] = []
  const colidencias: Colidencia[] = []

  // ── pessoas ──────────────────────────────────────────────────────────────
  const pessoa = (
    pid: string, tipo: 'fisica' | 'juridica', nome: string, doc: string | null,
    pais: string, uf?: string, extra?: Partial<Pessoa>,
  ): Pessoa => {
    const p: Pessoa = {
      pessoa_id: pid, tipo, nome,
      nome_normalizado: nome.normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase(),
      documentos: doc
        ? [{ tipo: doc.length === 14 ? 'cpf' : doc.includes('/') ? 'cnpj' : 'estrangeiro', valor: doc, pais }]
        : [],
      pais, uf, externo: {}, fonte: 'inpi_consulta', criado_em: agora, atualizado_em: agora,
      ...extra,
    }
    pessoas.push(p)
    return p
  }

  pessoa(P.hidrovale, 'juridica', 'Hidrovale Bombas e Válvulas Ltda', '12.345.678/0001-90', 'BR', 'RS', {
    razao_social: 'HIDROVALE BOMBAS E VALVULAS LTDA',
    contato: { emails: ['juridico@hidrovale.exemplo'], telefones: ['+55 51 90000-0001'], email_compartilhado: false },
    externo: { ploomes_contact_id: 500100001 },
  })
  pessoa(P.terrafe, 'juridica', 'Terrafé Alimentos S.A.', '23.456.789/0001-01', 'BR', 'SP', {
    razao_social: 'TERRAFE ALIMENTOS S.A.',
    contato: { emails: ['marcas@terrafe.exemplo'], telefones: ['+55 11 90000-0002'], email_compartilhado: false },
    externo: { ploomes_contact_id: 500100002 },
  })
  pessoa(P.vitrana, 'juridica', 'Vitrana Cosméticos Ltda', '34.567.890/0001-12', 'BR', 'SP', {
    contato: { emails: ['legal@vitrana.exemplo'], telefones: ['+55 11 90000-0003'], email_compartilhado: false },
    externo: { ploomes_contact_id: 500100003 },
  })
  pessoa(P.bioenergia, 'juridica', 'Nordeste Bioenergia S.A.', '45.678.901/0001-23', 'BR', 'PE', {
    contato: { emails: ['pi@nordestebio.exemplo'], telefones: ['+55 81 90000-0004'], email_compartilhado: false },
    externo: { ploomes_contact_id: 500100004 },
  })
  pessoa(P.kaba, 'juridica', 'Studio Kaba Arquitetura Ltda', '56.789.012/0001-34', 'BR', 'SC', {
    contato: { emails: ['contato@studiokaba.exemplo'], telefones: ['+55 48 90000-0005'], email_compartilhado: false },
  })
  pessoa(P.renner, 'fisica', 'Paulo Renner Sobral', '123.456.789-09', 'BR', 'PR', {
    contato: { emails: ['paulo.renner@exemplo.com'], telefones: ['+55 41 90000-0006'], email_compartilhado: false },
  })
  pessoa(P.ferraz, 'fisica', 'Ana Beatriz Ferraz', '987.654.321-00', 'BR', 'RS')
  pessoa(P.parceiro, 'juridica', 'Marcas do Sul Assessoria Ltda', '67.890.123/0001-45', 'BR', 'SC', {
    contato: { emails: ['operacoes@marcasdosul.exemplo'], telefones: ['+55 47 90000-0007'], email_compartilhado: false },
    externo: { ploomes_contact_id: 500100007 },
  })
  pessoa(P.padaria, 'juridica', 'Padaria Estrela do Vale ME', null, 'BR', 'SC', {
    gerido_por: P.parceiro, fonte: 'declarado_cliente',
  })
  pessoa(P.bertoldi, 'juridica', 'AutoPeças Bertoldi Ltda', '78.901.234/0001-56', 'BR', 'PR', {
    gerido_por: P.parceiro, fonte: 'declarado_cliente',
  })
  pessoa(P.gerente, 'fisica', 'Carla Nogueira', null, 'BR', 'RS', {
    fonte: 'ploomes',
    contato: { emails: ['carla.nogueira@hidrovale.exemplo'], telefones: ['+55 51 90000-0011'], email_compartilhado: false },
  })
  pessoa(P.diretora, 'fisica', 'Marina Palhares', null, 'BR', 'SP', {
    fonte: 'ploomes',
    contato: { emails: ['marina.palhares@terrafe.exemplo'], telefones: ['+55 11 90000-0012'], email_compartilhado: false },
  })
  pessoa(P.agDE, 'juridica', 'Nordlicht IP Partners', 'DE811234567', 'DE')
  pessoa(P.agJP, 'juridica', 'Sakura & Kondo IP Office', 'JP0100000001', 'JP')
  pessoa(P.agCL, 'juridica', 'Cordillera Marcas SpA', 'CL761234567', 'CL')
  pessoa(P.agCN, 'juridica', 'Beijing Hanwei IP Agency', 'CN911100000001', 'CN')
  pessoa(P.apex, 'juridica', 'Apex Propriedade Intelectual Ltda', '89.012.345/0001-67', 'BR', 'TO')

  // ── helpers ──────────────────────────────────────────────────────────────
  let seqAtivo = 0
  const criarAtivo = (o: {
    especie: Especie
    jurisdicao: string
    numero?: string
    tipoNum?: Identificador['tipo']
    papelNum?: Identificador['papel']
    marca?: string
    classes?: { codigo: string; edicao_ncl?: string; especificacao_bruta?: string }[]
    apresentacao?: 'nominativa' | 'mista' | 'figurativa' | 'tridimensional'
    titulo?: string
    ipc?: string[]
    deposito?: string | null
    concessao?: string | null
    vigencia?: string | null
    situacao: string
    codigoSit?: string
    vigia: boolean
    motivoVigia?: string
    familia?: string
    fonte?: Ativo['fonte']
    pendencias?: Ativo['pendencias']
  }): Ativo => {
    seqAtivo++
    const aid = id('AT' + String(seqAtivo).padStart(3, '0'))
    const fonte = o.fonte ?? (o.jurisdicao === 'BR' ? 'inpi_consulta' : 'certificado_agente')
    const a: Ativo = {
      ativo_id: aid,
      especie: o.especie,
      jurisdicao: o.jurisdicao,
      identificadores: o.numero
        ? [{
            tipo: o.tipoNum ?? (o.especie === 'marca' ? 'inpi_marca' : 'inpi_patente'),
            valor_bruto: o.numero,
            valor_normalizado: o.numero.replace(/\s/g, ''),
            jurisdicao: o.jurisdicao,
            papel: o.papelNum ?? 'registro',
            desde: o.deposito ?? undefined,
            fonte,
          }]
        : [],
      familia_id: o.familia,
      marca: o.marca
        ? {
            nome: o.marca,
            nome_normalizado: o.marca.toUpperCase(),
            apresentacao: o.apresentacao ?? 'nominativa',
            natureza: 'produto',
            classes: o.classes ?? [],
          }
        : undefined,
      patente: o.titulo ? { titulo: o.titulo, ipc: o.ipc } : undefined,
      datas: {
        deposito: o.deposito ?? null,
        concessao: o.concessao ?? null,
        vigencia_ate: o.vigencia ?? null,
        procedencia: o.deposito ? { deposito: { fonte, observado_em: agora } } : {},
      },
      situacao: { codigo: o.codigoSit, texto: o.situacao, derivada_em: agora, fonte },
      vigilancia: {
        ativa: o.vigia,
        elegivel: o.vigia,
        motivos: o.vigia ? [] : [o.motivoVigia ?? 'sem feed automatizado para esta jurisdição'],
        motivo: o.vigia ? undefined : (o.motivoVigia ?? 'sem feed automatizado para esta jurisdição'),
        fonte_feed: o.vigia ? 'rpi_xml' : undefined,
        atualizado_em: o.vigia ? '2026-09-01' : '2026-08-14',
        proxima_verificacao: o.vigia ? '2026-09-08' : undefined,
      },
      pendencias: o.pendencias ?? [],
      fonte,
      externo: {},
      criado_em: agora,
      atualizado_em: agora,
    }
    ativos.push(a)
    return a
  }

  let seqVinc = 0
  const vincular = (
    ativoId: string, pessoaId: string, papel: Papel,
    o?: { publicavel?: boolean; confianca?: Vinculo['confianca']; servicoId?: string; ordem?: number; por?: string },
  ) => {
    seqVinc++
    vinculos.push({
      vinculo_id: id('VN' + String(seqVinc).padStart(3, '0')),
      ativo_id: ativoId,
      pessoa_id: pessoaId,
      papel,
      escopo: o?.servicoId ? 'servico' : 'ativo',
      servico_id: o?.servicoId,
      ordem: o?.ordem,
      fonte: o?.por ? 'decisao_humana' : papel === 'contato' ? 'ploomes' : 'inpi_consulta',
      decidido_por: o?.por,
      confianca: o?.confianca ?? (o?.por ? 'confirmado' : 'derivado'),
      // ⛔ agente NUNCA é publicável
      publicavel: papel === 'agente' ? false : (o?.publicavel ?? true),
    })
  }

  const despacho = (
    ativo: Ativo, codigo: string, titulo: string, data: string, revista: number,
    o?: { texto?: string; pagina?: number; tipo?: 'marcas' | 'patentes'; interno?: boolean },
  ): Evento => {
    const num = ativo.identificadores[0]?.valor_normalizado ?? ativo.ativo_id
    const e: Evento = {
      evento_id: eventoId({
        jurisdicao: ativo.jurisdicao, identificador: num, codigo,
        ocorrido_em: data, publicacao_tipo: o?.tipo ?? 'marcas', revista,
      }),
      ativo_id: ativo.ativo_id,
      tipo: 'despacho',
      codigo,
      titulo,
      texto: o?.texto,
      ocorrido_em: data,
      publicacao: { tipo: o?.tipo ?? 'marcas', revista, data, pagina: o?.pagina },
      observacoes: [{ fonte: 'rpi_xml', observado_em: agora, documento_hash: 'a'.repeat(64) }],
      visivel_ao_cliente: !o?.interno,
    }
    eventos.push(e)
    return e
  }

  let seqPrazo = 0
  const prazo = (
    ativo: Ativo, base: Evento | null, reguaId: string, venceEm: string,
    o?: { firmeza?: Prazo['firmeza']; interno?: string; extraordinario?: string; abre?: string },
  ) => {
    seqPrazo++
    const r = CATALOGO[reguaId]
    prazos.push({
      prazo_id: id('PZ' + String(seqPrazo).padStart(3, '0')),
      ativo_id: ativo.ativo_id,
      evento_base: base?.evento_id ?? 'sem-evento-base',
      regua: r,
      abre_em: o?.abre,
      vence_em: venceEm,
      prazo_interno_em: o?.interno,
      vence_extraordinario_em: o?.extraordinario,
      firmeza: o?.firmeza ?? r.firmeza_padrao,
      fonte: ativo.fonte,
    })
  }

  let seqDoc = 0
  const doc = (
    ativoId: string | undefined, tipo: DocumentoArquivo['tipo'], nome: string, kb: number,
    publicavel: boolean, o?: { idioma?: 'pt' | 'en'; pessoaId?: string },
  ) => {
    seqDoc++
    documentos.push({
      documento_id: id('DK' + String(seqDoc).padStart(3, '0')),
      ativo_id: ativoId,
      pessoa_id: o?.pessoaId,
      tipo, nome,
      mime: nome.endsWith('.pdf') ? 'application/pdf' : 'image/png',
      tamanho_bytes: kb * 1024,
      sha256: String(seqDoc).padStart(64, '0'),
      origem: { sistema: 'ploomes', ref: `attachment:5011${String(seqDoc).padStart(5, '0')}` },
      publicavel,
      publicavel_por: publicavel ? 'gui' : undefined,
      publicavel_em: publicavel ? '2026-09-06' : undefined,
      idioma: o?.idioma ?? 'pt',
      fonte: 'upload_manual',
      criado_em: agora,
    })
  }

  let seqSrv = 0
  const servico = (
    ativoIds: string[], tipo: string, estado: Servico['estado'], abertura: string,
    o?: {
      conclusao?: string; materia?: string[]; paises?: string[]; valor?: number
      resp?: string; titulo?: string
      /** parte do total que é honorário da casa */
      honorario?: number
      /** parte do total que é GRU do INPI */
      taxa?: number
      /** parte do total que é associado/autarquia no exterior */
      taxaInt?: number
      origemValor?: 'order_amount' | 'nota_fiscal' | 'cobranca' | 'declarado'
      papel?: 'proposta' | 'derivado' | 'avulso' | 'indefinido'
    },
  ): Servico => {
    seqSrv++
    const s: Servico = {
      servico_id: id('SV' + String(seqSrv).padStart(3, '0')),
      ativo_ids: ativoIds,
      origem: {
        sistema: 'ploomes',
        deal_id: 503100000 + seqSrv,
        funil_id: 10015007,
        titulo_bruto: o?.titulo ?? tipo,
      },
      tipo,
      /*
       * No exemplo: serviço que cobre UM ativo é avulso; o que cobre vários é a proposta
       * guarda-chuva. Na carga real isto vem do `OriginDealId` do Ploomes — e enquanto não
       * vier, o papel fica `indefinido` e o valor NÃO entra em soma nenhuma.
       */
      papel_na_conta: o?.papel ?? (ativoIds.length > 1 ? 'proposta' : 'avulso'),
      materia: o?.materia,
      paises: o?.paises,
      estado,
      datas: { abertura, conclusao: o?.conclusao },
      responsavel: o?.resp ?? 'wivyanne',
      /*
       * A PROCEDÊNCIA é o que decide se o número pode ser publicado. Serviço concluído
       * costuma ter nota emitida; o que está em andamento ainda é cobrança ou estimativa
       * declarada. `order_amount` — o campo do CRM que infla — fica reservado para quando
       * a carga real trouxer só ele, e nesse caso o valor NÃO chega ao cliente.
       */
      valor: o?.valor
        ? {
            moeda: 'BRL' as const,
            total: o.valor,
            honorario: o.honorario,
            taxa_oficial: o.taxa,
            taxa_internacional: o.taxaInt,
            origem: o.origemValor ?? (estado === 'concluido' ? 'nota_fiscal' : 'cobranca'),
          }
        : undefined,
      fonte: 'ploomes',
      observado_em: agora,
    }
    servicos.push(s)
    return s
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HIDROVALE — industrial, marca + patente + MU + DI, e exporta
  // ═══════════════════════════════════════════════════════════════════════
  const famHidro = id('FM001')

  const hidroMarcaBR = criarAtivo({
    especie: 'marca', jurisdicao: 'BR', numero: '934567890', papelNum: 'registro',
    marca: 'HIDROVALE', apresentacao: 'mista', familia: famHidro,
    classes: [{ codigo: '07', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Bombas hidráulicas; válvulas [partes de máquinas]; compressores' }],
    deposito: '2022-08-09', concessao: '2024-05-14', vigencia: '2034-05-14',
    situacao: 'Registro em vigor', codigoSit: 'IPAS158', vigia: true,
  })
  const evHidroConc = despacho(hidroMarcaBR, 'IPAS158', 'Concessão de registro', '2024-05-14', 2784, { pagina: 4120 })
  prazo(hidroMarcaBR, evHidroConc, 'br.marca.prorrogacao', '2034-05-14', { extraordinario: '2034-11-10', abre: '2033-05-14' })
  vincular(hidroMarcaBR.ativo_id, P.hidrovale, 'titular', { ordem: 1, confianca: 'confirmado', por: 'marcio' })
  vincular(hidroMarcaBR.ativo_id, P.hidrovale, 'cliente')
  vincular(hidroMarcaBR.ativo_id, P.apex, 'procurador')

  const hidroMarcaEM = criarAtivo({
    especie: 'marca', jurisdicao: 'EM', numero: '018999999', tipoNum: 'euipo',
    marca: 'HIDROVALE', familia: famHidro,
    classes: [{ codigo: '07', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Hydraulic pumps; valves [parts of machines]' }],
    deposito: '2024-10-15', concessao: '2025-03-03', vigencia: '2034-10-15',
    situacao: 'Registered', vigia: false,
    motivoVigia: 'EUIPO tem API oficial, mas não está ligada no MVP — a fonte atual é o certificado do agente',
  })
  vincular(hidroMarcaEM.ativo_id, P.hidrovale, 'titular', { ordem: 1 })
  vincular(hidroMarcaEM.ativo_id, P.agDE, 'agente')

  const hidroMarcaUS = criarAtivo({
    especie: 'marca', jurisdicao: 'US', numero: '97/123,456', tipoNum: 'uspto_serial', papelNum: 'pedido',
    marca: 'HIDROVALE', familia: famHidro,
    classes: [{ codigo: '07', especificacao_bruta: 'Hydraulic pumps and valves for industrial use' }],
    deposito: '2025-02-11', situacao: 'Published for opposition', vigia: false,
    motivoVigia: 'USPTO tem API oficial (TSDR/ODP); não ligada no MVP',
  })
  vincular(hidroMarcaUS.ativo_id, P.hidrovale, 'titular', { ordem: 1 })

  const hidroMarcaCN = criarAtivo({
    especie: 'marca', jurisdicao: 'CN', numero: '76543210', tipoNum: 'nacional_estrangeiro',
    marca: 'HIDROVALE', familia: famHidro,
    classes: [{ codigo: '07', especificacao_bruta: '液压泵；阀门（机器部件）' }],
    deposito: '2024-06-03', concessao: '2025-08-20', vigencia: '2035-08-20',
    situacao: 'Registrada (conforme certificado do agente)', vigia: false,
    motivoVigia: 'CNIPA não tem API pública e responde 412 a consulta automatizada — fonte: certificado do agente',
  })
  vincular(hidroMarcaCN.ativo_id, P.hidrovale, 'titular', { ordem: 1 })
  vincular(hidroMarcaCN.ativo_id, P.agCN, 'agente')

  const hidroPatente = criarAtivo({
    especie: 'patente_invencao', jurisdicao: 'BR',
    numero: 'BR 10 2023 012345-6', tipoNum: 'inpi_patente', papelNum: 'pedido',
    titulo: 'Válvula de retenção com selo autoajustável para bombeamento de fluidos abrasivos',
    ipc: ['F16K 15/02', 'F04D 29/12'],
    deposito: '2023-06-20', situacao: 'Exigência técnica publicada — aguardando manifestação',
    codigoSit: '6.1', vigia: true,
  })
  const evExig = despacho(hidroPatente, '6.1', 'Exigência Técnica - Art. 36 da LPI', '2026-09-01', 2904, {
    tipo: 'patentes', pagina: 812, texto: 'Reformular o quadro reivindicatório conforme parecer técnico.',
  })
  prazo(hidroPatente, evExig, 'br.patente.exigencia_tecnica',
    calcularPrazo('2026-09-01', CATALOGO['br.patente.exigencia_tecnica']).vence_em, { interno: '2026-11-20' })
  prazo(hidroPatente, null, 'br.patente.anuidade', somarDias(hoje, 14), { extraordinario: somarDias(hoje, 194) })
  despacho(hidroPatente, '3.1', 'Pedido de Patente Publicado', '2025-01-07', 2818, { tipo: 'patentes', pagina: 240 })
  vincular(hidroPatente.ativo_id, P.hidrovale, 'titular', { ordem: 1, confianca: 'confirmado', por: 'gui' })
  vincular(hidroPatente.ativo_id, P.ferraz, 'cotitular', { ordem: 2, confianca: 'confirmado', por: 'gui' })
  vincular(hidroPatente.ativo_id, P.apex, 'procurador')

  const hidroMU = criarAtivo({
    especie: 'modelo_utilidade', jurisdicao: 'BR',
    numero: 'BR 20 2024 008877-1', tipoNum: 'inpi_patente', papelNum: 'pedido',
    titulo: 'Disposição construtiva aplicada em rotor de bomba centrífuga',
    ipc: ['F04D 29/22'],
    deposito: '2024-04-18', situacao: 'Em exame técnico', codigoSit: '2.1', vigia: true,
  })
  despacho(hidroMU, '2.1', 'Pedido de Modelo de Utilidade Depositado', '2024-05-07', 2782, { tipo: 'patentes' })
  prazo(hidroMU, null, 'br.patente.anuidade', somarDias(hoje, 122), { extraordinario: somarDias(hoje, 302) })
  vincular(hidroMU.ativo_id, P.hidrovale, 'titular', { ordem: 1 })

  const hidroDI = criarAtivo({
    especie: 'desenho_industrial', jurisdicao: 'BR',
    numero: 'BR 30 2025 001234-5', tipoNum: 'inpi_di',
    titulo: 'Configuração aplicada a corpo de válvula industrial',
    deposito: '2025-03-12', concessao: '2025-11-04', vigencia: '2035-03-12',
    situacao: 'Registro concedido', codigoSit: '16.1', vigia: false,
    motivoVigia: 'Desenho industrial: a RPI publica DI só em PDF — não há feed estruturado (DI####.zip devolve 404)',
  })
  vincular(hidroDI.ativo_id, P.hidrovale, 'titular', { ordem: 1 })

  // serviços e contato POR SERVIÇO
  const srvHidro1 = servico([hidroMarcaBR.ativo_id], 'Deferimento de registro de marca', 'concluido', '2024-03-01', {
    conclusao: '2024-05-20', materia: ['Marcas'], paises: ['BR'], valor: 1250, honorario: 890, taxa: 360,
    titulo: 'Deferimento de Registro de Marca - GRU 372 - HIDROVALE - 934567890',
  })
  vincular(hidroMarcaBR.ativo_id, P.gerente, 'contato', { servicoId: srvHidro1.servico_id, confianca: 'confirmado' })

  const srvHidro2 = servico([hidroPatente.ativo_id], 'Pagamento da 3ª anuidade', 'concluido', '2026-07-01', {
    conclusao: '2026-07-09', materia: ['Patentes'], paises: ['BR'], valor: 400, honorario: 205, taxa: 195,
    titulo: 'Pagamento da 3ª Anuidade - (GRU 220) BR 102023012345-6',
  })
  vincular(hidroPatente.ativo_id, P.gerente, 'contato', { servicoId: srvHidro2.servico_id, confianca: 'confirmado' })

  const srvHidro3 = servico([hidroPatente.ativo_id], 'Manifestação a exigência técnica', 'em_andamento', '2026-09-02', {
    materia: ['Patentes'], paises: ['BR'], valor: 3800, honorario: 3800, taxa: 0,
    titulo: 'Manifestação a Exigência Técnica - Art. 36 - BR 102023012345-6',
  })
  vincular(hidroPatente.ativo_id, P.gerente, 'contato', { servicoId: srvHidro3.servico_id })

  servico([hidroMarcaEM.ativo_id, hidroMarcaUS.ativo_id], 'Depósito no exterior', 'concluido', '2024-09-10', {
    conclusao: '2025-02-14', materia: ['Marcas'], paises: ['EM', 'US'], valor: 18400, honorario: 7400, taxaInt: 11000,
    titulo: 'Depósito de Marca no Exterior - HIDROVALE - União Europeia e Estados Unidos',
  })

  doc(hidroMarcaBR.ativo_id, 'certificado', 'Certificado de Registro de Marca - 934567890.pdf', 283, true)
  doc(hidroMarcaBR.ativo_id, 'procuracao', 'Procuração - Hidrovale Bombas e Válvulas Ltda.pdf', 96, true)
  doc(hidroPatente.ativo_id, 'recibo_protocolo', 'Recibo de protocolo - Depósito BR 102023012345-6.pdf', 141, true)
  doc(hidroPatente.ativo_id, 'peticao', 'Relatório descritivo e reivindicações.pdf', 872, true)
  doc(hidroPatente.ativo_id, 'comprovante_gru', 'Comprovante GRU 220 - 3ª anuidade.pdf', 64, true)
  doc(hidroMarcaEM.ativo_id, 'carta_agente', 'Nordlicht - invoice and cover letter.pdf', 118, false, { idioma: 'en' })
  doc(undefined, 'contrato', 'Contrato de prestação de serviços - Hidrovale (assinado).pdf', 210, true, { pessoaId: P.hidrovale })

  // ═══════════════════════════════════════════════════════════════════════
  // TERRAFÉ — alimentos, marca multiclasse + Madri, e a AMEAÇA principal
  // ═══════════════════════════════════════════════════════════════════════
  const famTerra = id('FM002')

  const terraMarca = criarAtivo({
    especie: 'marca', jurisdicao: 'BR', numero: '928776554',
    marca: 'TERRAFÉ', apresentacao: 'mista', familia: famTerra,
    classes: [
      { codigo: '30', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Café; café torrado e moído; cápsulas de café; achocolatado' },
      { codigo: '43', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Serviços de cafeteria; serviços de bar e lanchonete' },
    ],
    deposito: '2021-11-30', concessao: '2023-08-15', vigencia: '2033-08-15',
    situacao: 'Registro em vigor', codigoSit: 'IPAS158', vigia: true,
  })
  const evTerraConc = despacho(terraMarca, 'IPAS158', 'Concessão de registro', '2023-08-15', 2745, { pagina: 2210 })
  prazo(terraMarca, evTerraConc, 'br.marca.prorrogacao', '2033-08-15', { extraordinario: '2034-02-11', abre: '2032-08-15' })
  vincular(terraMarca.ativo_id, P.terrafe, 'titular', { ordem: 1, confianca: 'confirmado', por: 'marcio' })
  vincular(terraMarca.ativo_id, P.terrafe, 'cliente')
  vincular(terraMarca.ativo_id, P.apex, 'procurador')

  const terraMadri = criarAtivo({
    especie: 'marca', jurisdicao: 'WO', numero: '1734501', tipoNum: 'madri',
    marca: 'TERRAFÉ', familia: famTerra,
    classes: [{ codigo: '30', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Coffee; roasted and ground coffee; coffee capsules' }],
    deposito: '2024-02-20', situacao: 'Registro internacional em vigor — designações AR, CL, MX, PT',
    concessao: '2024-08-01', vigencia: '2034-02-20', vigia: false,
    motivoVigia: 'Madri: os termos da WIPO proíbem consulta automatizada — a atualização vem do agente ou do certificado',
  })
  vincular(terraMadri.ativo_id, P.terrafe, 'titular', { ordem: 1 })

  const terraAR = criarAtivo({
    especie: 'marca', jurisdicao: 'AR', numero: '4123456', tipoNum: 'nacional_estrangeiro',
    marca: 'TERRAFÉ', familia: famTerra,
    classes: [{ codigo: '30', especificacao_bruta: 'Café; café tostado y molido' }],
    deposito: '2024-03-05', concessao: '2025-06-18', vigencia: '2035-06-18',
    situacao: 'Concedida (designação de Madri)', vigia: false,
    motivoVigia: 'INPI argentino não sondado — fonte: certificado do agente',
  })
  vincular(terraAR.ativo_id, P.terrafe, 'titular', { ordem: 1 })
  vincular(terraAR.ativo_id, P.agCL, 'agente')

  const terraMX = criarAtivo({
    especie: 'marca', jurisdicao: 'MX', numero: '2456789', tipoNum: 'nacional_estrangeiro',
    marca: 'TERRAFÉ', familia: famTerra,
    classes: [{ codigo: '30', especificacao_bruta: 'Café; café tostado y molido' }],
    deposito: '2024-03-05', situacao: 'Em exame — designação de Madri', vigia: false,
    motivoVigia: 'IMPI mexicano não sondado — fonte: certificado do agente',
  })
  vincular(terraMX.ativo_id, P.terrafe, 'titular', { ordem: 1 })

  const terraPT = criarAtivo({
    especie: 'marca', jurisdicao: 'PT', numero: '712345', tipoNum: 'nacional_estrangeiro',
    marca: 'TERRAFÉ', familia: famTerra,
    classes: [{ codigo: '30' }, { codigo: '43' }],
    deposito: '2024-03-05', concessao: '2024-12-02', vigencia: '2034-03-05',
    situacao: 'Concedida (designação de Madri)', vigia: false,
    motivoVigia: 'INPI português não sondado — fonte: certificado do agente',
  })
  vincular(terraPT.ativo_id, P.terrafe, 'titular', { ordem: 1 })

  const srvTerra1 = servico([terraMadri.ativo_id, terraAR.ativo_id, terraMX.ativo_id, terraPT.ativo_id],
    'Registro internacional via Protocolo de Madri', 'concluido', '2024-01-08', {
      conclusao: '2024-08-14', materia: ['Marcas'], paises: ['WO', 'AR', 'MX', 'PT'], valor: 27600, honorario: 9600, taxaInt: 18000,
      titulo: 'Protocolo de Madri - TERRAFÉ - 4 designações',
    })
  vincular(terraMarca.ativo_id, P.diretora, 'contato', { servicoId: srvTerra1.servico_id, confianca: 'confirmado' })

  const srvTerra2 = servico([terraMarca.ativo_id], 'Oposição a pedido de terceiro', 'em_andamento', '2026-09-03', {
    materia: ['Marcas'], paises: ['BR'], valor: 4200, honorario: 4200, taxa: 0,
    titulo: 'Oposição - GRU 332 - TERRAFÉ vs TERRA FÉ CAFÉ - 946110022',
  })
  vincular(terraMarca.ativo_id, P.diretora, 'contato', { servicoId: srvTerra2.servico_id })

  doc(terraMarca.ativo_id, 'certificado', 'Certificado de Registro de Marca - 928776554.pdf', 291, true)
  doc(terraMarca.ativo_id, 'procuracao', 'Procuração - Terrafé Alimentos S.A.pdf', 88, true)
  doc(terraMadri.ativo_id, 'certificado', 'WIPO - Certificate of International Registration 1734501.pdf', 402, true, { idioma: 'en' })
  doc(terraMarca.ativo_id, 'relatorio_colidencia', 'Apex_RPI_2904_Risco_Alto_TERRAFE_928776554_x_TERRA_FE_CAFE_946110022_PT.pdf', 87, true)

  // ═══════════════════════════════════════════════════════════════════════
  // VITRANA — cosméticos, marca + DI, e uma ameaça em análise
  // ═══════════════════════════════════════════════════════════════════════
  const vitMarca = criarAtivo({
    especie: 'marca', jurisdicao: 'BR', numero: '941002233',
    marca: 'VITRANA', apresentacao: 'nominativa',
    classes: [{ codigo: '03', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Cosméticos; cremes para a pele; loções capilares; sabonetes' }],
    deposito: '2023-04-27', concessao: '2025-02-11', vigencia: '2035-02-11',
    situacao: 'Registro em vigor', codigoSit: 'IPAS158', vigia: true,
  })
  const evVitConc = despacho(vitMarca, 'IPAS158', 'Concessão de registro', '2025-02-11', 2822, { pagina: 5510 })
  prazo(vitMarca, evVitConc, 'br.marca.prorrogacao', '2035-02-11', { extraordinario: '2035-08-10', abre: '2034-02-11' })
  vincular(vitMarca.ativo_id, P.vitrana, 'titular', { ordem: 1, confianca: 'confirmado', por: 'marcio' })
  vincular(vitMarca.ativo_id, P.vitrana, 'cliente')

  const vitDI = criarAtivo({
    especie: 'desenho_industrial', jurisdicao: 'BR', numero: 'BR 30 2024 004455-8', tipoNum: 'inpi_di',
    titulo: 'Configuração aplicada a frasco de cosmético',
    deposito: '2024-08-30', concessao: '2025-05-06', vigencia: '2034-08-30',
    situacao: 'Registro concedido', codigoSit: '16.1', vigia: false,
    motivoVigia: 'Desenho industrial: a RPI publica DI só em PDF — não há feed estruturado',
  })
  vincular(vitDI.ativo_id, P.vitrana, 'titular', { ordem: 1 })

  const vitPedido = criarAtivo({
    especie: 'marca', jurisdicao: 'BR',
    marca: 'VITRANA BOTANICS', apresentacao: 'mista',
    classes: [{ codigo: '03', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Cosméticos de origem vegetal' }],
    situacao: 'Aguardando protocolo — número ainda não atribuído pelo INPI', vigia: false,
    motivoVigia: 'Ativo em nascimento: sem número, não há o que cruzar com a revista',
    pendencias: [{ tipo: 'sem_numero', detalhe: 'o número chega quando o INPI atribuir; o identificador interno do portfólio não muda' }],
  })
  vincular(vitPedido.ativo_id, P.vitrana, 'titular', { ordem: 1 })

  servico([vitMarca.ativo_id], 'Registro de marca', 'concluido', '2023-04-10', {
    conclusao: '2025-02-20', materia: ['Marcas'], paises: ['BR'], valor: 2100, honorario: 1355, taxa: 745,
    titulo: 'Pedido de Registro de Marca - GRU 389 - VITRANA - Classe 03',
  })
  servico([vitPedido.ativo_id], 'Registro de marca', 'em_andamento', '2026-08-25', {
    materia: ['Marcas'], paises: ['BR'], valor: 2400, honorario: 2400, taxa: 0,
    titulo: 'Pedido de Registro de Marca - VITRANA BOTANICS - Classe 03 - Mista',
  })
  doc(vitMarca.ativo_id, 'certificado', 'Certificado de Registro de Marca - 941002233.pdf', 276, true)
  doc(vitMarca.ativo_id, 'procuracao', 'Procuração - Vitrana Cosméticos Ltda.pdf', 91, true)
  doc(vitDI.ativo_id, 'certificado', 'Certificado de Registro de DI - BR302024004455-8.pdf', 2870, true)

  // ═══════════════════════════════════════════════════════════════════════
  // NORDESTE BIOENERGIA — patentes, PCT, prazo crítico
  // ═══════════════════════════════════════════════════════════════════════
  const bioPat = criarAtivo({
    especie: 'patente_invencao', jurisdicao: 'BR',
    numero: 'BR 11 2022 019345-7', tipoNum: 'inpi_patente', papelNum: 'pedido',
    titulo: 'Processo de hidrólise enzimática de bagaço de cana com recirculação de licor',
    ipc: ['C12P 19/14', 'C13K 1/02'],
    deposito: '2022-09-26', situacao: 'Deferido — aguardando pagamento da retribuição final',
    codigoSit: '9.1', vigia: true,
  })
  const evBioDef = despacho(bioPat, '9.1', 'Deferimento - Art. 38 da LPI e Resolução 72/2013',
    somarDias(hoje, -12), 2903, { tipo: 'patentes', pagina: 1044 })
  prazo(bioPat, evBioDef, 'br.patente.exigencia_tecnica', somarDias(hoje, 5), { interno: somarDias(hoje, -5), firmeza: 'praticado' })
  prazo(bioPat, null, 'br.patente.anuidade', somarDias(hoje, 61), { extraordinario: somarDias(hoje, 241) })
  vincular(bioPat.ativo_id, P.bioenergia, 'titular', { ordem: 1, confianca: 'confirmado', por: 'gui' })
  vincular(bioPat.ativo_id, P.apex, 'procurador')

  const bioPCT = criarAtivo({
    especie: 'patente_invencao', jurisdicao: 'WO',
    numero: 'PCT/BR2023/050123', tipoNum: 'pct', papelNum: 'internacional',
    titulo: 'Processo de hidrólise enzimática de bagaço de cana com recirculação de licor',
    deposito: '2023-03-14', situacao: 'Fase internacional encerrada — fases nacionais em curso',
    vigia: false, motivoVigia: 'PCT: o dado chega pelo EPO OPS (não ligado no MVP) e pelo XML do INPI na fase nacional',
  })
  vincular(bioPCT.ativo_id, P.bioenergia, 'titular', { ordem: 1 })

  const bioJP = criarAtivo({
    especie: 'patente_invencao', jurisdicao: 'JP', numero: '2024-512345', tipoNum: 'nacional_estrangeiro',
    papelNum: 'pedido',
    titulo: 'サトウキビバガスの酵素加水分解プロセス',
    deposito: '2024-09-12', situacao: 'Em exame (fase nacional do PCT)', vigia: false,
    motivoVigia: 'JPO não sondado — fonte: relatório do agente japonês',
  })
  vincular(bioJP.ativo_id, P.bioenergia, 'titular', { ordem: 1 })
  vincular(bioJP.ativo_id, P.agJP, 'agente')

  servico([bioPat.ativo_id, bioPCT.ativo_id], 'Depósito PCT e fases nacionais', 'concluido', '2023-02-01', {
    conclusao: '2024-10-02', materia: ['Patentes'], paises: ['WO', 'JP'], valor: 41800,
    titulo: 'Depósito PCT + fase nacional Japão - Nordeste Bioenergia',
  })
  doc(bioPat.ativo_id, 'peticao', 'Relatório descritivo - hidrólise enzimática.pdf', 1240, true)
  doc(bioPat.ativo_id, 'procuracao', 'Procuração - Nordeste Bioenergia S.A.pdf', 94, true)

  // ═══════════════════════════════════════════════════════════════════════
  // STUDIO KABA — cliente pequeno, 1 ativo (a mediana da carteira real)
  // ═══════════════════════════════════════════════════════════════════════
  const kabaMarca = criarAtivo({
    especie: 'marca', jurisdicao: 'BR', numero: '944301188', papelNum: 'pedido',
    marca: 'STUDIO KABA', apresentacao: 'mista',
    classes: [{ codigo: '42', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Serviços de arquitetura; design de interiores' }],
    deposito: '2025-10-08', situacao: 'Publicado para oposição', codigoSit: 'IPAS009', vigia: true,
  })
  const evKaba = despacho(kabaMarca, 'IPAS009', 'Publicação de pedido de registro para oposição',
    somarDias(hoje, -21), 2901, { pagina: 3320 })
  prazo(kabaMarca, evKaba, 'br.marca.prazo_oposicao', somarDias(hoje, 39), { interno: somarDias(hoje, 29) })
  vincular(kabaMarca.ativo_id, P.kaba, 'titular', { ordem: 1 })
  vincular(kabaMarca.ativo_id, P.kaba, 'cliente')
  servico([kabaMarca.ativo_id], 'Registro de marca', 'em_andamento', '2025-09-30', {
    materia: ['Marcas'], paises: ['BR'], valor: 1980,
    titulo: 'Pedido de Registro de Marca - STUDIO KABA - Classe 42',
  })
  doc(kabaMarca.ativo_id, 'procuracao', 'Procuração - Studio Kaba Arquitetura Ltda.pdf', 87, true)

  // ═══════════════════════════════════════════════════════════════════════
  // PAULO RENNER — pessoa física, modelo de utilidade
  // ═══════════════════════════════════════════════════════════════════════
  const rennerMU = criarAtivo({
    especie: 'modelo_utilidade', jurisdicao: 'BR',
    numero: 'BR 20 2023 006611-4', tipoNum: 'inpi_patente', papelNum: 'registro',
    titulo: 'Disposição aplicada em suporte articulado para instrumentos cirúrgicos',
    ipc: ['A61B 90/50'],
    deposito: '2023-04-03', concessao: '2025-09-16', vigencia: '2038-04-03',
    situacao: 'Carta-patente expedida', codigoSit: '16.1', vigia: true,
  })
  despacho(rennerMU, '16.1', 'Concessão de Patente ou Certificado de Adição', '2025-09-16', 2853, { tipo: 'patentes' })
  prazo(rennerMU, null, 'br.patente.anuidade', somarDias(hoje, 27), { extraordinario: somarDias(hoje, 207) })
  vincular(rennerMU.ativo_id, P.renner, 'titular', { ordem: 1 })
  vincular(rennerMU.ativo_id, P.renner, 'cliente')
  doc(rennerMU.ativo_id, 'certificado', 'Carta-patente MU - BR202023006611-4.pdf', 512, true)

  // ═══════════════════════════════════════════════════════════════════════
  // VIA PARCEIRO — titular ≠ cliente (o caso da APEX IP)
  // ═══════════════════════════════════════════════════════════════════════
  const padariaMarca = criarAtivo({
    especie: 'marca', jurisdicao: 'BR', numero: '939887766',
    marca: 'ESTRELA DO VALE', apresentacao: 'mista',
    classes: [{ codigo: '30', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Pães; bolos; produtos de panificação' }],
    deposito: '2022-12-14', concessao: '2024-11-19', vigencia: '2034-11-19',
    situacao: 'Registro em vigor', codigoSit: 'IPAS158', vigia: true,
  })
  vincular(padariaMarca.ativo_id, P.padaria, 'titular', { ordem: 1, confianca: 'manual', por: 'marcio' })
  vincular(padariaMarca.ativo_id, P.parceiro, 'cliente', { confianca: 'confirmado' })
  vincular(padariaMarca.ativo_id, P.parceiro, 'parceiro', { confianca: 'confirmado' })
  vincular(padariaMarca.ativo_id, P.apex, 'procurador')
  const srvPad = servico([padariaMarca.ativo_id], 'Registro de marca', 'concluido', '2022-11-20', {
    conclusao: '2024-12-02', materia: ['Marcas'], paises: ['BR'], valor: 1750,
    titulo: 'Pedido de Registro de Marca - ESTRELA DO VALE - Classe 30',
  })
  vincular(padariaMarca.ativo_id, P.parceiro, 'contato', { servicoId: srvPad.servico_id, confianca: 'confirmado' })
  doc(padariaMarca.ativo_id, 'certificado', 'Certificado de Registro de Marca - 939887766.pdf', 268, true)
  doc(padariaMarca.ativo_id, 'procuracao', 'Procuração - Padaria Estrela do Vale ME.pdf', 84, true)

  const bertoldiMarca = criarAtivo({
    especie: 'marca', jurisdicao: 'BR', numero: '942551199', papelNum: 'pedido',
    marca: 'BERTOLDI AUTOPEÇAS', apresentacao: 'mista',
    classes: [{ codigo: '35', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Comércio de peças e acessórios para veículos' }],
    deposito: '2025-05-22', situacao: 'Publicado para oposição', codigoSit: 'IPAS009', vigia: true,
  })
  const evBert = despacho(bertoldiMarca, 'IPAS009', 'Publicação de pedido de registro para oposição',
    somarDias(hoje, -5), 2903, { pagina: 6612 })
  prazo(bertoldiMarca, evBert, 'br.marca.prazo_oposicao', somarDias(hoje, 55), { interno: somarDias(hoje, 45) })
  vincular(bertoldiMarca.ativo_id, P.bertoldi, 'titular', { ordem: 1, confianca: 'manual', por: 'marcio' })
  vincular(bertoldiMarca.ativo_id, P.parceiro, 'cliente')
  vincular(bertoldiMarca.ativo_id, P.parceiro, 'parceiro')

  // ativo com titular anônimo — ⛔ não é publicável a ninguém
  const orfao = criarAtivo({
    especie: 'marca', jurisdicao: 'BR', numero: '937665544',
    marca: 'NOVACAMPO', apresentacao: 'nominativa',
    classes: [{ codigo: '31', especificacao_bruta: 'Sementes; produtos agrícolas' }],
    deposito: '2022-06-08', situacao: 'Em exame', vigia: true,
    pendencias: [{ tipo: 'titular_anonimo', detalhe: 'o card do CRM aponta para o agente pagante; o titular real não foi identificado' }],
  })
  vincular(orfao.ativo_id, P.parceiro, 'cliente')

  // ═══════════════════════════════════════════════════════════════════════
  // AMEAÇAS DE COLIDÊNCIA
  // ═══════════════════════════════════════════════════════════════════════
  const ameaca = (o: {
    n: number
    ativo: Ativo
    marca: string
    processo: string
    titular: string
    uf?: string
    classes: { codigo: string; edicao_ncl?: string; especificacao_bruta?: string }[]
    deposito: string
    revista: number
    codigo: string
    pagina: number
    medida: 'oposicao' | 'pan'
    scores: { nominativo: number; fonetico: number; classe: number; especificacao: number; combinado: number }
    tier: 'P0' | 'P1' | 'P2'
    comuns: string
    distintivos: string
    especColidentes: string
    analise: string
    fundamento: string
    aprovado?: { risco: 'alto' | 'medio' | 'baixo'; justificativa: string; por: string; em: string }
    dimensoes?: { dimensao: string; avaliacao: string; fundamento: string }[]
    pendencia?: string
    prazoId?: string
  }) => {
    colidencias.push({
      colidencia_id: id('CD' + String(o.n).padStart(3, '0')),
      caso_id: 'C' + String(o.n).padStart(2, '0'),
      revisao: 1,
      ativo_id: o.ativo.ativo_id,
      terceiro: {
        processo: o.processo, marca: o.marca, titular: o.titular, pais: 'BR', uf: o.uf,
        classes: o.classes, apresentacao: 'nominativa', natureza: 'produto', deposito: o.deposito,
      },
      evento_gatilho: { revista: o.revista, data: somarDias(hoje, -6), codigo: o.codigo, pagina: o.pagina },
      medida: o.medida,
      scores: o.scores,
      tier: o.tier,
      risk_level: o.aprovado?.risco,
      confidence: o.aprovado ? 'alta' : undefined,
      analysis_status: o.aprovado ? 'complete' : 'incomplete',
      actionability: 'open',
      recommend_send_to_client: !!o.aprovado,
      triagem: {
        elementos_comuns: o.comuns,
        elementos_distintivos: o.distintivos,
        especificacoes_colidentes: o.especColidentes,
        analise: o.analise,
        fundamento: o.fundamento,
        pendencia: o.pendencia,
      },
      // ⚠️ nasce vazio e só se preenche depois do portão: dimensão é leitura de pessoa.
      dimensoes: o.aprovado ? o.dimensoes : undefined,
      parecer: o.aprovado
        ? {
            por: o.aprovado.por, em: o.aprovado.em, risco: o.aprovado.risco,
            decisao: 'enviar', justificativa: o.aprovado.justificativa,
            hash_conteudo: 'h' + o.n,
          }
        : undefined,
      approval_status: o.aprovado ? 'approved' : 'pending',
      prazo_id: o.prazoId,
      relatorio: o.aprovado ? { documento_id: id('DK004'), id_documento: `APEX-RPI${o.revista}-${o.ativo.identificadores[0]?.valor_normalizado}-${o.processo}-PT` } : undefined,
      fonte: o.aprovado ? 'decisao_humana' : 'rpi_xml',
      criado_em: agora,
    })
  }

  // aprovada — o cliente VÊ
  const prazoOposTerra = id('PZ' + String(seqPrazo + 1).padStart(3, '0'))
  prazo(terraMarca, evTerraConc, 'br.marca.prazo_oposicao', somarDias(hoje, 54), { interno: somarDias(hoje, 44) })
  ameaca({
    n: 1, ativo: terraMarca, marca: 'TERRA FÉ CAFÉ', processo: '946110022',
    titular: 'Cafeeira Vale Verde Ltda', uf: 'MG',
    classes: [{ codigo: '30', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Café; café solúvel; bebidas à base de café' }],
    deposito: '2026-05-19', revista: 2904, codigo: 'IPAS009', pagina: 7731, medida: 'oposicao',
    scores: { nominativo: 96.30, fonetico: 100.00, classe: 100.00, especificacao: 78.40, combinado: 94.12 },
    tier: 'P0',
    comuns: 'núcleo TERRA FÉ integralmente reproduzido; mesma classe 30; produtos idênticos (café)',
    distintivos: 'acréscimo do termo descritivo CAFÉ, que não afasta a colidência',
    especColidentes: 'café; café torrado e moído × café; café solúvel; bebidas à base de café',
    analise: 'Reprodução integral do conjunto distintivo com acréscimo de elemento descritivo. Mesma classe e identidade de produto.',
    fundamento: 'art. 124, XIX, LPI; Manual de Marcas 5.11.3 (reprodução com acréscimo)',
    aprovado: { risco: 'alto', por: 'marcio', em: somarDias(hoje, -4), justificativa: 'Reprodução integral do núcleo com acréscimo descritivo, em classe e produto idênticos. Anterioridade favorável: 2021 contra 2026.' },
    dimensoes: [
      { dimensao: 'Sinal', avaliacao: 'Reprodução integral', fundamento: 'O conjunto TERRA FÉ aparece inteiro, sem alteração.' },
      { dimensao: 'Som', avaliacao: 'Identica na leitura', fundamento: 'A pronúncia do núcleo não se distingue; o acréscimo é lido como descrição.' },
      { dimensao: 'Classe', avaliacao: 'A mesma — 30', fundamento: 'Ambos em NCL(12) classe 30.' },
      { dimensao: 'Produto', avaliacao: 'Café contra café', fundamento: 'A especificação do terceiro cobre o mesmo produto do seu registro.' },
      { dimensao: 'Anterioridade', avaliacao: 'Favorável a você', fundamento: 'Seu depósito é de 2021; o do terceiro, de 2026.' },
    ],
    prazoId: prazoOposTerra,
  })

  /*
   * Prazos com folgas diferentes de propósito, para a tela mostrar as três faixas de cor:
   * Terrafé 54 dias (folga, texto branco) · Vitrana 8 dias (urgente, vermelho) ·
   * Hidrovale 22 dias (atenção, âmbar). São datas fictícias, calculadas a partir de hoje.
   */
  const prazoOposVit = id('PZ' + String(seqPrazo + 1).padStart(3, '0'))
  prazo(vitMarca, evVitConc, 'br.marca.prazo_oposicao', somarDias(hoje, 8), { interno: somarDias(hoje, 2) })

  // aprovada, risco médio — prazo APERTADO, para ver o vermelho
  ameaca({
    n: 2, ativo: vitMarca, marca: 'VITRANNA', processo: '946223311',
    titular: 'Belle Nature Indústria de Cosméticos Ltda', uf: 'SP',
    classes: [{ codigo: '03', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Perfumaria; óleos essenciais; cosméticos capilares' }],
    deposito: '2026-04-02', revista: 2904, codigo: 'IPAS009', pagina: 6108, medida: 'oposicao',
    scores: { nominativo: 92.31, fonetico: 95.00, classe: 100.00, especificacao: 54.70, combinado: 87.66 },
    tier: 'P0',
    comuns: 'sequência VITRAN quase integral; mesma classe 03',
    distintivos: 'duplo N e terminação -A; apresentação nominativa em ambos',
    especColidentes: 'cosméticos; cremes para a pele × cosméticos capilares; perfumaria',
    analise: 'Proximidade nominativa e fonética elevadas. A afinidade de especificação é parcial: perfumaria e cosmético capilar não se sobrepõem integralmente aos cremes de pele.',
    fundamento: 'art. 124, XIX, LPI',
    aprovado: { risco: 'medio', por: 'marcio', em: somarDias(hoje, -3), justificativa: 'Sinais muito próximos, mas a especificação só se cruza parcialmente. Recomenda-se acompanhar e decidir com o titular.' },
    prazoId: prazoOposVit,
    dimensoes: [
      { dimensao: 'Sinal', avaliacao: 'Muito próximo', fundamento: 'A sequência VITRAN se repete; muda a terminação.' },
      { dimensao: 'Som', avaliacao: 'Quase indistinguível', fundamento: 'O duplo N não muda a pronúncia corrente.' },
      { dimensao: 'Classe', avaliacao: 'A mesma — 03', fundamento: 'Ambos em NCL(12) classe 03.' },
      { dimensao: 'Produto', avaliacao: 'Cruza em parte', fundamento: 'Perfumaria e capilar não cobrem os cremes de pele do seu registro.' },
    ],
  })

  // aprovada — prazo em ATENÇÃO, para ver o âmbar
  const prazoOposHidro = id('PZ' + String(seqPrazo + 1).padStart(3, '0'))
  prazo(hidroMarcaBR, evHidroConc, 'br.marca.prazo_oposicao', somarDias(hoje, 22), { interno: somarDias(hoje, 12) })
  ameaca({
    n: 3, ativo: hidroMarcaBR, marca: 'HIDROVALLE', processo: '946331100',
    titular: 'Hidrovalle Equipamentos Industriais Ltda', uf: 'SP',
    classes: [{ codigo: '07', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Bombas centrífugas; válvulas de retenção' }],
    deposito: '2026-06-02', revista: 2904, codigo: 'IPAS009', pagina: 7104, medida: 'oposicao',
    scores: { nominativo: 94.44, fonetico: 100.00, classe: 100.00, especificacao: 71.30, combinado: 92.06 },
    tier: 'P0',
    comuns: 'núcleo HIDROVAL; classe 07; bombas e válvulas',
    distintivos: 'duplo L e terminação -E',
    especColidentes: 'bombas hidráulicas × bombas centrífugas; válvulas',
    analise: 'Reprodução com acréscimo mínimo; mesma classe e afinidade direta de produto.',
    fundamento: 'art. 124, XIX, LPI',
    aprovado: { risco: 'alto', por: 'marcio', em: somarDias(hoje, -2), justificativa: 'Reprodução do núcleo com acréscimo mínimo, mesma classe e afinidade direta de produto. Anterioridade favorável: 2022 contra 2026.' },
    dimensoes: [
      { dimensao: 'Sinal', avaliacao: 'Quase reprodução', fundamento: 'O núcleo HIDROVAL aparece inteiro; muda só a terminação.' },
      { dimensao: 'Som', avaliacao: 'Idêntica na fala', fundamento: 'O duplo L não altera a pronúncia corrente.' },
      { dimensao: 'Classe', avaliacao: 'A mesma — 07', fundamento: 'Ambos em NCL(12) classe 07.' },
      { dimensao: 'Produto', avaliacao: 'Bombas contra bombas', fundamento: 'A especificação do terceiro cobre o mesmo produto do seu registro.' },
      { dimensao: 'Anterioridade', avaliacao: 'Favorável a você', fundamento: 'Seu depósito é de 2022; o do terceiro, de 2026.' },
    ],
    prazoId: prazoOposHidro,
  })

  // pendente, tier baixo — o caso Verin × Vaerin: score alto, especificação zero
  ameaca({
    n: 4, ativo: kabaMarca, marca: 'KABBA', processo: '946447722',
    titular: 'Kabba Tecnologia Ltda', uf: 'SP',
    classes: [{ codigo: '09', edicao_ncl: 'Ncl(12)', especificacao_bruta: 'Aplicativos de computador para gestão financeira' }],
    deposito: '2026-05-30', revista: 2904, codigo: 'IPAS009', pagina: 4402, medida: 'oposicao',
    scores: { nominativo: 90.91, fonetico: 100.00, classe: 88.00, especificacao: 0.00, combinado: 76.60 },
    tier: 'P2',
    comuns: 'núcleo KAB; fonética praticamente idêntica',
    distintivos: 'duplo B; classes 42 (arquitetura) × 09 (software)',
    especColidentes: 'nenhuma sobreposição encontrada entre serviços de arquitetura e aplicativos de gestão financeira',
    analise: 'Semelhança do sinal é alta, mas a afinidade 42/09 foi apenas heurística de classe. As especificações e os mercados documentados não se cruzam.',
    fundamento: 'a especificação tem veto sobre o score combinado',
    pendencia: 'confirmar se há intenção de expansão do titular para software',
  })

  // ═══════════════════════════════════════════════════════════════════════
  const nota: Evento = {
    evento_id: 'ev_NTAKNTERNA00',
    ativo_id: padariaMarca.ativo_id,
    tipo: 'nota_interna',
    titulo: 'Confirmar com o parceiro quem responde pelo cliente final antes de liberar o acesso',
    ocorrido_em: hoje,
    observacoes: [{ fonte: 'decisao_humana', observado_em: agora, autor: 'gui' }],
    visivel_ao_cliente: false,
  }
  eventos.push(nota)

  return {
    contrato_versao: '0.1',
    gerado_em: agora,
    gerado_por: { modo: 'upload_manual', autor: 'dados de demonstração (fictícios)', ferramenta: 'ipaw-front@0.1.0' },
    cobertura: {
      revistas: [
        { tipo: 'marcas', numero: 2904, data: '2026-09-01', fonte_formato: 'xml' },
        { tipo: 'patentes', numero: 2904, data: '2026-09-01', fonte_formato: 'xml' },
        { tipo: 'marcas', numero: 2903, data: '2026-08-25', fonte_formato: 'xml' },
      ],
    },
    completude: {
      pessoas: { completo: true, n: pessoas.length },
      ativos: { completo: true, n: ativos.length },
      vinculos: { completo: true, n: vinculos.length },
      eventos: { completo: false, motivo: 'revistas anteriores à 2895 não foram varridas', n: eventos.length },
      prazos: { completo: false, motivo: 'anuidade e prorrogação com régua estimada até confirmação da casa', n: prazos.length },
      documentos: { completo: true, n: documentos.length },
      servicos: { completo: false, motivo: '42,98% dos cards do CRM não têm número de processo — o histórico nasce parcial', n: servicos.length },
      colidencias: { completo: true, n: colidencias.length },
    },
    lacunas: [
      { onde: 'ativos (12 jurisdições)', motivo: 'só Brasil tem feed automatizado hoje; EUIPO e USPTO têm API oficial não ligada; Madri e China não têm caminho legítimo de automação' },
      { onde: 'ativos[desenho_industrial]', motivo: 'a RPI publica desenho industrial só em PDF — não há arquivo estruturado' },
    ],
    pessoas, ativos, vinculos, eventos, prazos, documentos, servicos, colidencias,
  }
}
