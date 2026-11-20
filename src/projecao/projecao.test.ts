/**
 * Testes da projeção — o pacote do cliente não pode vazar.
 *
 * Estes testes usam o mesmo exemplo fictício de `dados-exemplo/portfolio.exemplo.json`, montado
 * aqui em código para o teste não depender de leitura de arquivo.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import type { Pacote } from '../contrato/tipos.ts'
import { auditarProjecao, projetarEauditar, projetarParaCliente } from './cliente.ts'

const AGORA = '2026-09-06T15:00:00-03:00'
const CLIENTE = '01J9EXEMP000000000000PJ001' // Hidrovale
const COTITULAR = '01J9EXEMP000000000000PF002' // Ana Beatriz, pessoa física com CPF
const PARCEIRO = '01J9EXEMP000000000000PA003'
const CLIENTE_DO_PARCEIRO = '01J9EXEMP000000000000CF004'
const AGENTE = '01J9EXEMP000000000000AG005'
const ATIVO_MARCA = '01J9EXEMP000000000000ATV01'
const ATIVO_EXT = '01J9EXEMP000000000000ATV03'
const ATIVO_ANONIMO = '01J9EXEMP000000000000ATV09'

const cheio = { completo: true, n: 1 }

function montar(): Pacote {
  return {
    contrato_versao: '0.1',
    gerado_em: AGORA,
    gerado_por: { modo: 'upload_manual', autor: 'teste' },
    completude: {
      pessoas: cheio, ativos: cheio, vinculos: cheio, eventos: cheio,
      prazos: cheio, documentos: cheio, servicos: cheio, colidencias: cheio,
    },
    lacunas: [],
    pessoas: [
      {
        pessoa_id: CLIENTE, tipo: 'juridica', nome: 'Hidrovale Bombas Ltda',
        nome_normalizado: 'HIDROVALE BOMBAS LTDA',
        documentos: [{ tipo: 'cnpj', valor: '12.345.678/0001-90', pais: 'BR' }],
        pais: 'BR', uf: 'RS',
        contato: { emails: ['juridico@hidrovale.exemplo'], telefones: ['+55 51 90000-0001'], email_compartilhado: false },
        externo: { ploomes_contact_id: 500000001 },
        fonte: 'upload_manual', criado_em: AGORA, atualizado_em: AGORA,
      },
      {
        pessoa_id: COTITULAR, tipo: 'fisica', nome: 'Ana Beatriz Ferraz',
        nome_normalizado: 'ANA BEATRIZ FERRAZ',
        // ⚠️ CPF de terceiro: não pode ir no pacote do cliente logado
        documentos: [{ tipo: 'cpf', valor: '123.456.789-09', pais: 'BR' }],
        pais: 'BR', uf: 'RS', externo: {},
        fonte: 'upload_manual', criado_em: AGORA, atualizado_em: AGORA,
      },
      {
        pessoa_id: PARCEIRO, tipo: 'juridica', nome: 'Marcas do Sul Assessoria Ltda',
        nome_normalizado: 'MARCAS DO SUL ASSESSORIA LTDA',
        documentos: [{ tipo: 'cnpj', valor: '98.765.432/0001-10', pais: 'BR' }],
        pais: 'BR', uf: 'SC', externo: {},
        fonte: 'upload_manual', criado_em: AGORA, atualizado_em: AGORA,
      },
      {
        pessoa_id: CLIENTE_DO_PARCEIRO, tipo: 'juridica', nome: 'Padaria Estrela do Vale ME',
        nome_normalizado: 'PADARIA ESTRELA DO VALE ME', documentos: [], pais: 'BR', uf: 'SC',
        gerido_por: PARCEIRO, externo: {},
        fonte: 'declarado_cliente', criado_em: AGORA, atualizado_em: AGORA,
      },
      {
        pessoa_id: AGENTE, tipo: 'juridica', nome: 'Nordlicht IP Partners',
        nome_normalizado: 'NORDLICHT IP PARTNERS',
        documentos: [{ tipo: 'estrangeiro', valor: 'DE000000000', pais: 'DE' }],
        pais: 'DE', externo: {},
        fonte: 'upload_manual', criado_em: AGORA, atualizado_em: AGORA,
      },
    ],
    ativos: [
      {
        ativo_id: ATIVO_MARCA, especie: 'marca', jurisdicao: 'BR',
        identificadores: [{ tipo: 'inpi_marca', valor_bruto: '934.567.890', valor_normalizado: '934567890', jurisdicao: 'BR', papel: 'registro', fonte: 'inpi_consulta' }],
        // ⚠️ A imagem entra na fixture DE PROPÓSITO: sem ela o teste do hash passaria
        //    trivialmente, e teste que não pode falhar é pior que teste nenhum.
        marca: { nome: 'HIDROVALE', nome_normalizado: 'HIDROVALE', apresentacao: 'mista', natureza: 'produto', classes: [{ codigo: '07', edicao_ncl: 'Ncl(12)' }], imagem: { documento_id: '01J9EXEMP000000000000DOC01', hash: 'e3b0c44298fc1c149afbf4c8996fb924' } },
        datas: { deposito: '2022-08-09', concessao: '2024-05-14', vigencia_ate: '2034-05-14', procedencia: { deposito: { fonte: 'inpi_consulta', observado_em: AGORA } } },
        situacao: { codigo: 'IPAS158', texto: 'Registro em vigor', evento_id: 'ev_ABCDEFGHJKMNP', derivada_em: AGORA, fonte: 'rpi_xml' },
        vigilancia: { ativa: true, elegivel: true, motivos: [], fonte_feed: 'rpi_xml', atualizado_em: '2026-09-01' },
        pendencias: [], fonte: 'inpi_consulta',
        externo: { ploomes_deal_ids: [503000001], base_mestra_linha: 17 },
        criado_em: AGORA, atualizado_em: AGORA,
      },
      {
        ativo_id: ATIVO_EXT, especie: 'marca', jurisdicao: 'EM',
        identificadores: [{ tipo: 'euipo', valor_bruto: '018 999 999', valor_normalizado: '018999999', jurisdicao: 'EM', papel: 'registro', fonte: 'certificado_agente' }],
        marca: { nome: 'HIDROVALE', nome_normalizado: 'HIDROVALE', classes: [{ codigo: '07' }] },
        datas: { procedencia: {} },
        situacao: { texto: 'Registered', derivada_em: AGORA, fonte: 'certificado_agente' },
        vigilancia: { ativa: false, elegivel: false, motivos: ['EUIPO nao ligado no MVP'], motivo: 'fonte atual e o certificado do agente', atualizado_em: '2026-09-06' },
        pendencias: [], fonte: 'certificado_agente', externo: {},
        criado_em: AGORA, atualizado_em: AGORA,
      },
      {
        ativo_id: ATIVO_ANONIMO, especie: 'marca', jurisdicao: 'BR',
        identificadores: [{ tipo: 'inpi_marca', valor_bruto: '999999999', valor_normalizado: '999999999', jurisdicao: 'BR', papel: 'pedido', fonte: 'inpi_consulta' }],
        marca: { nome: 'SEM DONO', nome_normalizado: 'SEM DONO', classes: [{ codigo: '35' }] },
        datas: { procedencia: {} },
        situacao: { texto: 'Em exame', derivada_em: AGORA, fonte: 'inpi_consulta' },
        vigilancia: { ativa: true, elegivel: true, motivos: [] },
        pendencias: [{ tipo: 'titular_anonimo', detalhe: 'titular nao identificado no CRM' }],
        fonte: 'inpi_consulta', externo: {}, criado_em: AGORA, atualizado_em: AGORA,
      },
    ],
    vinculos: [
      { vinculo_id: '01J9EXEMP000000000000VNC01', ativo_id: ATIVO_MARCA, pessoa_id: CLIENTE, papel: 'titular', ordem: 1, fonte: 'inpi_consulta', publicavel: true },
      { vinculo_id: '01J9EXEMP000000000000VNC04', ativo_id: ATIVO_MARCA, pessoa_id: COTITULAR, papel: 'cotitular', ordem: 2, fonte: 'inpi_consulta', decidido_por: 'gui', publicavel: true },
      { vinculo_id: '01J9EXEMP000000000000VNC05', ativo_id: ATIVO_EXT, pessoa_id: CLIENTE, papel: 'titular', ordem: 1, fonte: 'certificado_agente', publicavel: true },
      { vinculo_id: '01J9EXEMP000000000000VNC06', ativo_id: ATIVO_EXT, pessoa_id: AGENTE, papel: 'agente', fonte: 'ploomes', publicavel: false },
      { vinculo_id: '01J9EXEMP000000000000VNC07', ativo_id: ATIVO_MARCA, pessoa_id: PARCEIRO, papel: 'parceiro', fonte: 'decisao_humana', decidido_por: 'marcio', publicavel: true },
      { vinculo_id: '01J9EXEMP000000000000VNC09', ativo_id: ATIVO_ANONIMO, pessoa_id: CLIENTE, papel: 'cliente', fonte: 'ploomes', publicavel: true },
    ],
    eventos: [
      { evento_id: 'ev_ABCDEFGHJKMNP', ativo_id: ATIVO_MARCA, tipo: 'despacho', codigo: 'IPAS158', titulo: 'Concessão de registro', ocorrido_em: '2024-05-14', publicacao: { tipo: 'marcas', revista: 2784, data: '2024-05-14', pagina: 4120 }, observacoes: [{ fonte: 'rpi_xml', observado_em: AGORA, documento_hash: 'abc' }], visivel_ao_cliente: true },
      { evento_id: 'ev_NTERNA0000', ativo_id: ATIVO_MARCA, tipo: 'nota_interna', titulo: 'Confirmar margem do agente antes de responder', ocorrido_em: '2026-09-06', observacoes: [{ fonte: 'decisao_humana', observado_em: AGORA, autor: 'gui' }], visivel_ao_cliente: false },
      { evento_id: 'ev_CNCJA00000', ativo_id: ATIVO_MARCA, tipo: 'conciliacao', titulo: 'Parceiro vinculado', ocorrido_em: '2026-09-06', observacoes: [], visivel_ao_cliente: true },
    ],
    prazos: [
      { prazo_id: '01J9EXEMP000000000000PRZ01', ativo_id: ATIVO_MARCA, evento_base: 'ev_ABCDEFGHJKMNP', regua: { id: 'br.marca.prorrogacao', nome: 'Prorrogação decenal', fundamento: 'art. 133 LPI — NAO CONFIRMADA', dias: 0, contagem: 'corridos', dies_a_quo: 'primeiro_dia_util_seguinte', ajuste_dia_nao_util: 'proximo_dia_util', calendario: 'br_inpi', firmeza_padrao: 'estimado', gatilhos: ['IPAS158'], observacao: 'NOTA INTERNA DA CASA — nao pode chegar ao cliente' } as never, vence_em: '2034-05-14', prazo_interno_em: '2034-05-04', firmeza: 'estimado', fonte: 'inpi_consulta' },
    ],
    documentos: [
      { documento_id: '01J9EXEMP000000000000DKM01', ativo_id: ATIVO_MARCA, tipo: 'certificado', nome: 'Certificado 934567890.pdf', mime: 'application/pdf', tamanho_bytes: 283000, sha256: 'aaa', origem: { sistema: 'ploomes', ref: 'attachment:501000001' }, publicavel: true, publicavel_por: 'gui', publicavel_em: '2026-09-06', idioma: 'pt', fonte: 'upload_manual', criado_em: AGORA },
      { documento_id: '01J9EXEMP000000000000DKM02', ativo_id: ATIVO_EXT, tipo: 'carta_agente', nome: 'Nordlicht invoice.pdf', mime: 'application/pdf', tamanho_bytes: 120000, sha256: 'bbb', origem: { sistema: 'ploomes', ref: 'https://stgploomescrmprd01.blob.core.windows.net/x/y.pdf' }, publicavel: false, idioma: 'en', fonte: 'upload_manual', criado_em: AGORA },
    ],
    servicos: [
      { servico_id: '01J9EXEMP000000000000SRV01', ativo_ids: [ATIVO_MARCA], origem: { sistema: 'ploomes', deal_id: 503000002, funil_id: 10015007, titulo_bruto: 'Deferimento - 372 - HIDROVALE - 934567890' }, tipo: 'Deferimento', materia: ['Marcas'], paises: ['BR'], estado: 'concluido', datas: { conclusao: '2024-05-20' }, responsavel: 'wivyanne', valor: { moeda: 'BRL', total: 1250, origem: 'order_amount' }, fonte: 'ploomes', observado_em: AGORA },
    ],
    colidencias: [
      {
        colidencia_id: '01J9EXEMP000000000000CDN01', caso_id: 'C01', revisao: 1, ativo_id: ATIVO_MARCA,
        terceiro: { processo: '944999001', marca: 'HIDROVALLE', titular: 'Hidrovalle Equipamentos', pais: 'BR', classes: [{ codigo: '07', edicao_ncl: 'Ncl(12)' }] },
        evento_gatilho: { revista: 2904, data: '2026-09-01', codigo: 'IPAS009', pagina: 7731 },
        medida: 'oposicao',
        scores: { nominativo: 94.44, fonetico: 100, classe: 100, especificacao: 71.3, combinado: 90.12 },
        tier: 'P0',
        risk_level: 'alto', confidence: 'alta', analysis_status: 'complete', actionability: 'open',
        recommend_send_to_client: true,
        triagem: { elementos_comuns: 'nucleo HIDROVAL', fundamento: 'art. 124, XIX' },
        parecer: { por: 'marcio', em: '2026-09-05', risco: 'alto', decisao: 'enviar', justificativa: 'identidade fonetica', hash_conteudo: 'h1' },
        approval_status: 'approved', fonte: 'decisao_humana', criado_em: AGORA,
      },
      {
        colidencia_id: '01J9EXEMP000000000000CDN02', caso_id: 'C02', revisao: 1, ativo_id: ATIVO_MARCA,
        terceiro: { processo: '944999002', marca: 'HIDRO VALE', titular: 'Outro', pais: 'BR', classes: [{ codigo: '35' }] },
        evento_gatilho: { revista: 2904, data: '2026-09-01', codigo: 'IPAS009' },
        medida: 'oposicao', scores: { combinado: 78.8 }, tier: 'P2',
        analysis_status: 'complete', actionability: 'open', recommend_send_to_client: false,
        triagem: {}, approval_status: 'pending', fonte: 'rpi_xml', criado_em: AGORA,
      },
    ],
  } as Pacote
}

// ═══════════════════════════════════════════════════════════════════════════

test('a auditoria ABORTA se qualquer proibido vazar', () => {
  const p = montar()
  const projetado = projetarParaCliente(p, CLIENTE)
  assert.doesNotThrow(() => auditarProjecao(projetado))

  // injeta um vazamento e prova que o guarda-corpo morde
  const contaminado = { ...projetado, lacunas: [{ onde: 'x', motivo: 'blob.core.windows.net/y' }] }
  assert.throws(() => auditarProjecao(contaminado as never), /VAZAMENTO/)
})

test('CPF de co-titular pessoa física NÃO vai no pacote do cliente', () => {
  // O cliente logado é a Hidrovale; a Ana Beatriz é co-titular e pessoa física.
  const p = projetarEauditar(montar(), CLIENTE)
  const s = JSON.stringify(p)
  assert.ok(s.includes('Ana Beatriz Ferraz'), 'o nome dela aparece — ela é co-titular')
  assert.ok(!s.includes('123.456.789-09'), 'o CPF dela NÃO pode aparecer')
  assert.ok(!s.includes('12.345.678/0001-90'), 'nem o CNPJ do proprio cliente logado')
  // `documentos` no pacote do cliente e a lista de ARQUIVOS publicaveis — legitima.
  // O que nao pode existir e documento DE PESSOA: nenhuma pessoa projetada tem essa chave.
  for (const pessoa of p.pessoas) {
    assert.ok(!('documentos' in pessoa), `pessoa ${pessoa.nome} nao pode carregar documentos`)
    assert.ok(!('contato' in pessoa), `pessoa ${pessoa.nome} nao pode carregar contato`)
    assert.ok(!('externo' in pessoa), `pessoa ${pessoa.nome} nao pode carregar chaves de outros sistemas`)
  }
})

test('contato do cliente não vai no pacote dele', () => {
  const s = JSON.stringify(projetarEauditar(montar(), CLIENTE))
  assert.ok(!s.includes('juridico@hidrovale.exemplo'))
  assert.ok(!s.includes('"contato"'))
})

test('o nome do AGENTE correspondente nunca chega ao cliente', () => {
  // Desintermediação: com o nome, o cliente contrata o agente direto.
  const s = JSON.stringify(projetarEauditar(montar(), CLIENTE))
  assert.ok(!s.includes('Nordlicht'), 'o agente não aparece')
  assert.ok(!s.includes('"papel":"agente"'))
})

test('valor de serviço não vai ao cliente', () => {
  // Deal.Amount infla o nacional em R$ 145.153,79 e card de serviço repete o valor do pai.
  const s = JSON.stringify(projetarEauditar(montar(), CLIENTE))
  assert.ok(!s.includes('1250'), 'o valor não aparece')
  assert.ok(!s.includes('wivyanne'), 'o responsável interno não aparece')
  assert.ok(!s.includes('titulo_bruto'))
})

test('nota interna é REMOVIDA, não etiquetada', () => {
  const s = JSON.stringify(projetarEauditar(montar(), CLIENTE))
  assert.ok(!s.includes('Confirmar margem do agente'))
  assert.ok(!s.includes('visivel_ao_cliente'), 'a flag também não vai — o dado simplesmente não está')
})

test('evento de conciliação não vai, mesmo marcado como visível', () => {
  const s = JSON.stringify(projetarEauditar(montar(), CLIENTE))
  assert.ok(!s.includes('Parceiro vinculado'), 'tipo interno é excluído por tipo, não por flag')
})

test('score de colidência nunca sai — só o que passou pelo portão', () => {
  const p = projetarEauditar(montar(), CLIENTE)
  assert.equal(p.colidencias.length, 1, 'só a aprovada')
  assert.equal(p.colidencias[0].caso_id, 'C01')
  const s = JSON.stringify(p)
  assert.ok(!s.includes('90.12'), 'combinado não aparece')
  assert.ok(!s.includes('"tier"'), 'P0/P1/P2 não aparece')
  assert.ok(!s.includes('78.8'), 'a não aprovada não aparece de forma nenhuma')
})

test('colidência sem parecer aprovado não aparece', () => {
  const pacote = montar()
  pacote.colidencias[0].parecer = undefined
  pacote.colidencias[0].approval_status = 'pending'
  const p = projetarEauditar(pacote, CLIENTE)
  assert.equal(p.colidencias.length, 0, 'nada sai sem decisão humana registrada')
})

test('documento não publicável não aparece — nem a URL do blob', () => {
  const p = projetarEauditar(montar(), CLIENTE)
  assert.equal(p.documentos.length, 1)
  assert.equal(p.documentos[0].tipo, 'certificado')
  const s = JSON.stringify(p)
  assert.ok(!s.includes('blob.core.windows.net'), 'a URL do Ploomes nunca vai ao navegador')
  assert.ok(!s.includes('attachment:'), 'nem a referência interna')
})

test('ativo com titular ANÔNIMO não é publicável para ninguém', () => {
  // 61,54% dos serviços nacionais com titular ≠ cliente não sabem quem é o titular.
  const p = projetarEauditar(montar(), CLIENTE)
  const ids = p.ativos.map((a) => a.ativo_id)
  assert.ok(!ids.includes('01J9EXEMP000000000000ATV09'))
})

test('o cliente vê os ativos dele, e só', () => {
  const p = projetarEauditar(montar(), CLIENTE)
  const ids = p.ativos.map((a) => a.ativo_id).sort()
  assert.deepEqual(ids, ['01J9EXEMP000000000000ATV01', '01J9EXEMP000000000000ATV03'])
})

test('o AGENTE não recebe carteira nenhuma — o vínculo dele não é publicável', () => {
  // A cicatriz: 69,6% dos ativos apontam pelo ContactId para um agente. Se o portal chaveasse
  // por contato, um correspondente receberia os 119 ativos de clientes finais dele.
  const p = projetarEauditar(montar(), AGENTE)
  assert.equal(p.ativos.length, 0)
})

test('o PARCEIRO vê o ativo em que tem vínculo publicável', () => {
  const p = projetarEauditar(montar(), PARCEIRO)
  assert.equal(p.ativos.length, 1)
  assert.equal(p.ativos[0].ativo_id, '01J9EXEMP000000000000ATV01')
})

test('cliente final do parceiro sem vínculo próprio não vê nada', () => {
  const p = projetarEauditar(montar(), CLIENTE_DO_PARCEIRO)
  assert.equal(p.ativos.length, 0, 'o vínculo é do parceiro, não dele — cadastro ainda não feito')
})

test('a vigilância VAI ao cliente, com o motivo quando está desligada', () => {
  // A promessa do produto é vigilância. Onde não vigiamos, o cliente tem de saber — senão a
  // marca da União Europeia aparece com o mesmo selo da brasileira.
  const p = projetarEauditar(montar(), CLIENTE)
  const ext = p.ativos.find((a) => a.jurisdicao === 'EM')!
  assert.equal(ext.vigilancia.ativa, false)
  assert.ok(ext.vigilancia.motivo, 'motivo obrigatório quando ativa=false')
  const br = p.ativos.find((a) => a.jurisdicao === 'BR')!
  assert.equal(br.vigilancia.ativa, true)
  assert.equal(br.vigilancia.atualizado_em, '2026-09-01', 'carimbo POR ATIVO, não global')
})

test('a completude e as lacunas vão junto — o pacote declara o que não sabe', () => {
  const p = projetarEauditar(montar(), CLIENTE)
  assert.ok(p.completude, 'completude por lista')
  assert.ok(Array.isArray(p.lacunas))
})

test('o prazo vai com a régua e a firmeza visíveis', () => {
  const p = projetarEauditar(montar(), CLIENTE)
  assert.equal(p.prazos.length, 1)
  assert.equal(p.prazos[0].firmeza, 'estimado')
  assert.match(p.prazos[0].regua.fundamento, /NAO CONFIRMADA/)
  const s = JSON.stringify(p)
  assert.ok(!s.includes('dias_restantes'), 'nunca gravado — é f(vence_em, hoje) na leitura')
})

test('procedência das datas não vaza (é rastro interno)', () => {
  const s = JSON.stringify(projetarEauditar(montar(), CLIENTE))
  assert.ok(!s.includes('procedencia'))
  assert.ok(!s.includes('base_mestra_linha'))
  assert.ok(!s.includes('ploomes_deal_ids'))
})

test('o prazo INTERNO da casa não vai ao cliente', () => {
  // Medido: a antecedência praticada é `legal − 10 dias` e é CONFIGURAÇÃO, não lei. O parecer em
  // PDF a trata como interna, e a lista branca do CONTRATO-DADOS não a inclui. Antes deste teste,
  // `prazos` era o único ramo da projeção com `filter` sem `map` — o objeto inteiro vazava.
  const p = projetarEauditar(montar(), CLIENTE)
  const s = JSON.stringify(p)
  assert.ok(!s.includes('prazo_interno_em'), 'antecedência operacional é interna')
  assert.ok(!s.includes('2034-05-04'), 'nem o valor dela, por outro nome')
  assert.equal((p.prazos[0] as Record<string, unknown>).fonte, undefined, 'procedência não vai junto')
  assert.equal(p.prazos[0].vence_em, '2034-05-14', 'a data legal continua visível')
})

/*
 * ── O ramo que copia o objeto inteiro ────────────────────────────────────────
 * Achado em 07/09/2026 na conferência pré-commit: `marca: a.marca` e
 * `vigilancia: a.vigilancia` copiavam tudo, e com eles saíam o `imagem.hash` (chave interna
 * de deduplicação) e a régua de elegibilidade da casa (`elegivel`, `motivos`, `fonte_feed`).
 *
 * ⚠️ O `CONTRATO-DADOS.md` §11 PROMETIA que o hash saía. Documentação descrevendo proteção
 *    inexistente é pior que não ter proteção nenhuma — quem lê para de conferir.
 *
 * O conserto principal é o `Omit` no tipo, que faz o esquecimento não compilar. Este teste é
 * a rede: ele falha se alguém montar o objeto por fora, onde o tipo não alcança.
 */

test('a marca do cliente não leva o hash interno da imagem', () => {
  const v = projetarParaCliente(montar(), CLIENTE)
  const serializado = JSON.stringify(v)
  assert.equal(serializado.includes('"hash"'), false, 'imagem.hash é chave interna de deduplicação')
  // e a referência do documento FICA: é o que permitiria mostrar a imagem um dia
  for (const a of v.ativos) {
    if (a.marca?.imagem) {
      assert.ok(a.marca.imagem.documento_id, 'a referência do documento continua')
      assert.equal('hash' in a.marca.imagem, false)
    }
  }
})

test('a vigilância responde ao cliente sem entregar a régua interna da casa', () => {
  const v = projetarParaCliente(montar(), CLIENTE)
  for (const a of v.ativos) {
    // o que o cliente PRECISA: está vigiado? se não, por quê?
    assert.equal(typeof a.vigilancia.ativa, 'boolean')
    // ⛔ o que é da casa: a régua 1.540 → 429 e o juízo em vocabulário interno
    assert.equal('elegivel' in a.vigilancia, false, 'elegivel é decisão de negócio')
    assert.equal('motivos' in a.vigilancia, false, 'motivos usa vocabulário interno')
    assert.equal('fonte_feed' in a.vigilancia, false, 'procedência é do dossiê')
  }
})

test('a régua chega ao cliente sem a nota operacional da casa', () => {
  /*
   * TERCEIRA ocorrência do ramo que copia o objeto inteiro. Aqui o `Omit` não bastaria: o tipo
   * do contrato (`zRegua`, 9 campos) já era o certo — quem divergia era o OBJETO do catálogo em
   * memória, que carrega 12. TypeScript não vê campo a mais em tempo de execução.
   *
   * A `observacao` da anuidade diz, literalmente, que tratar anuidade como código único de GRU
   * emite a guia errada. É recado para quem opera; o cliente lendo isso pergunta se a casa
   * emitiu a guia dele errada.
   */
  const v = projetarParaCliente(montar(), CLIENTE)
  const s = JSON.stringify(v)
  for (const campo of ['observacao', 'gatilhos', 'firmeza_padrao']) {
    assert.equal(s.includes(`"${campo}"`), false, `${campo} é interno da régua`)
  }
  // e o que o cartão de prazo USA continua chegando
  for (const p of v.prazos) {
    assert.ok(p.regua.nome && p.regua.fundamento, 'nome e fundamento aparecem no cartão')
    assert.ok(typeof p.regua.dias === 'number' && p.regua.contagem && p.regua.dies_a_quo)
  }
})
