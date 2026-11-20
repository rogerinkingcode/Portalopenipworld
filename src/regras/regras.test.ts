/**
 * Testes de regressão — as cicatrizes medidas da casa, escritas ANTES da tela.
 *
 * Rodar: `npm test`
 *
 * Cada teste aqui existe porque o erro correspondente JÁ ACONTECEU e está medido em
 * `docs/MEDICOES-2026-09.md`. Não são exemplos: são defeitos com data.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { chaveTitular, eventoId, mesmoTitular, normalizarMarca, novoId } from './identidade.ts'
import { ehMultiAtivo, extrairNumeros, extrairNumerosNaJurisdicao, normalizarProcesso } from './processo.ts'
import {
  calcularPrazo,
  diasRestantes,
  ehDiaUtil,
  estadoPrazo,
  proximoDiaUtil,
  somarDias,
} from './calendario.ts'
import { CATALOGO, reguaPorDespacho, JANELAS } from './reguas.ts'

// ═══════════════════════════════════════════════════════════════════════════
// 1. Extrator de número — o dígito verificador não se perde
// ═══════════════════════════════════════════════════════════════════════════

test('preserva o dígito verificador da patente BR', () => {
  // Medido: 11 de 56 títulos vivos trazem o hífen. Um \d{9,} devolveria '102022013321'
  // e o casamento com o XML da RPI falharia em SILÊNCIO — o ativo "não teve despacho".
  const casos: Array<[string, string]> = [
    ['BR 10 2022 000101-0', 'BR102022000101-0'],
    ['BR102021000102-0', 'BR102021000102-0'],
    ['BR 11 2024 000103-0', 'BR112024000103-0'],
    ['BR302025000104-0', 'BR302025000104-0'],
  ]
  for (const [entrada, esperado] of casos) {
    const achados = extrairNumeros(entrada)
    assert.equal(achados.length, 1, `esperava 1 número em "${entrada}"`)
    assert.equal(achados[0].normalizado, esperado)
    assert.ok(achados[0].normalizado.includes('-'), 'o DV tem de sobreviver')
  }
})

test('reconhece as gramáticas medidas no mesmo campo', () => {
  assert.equal(extrairNumeros('912000101')[0].tipo, 'inpi_marca')
  assert.equal(extrairNumeros('PCT/CN2022/000101')[0].normalizado, 'PCT/CN2022/000101')
  assert.equal(extrairNumeros('EP3000101')[0].jurisdicao, 'EP')
  assert.equal(extrairNumeros('29/000,101')[0].tipo, 'uspto_serial')
  assert.equal(extrairNumeros('ND00101')[0].tipo, 'nd_interno')
})

test('identificador ND nunca vira número INPI (regra 2 do LEIA-ME)', () => {
  const achados = extrairNumeros('ND00101')
  assert.equal(achados[0].tipo, 'nd_interno')
  assert.notEqual(achados[0].tipo, 'inpi_marca')
})

test('título com DOIS ativos devolve os dois — serviço ↔ ativo é N:N', () => {
  // Medido: 286 títulos carregam mais de um número.
  const t = 'Reclamação em 2ª instância - 943000105 e 943000106'
  const achados = extrairNumeros(t)
  assert.equal(achados.length, 2)
  assert.ok(ehMultiAtivo(t))
})

test('código de GRU e número de RPI no título não viram processo', () => {
  // Medido: os códigos de GRU têm 3-4 dígitos e não colidem com o padrão de 9.
  // 'RPI 2904' colidiria se lido solto — daí o corte por contexto.
  const t = 'Deferimento de Registro de Marca - 372 - Vitrana - 926000102'
  const achados = extrairNumeros(t)
  assert.equal(achados.length, 1)
  assert.equal(achados[0].normalizado, '926000102')

  const comRpi = extrairNumeros('RPI 2891 - I024 - INDEFERIMENTO - 936000103')
  assert.equal(comRpi.length, 1)
  assert.equal(comRpi[0].normalizado, '936000103')
})

test('o número do BR não é extraído duas vezes como 9 dígitos', () => {
  const achados = extrairNumeros('Pagamento da 11ª Anuidade - (GRU 226) BR 112017000105-0')
  assert.equal(achados.length, 1)
  assert.equal(achados[0].normalizado, 'BR112017000105-0')
})

test('EUIPO: o zero à esquerda faz parte do número', () => {
  // Defeito medido no smoke de 06/09: a planilha lida como NÚMERO transformou `018999999` em
  // `18999999` e a linha foi recusada como formato irreconhecível. O dado se perdia antes de o
  // extrator ver. Conserto: o importador lê a planilha como TEXTO (raw:false).
  const achados = extrairNumerosNaJurisdicao('018999999', 'EM')
  assert.equal(achados.length, 1)
  assert.equal(achados[0].normalizado, '018999999', 'o zero à esquerda sobrevive')
  assert.equal(achados[0].tipo, 'euipo')
  assert.equal(achados[0].jurisdicao, 'EM')
})

test('a jurisdição RECLASSIFICA: 9 dígitos na União Europeia não é marca do INPI', () => {
  // Sem isso, o ativo do EUIPO entra como brasileiro e nunca casa com a RPI — em silêncio.
  assert.equal(extrairNumeros('018999999')[0].tipo, 'inpi_marca', 'sem contexto, o genérico assume BR')
  assert.equal(extrairNumerosNaJurisdicao('018999999', 'BR')[0].tipo, 'inpi_marca')
  assert.equal(extrairNumerosNaJurisdicao('018999999', 'WO')[0].tipo, 'madri', 'Madri é outro registro')
})

test('EUIPO com 8 dígitos só é reconhecido com a jurisdição declarada', () => {
  // Solto, 8 dígitos são ambíguos demais.
  assert.equal(extrairNumeros('01899999').length, 0)
  assert.equal(extrairNumerosNaJurisdicao('01899999', 'BR').length, 0)
  const em = extrairNumerosNaJurisdicao('01899999', 'EM')
  assert.equal(em.length, 1)
  assert.equal(em[0].normalizado, '01899999', 'o zero à esquerda sobrevive')
})

test('a jurisdição não atrapalha o que já é reconhecível', () => {
  const br = extrairNumerosNaJurisdicao('BR 10 2022 000101-0', 'EM')
  assert.equal(br[0].normalizado, 'BR102022000101-0', 'o BR ganha do fallback do EUIPO')
})

test('normalizarProcesso devolve null quando não há número', () => {
  assert.equal(normalizarProcesso('Depósito e Redação de Patente – Futebot'), null)
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. Normalização de marca — o caso c.r.i.a.r.
// ═══════════════════════════════════════════════════════════════════════════

test('c.r.i.a.r. coalesce em CRIAR (defeito medido na RPI 2899)', () => {
  // O agente leu as letras como isoladas, apagou o núcleo CRIAR e derrubou um caso de risco
  // ALTO abaixo do limiar. Um falso negativo de normalização custa uma oposição perdida.
  assert.equal(normalizarMarca('c.r.i.a.r.'), 'CRIAR')
  assert.equal(normalizarMarca('C-R-I-A-R'), 'CRIAR')
  assert.equal(normalizarMarca('c/r/i/a/r'), 'CRIAR')
  assert.ok(normalizarMarca('c.r.i.a.r. exemplomarca').startsWith('CRIAR'))
})

test('A B e A E B NÃO são unidos indiscriminadamente', () => {
  // O contrário do defeito acima também é defeito: só 4+ letras isoladas viram variante.
  assert.equal(normalizarMarca('A B'), 'A B')
  assert.equal(normalizarMarca('A E B'), 'A E B')
  assert.equal(normalizarMarca('A B C'), 'A B C')
})

test('normalização preserva o conteúdo, não a pontuação', () => {
  assert.equal(normalizarMarca('Café & Cia'), 'CAFE E CIA')
  assert.equal(normalizarMarca('HIDROVALE'), 'HIDROVALE')
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. Mesmidade de titular — o defeito APEX × EIXO
// ═══════════════════════════════════════════════════════════════════════════

test('APEX e EIXO PROPRIEDADE INTELECTUAL não são o mesmo titular', () => {
  // `ownerDeduplicationDefect`, RPI 2903: o dedupe por similaridade textual fundiu os dois e
  // excluiu 4 pares de CONCORRENTES como se fossem o mesmo titular.
  const apex = { nome: 'APEX PROPRIEDADE INTELECTUAL LTDA' }
  const eixo = { nome: 'EIXO PROPRIEDADE INTELECTUAL LTDA' }
  assert.equal(mesmoTitular(apex, eixo), false)
  assert.notEqual(chaveTitular(apex.nome), chaveTitular(eixo.nome))
})

test('sufixo societário não decide identidade', () => {
  assert.ok(mesmoTitular({ nome: 'HIDROVALE BOMBAS LTDA' }, { nome: 'Hidrovale Bombas' }))
})

test('documento ganha do nome', () => {
  // ⚠️ Nomes e documento INVENTADOS, e o CNPJ falha no dígito verificador de propósito:
  //    o que o teste prova é 'mesmo documento, grafias diferentes', não um cadastro real.
  const a = { nome: 'VITRANA COSMETICOS', documento: '89.012.345/0001-67' }
  const b = { nome: 'Vitrana Cosmeticos e Perfumaria', documento: '89012345000167' }
  assert.ok(mesmoTitular(a, b), 'mesmo CNPJ, grafias diferentes')

  const c = { nome: 'VITRANA COSMETICOS', documento: '11.111.111/0001-11' }
  assert.equal(mesmoTitular(a, c), false, 'mesmo nome, documentos diferentes')
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. evento_id — hash do conteúdo, nunca da posição
// ═══════════════════════════════════════════════════════════════════════════

const DESPACHO = {
  jurisdicao: 'BR',
  identificador: '934567890',
  codigo: 'IPAS158',
  ocorrido_em: '2024-05-14',
  publicacao_tipo: 'marcas',
  revista: 2784,
}

test('manual e varredura do MESMO despacho produzem o MESMO evento_id', () => {
  // É o que faz a segunda fonte virar uma OBSERVAÇÃO, não um evento duplicado.
  assert.equal(eventoId(DESPACHO), eventoId({ ...DESPACHO }))
})

test('evento_id não depende da posição no arquivo', () => {
  // Se dependesse, republicação corrigida da revista transformaria o #2 em órfão permanente.
  const chave = { ...DESPACHO }
  const a = eventoId(chave)
  const b = eventoId(chave) // mesma chave, "outra passada" — sem ordinal na fórmula
  assert.equal(a, b)
})

test('mudar qualquer parte do fato muda o evento_id', () => {
  const base = eventoId(DESPACHO)
  assert.notEqual(base, eventoId({ ...DESPACHO, codigo: 'IPAS009' }))
  assert.notEqual(base, eventoId({ ...DESPACHO, ocorrido_em: '2024-05-21' }))
  assert.notEqual(base, eventoId({ ...DESPACHO, identificador: '934567891' }))
  assert.notEqual(base, eventoId({ ...DESPACHO, revista: 2785 }))
})

test('evento_id tem prefixo e formato estáveis', () => {
  assert.match(eventoId(DESPACHO), /^ev_[0-9A-HJKMNP-TV-Z]{13}$/)
})

test('ativo_id é ULID válido e único', () => {
  const a = novoId()
  const b = novoId()
  assert.match(a, /^[0-9A-HJKMNP-TV-Z]{26}$/)
  assert.notEqual(a, b)
})

// ═══════════════════════════════════════════════════════════════════════════
// 5. Calendário e prazo — errar aqui é perder direito do cliente
// ═══════════════════════════════════════════════════════════════════════════

test('feriados nacionais e móveis são dias não úteis', () => {
  assert.equal(ehDiaUtil('2026-01-01'), false, 'Confraternização')
  assert.equal(ehDiaUtil('2026-04-21'), false, 'Tiradentes')
  assert.equal(ehDiaUtil('2026-04-03'), false, 'Sexta-feira Santa (Páscoa 05/04/2026)')
  assert.equal(ehDiaUtil('2026-02-16'), false, 'Carnaval segunda')
  assert.equal(ehDiaUtil('2026-02-17'), false, 'Carnaval terça')
  assert.equal(ehDiaUtil('2026-06-04'), false, 'Corpus Christi')
  assert.equal(ehDiaUtil('2026-11-20'), false, 'Consciência Negra')
})

test('sábado e domingo não são dias úteis', () => {
  assert.equal(ehDiaUtil('2026-09-05'), false, 'sábado')
  assert.equal(ehDiaUtil('2026-09-06'), false, 'domingo')
  assert.equal(ehDiaUtil('2026-09-08'), true, 'terça')
})

test('a régua ordinária começa no primeiro dia útil após a publicação', () => {
  // Regra da skill §9.1 — é o que explica os 62 dias praticados onde a lei diz 60.
  const regua = CATALOGO['br.marca.prazo_oposicao']
  const r = calcularPrazo('2026-09-01', regua) // terça
  assert.equal(r.primeiro_dia_contado, '2026-09-02', 'quarta, primeiro dia útil seguinte')
})

test('publicação numa sexta empurra o início para a segunda', () => {
  const regua = CATALOGO['br.marca.prazo_oposicao']
  const r = calcularPrazo('2026-09-04', regua) // sexta
  assert.equal(r.primeiro_dia_contado, '2026-09-08', 'segunda 07/09 é feriado → terça 08/09')
})

test('vencimento em dia não útil prorroga para o próximo dia útil', () => {
  const regua = CATALOGO['br.marca.prazo_oposicao']
  const r = calcularPrazo('2026-08-18', regua)
  assert.ok(ehDiaUtil(r.vence_em), 'a data publicada tem de cair em dia útil')
  if (r.ajustado) assert.notEqual(r.vence_em, r.vence_nominal)
})

test('a convenção de contagem muda a data — e por isso ela vai no contrato', () => {
  // 2026-09-01 + 90: dá 30/11 numa convenção e 01/12 na outra. Um dia numa exigência do
  // art. 36 é o pedido arquivado — por isso `dies_a_quo` é campo, não suposição.
  const base = { ...CATALOGO['br.patente.exigencia_tecnica'] }
  const inclusiva = calcularPrazo('2026-09-01', { ...base, dies_a_quo: 'incluido' })
  const exclusiva = calcularPrazo('2026-09-01', { ...base, dies_a_quo: 'excluido' })
  assert.notEqual(inclusiva.vence_nominal, exclusiva.vence_nominal)
  assert.equal(inclusiva.vence_nominal, '2026-11-29')
  assert.equal(exclusiva.vence_nominal, '2026-11-30')
})

test('prazo de PAN é 180 dias e conta da concessão', () => {
  const regua = CATALOGO['br.marca.pan']
  assert.equal(regua.dias, 180)
  assert.match(regua.fundamento, /CONCESSÃO/)
  assert.ok(regua.gatilhos.includes('IPAS770'), 'designação de Madri também abre PAN')
})

test('deferimento NÃO dispara PAN', () => {
  // A skill é explícita: "Deferimento sem concessão → não iniciar automaticamente prazo de PAN".
  const rDeferimento = reguaPorDespacho('I136')
  assert.equal(rDeferimento, null, 'sem régua mapeada = sem prazo inventado')
})

test('despacho sem régua conhecida devolve null, não um prazo inventado', () => {
  assert.equal(reguaPorDespacho('9.9.9'), null)
  assert.equal(reguaPorDespacho(''), null)
})

test('anuidade e prorrogação seguem a LEI — decisão do Gui em 07/09/2026', () => {
  /*
   * Este teste dizia o contrário até 07/09/2026: que as duas nasciam `estimado` porque a casa
   * não tinha régua escrita. O Gui decidiu: *"Anuidade e prorrogação devem seguir os prazos
   * reais conforme a lei."* Então elas passam a ser `legal` — e o teste passa a travar o
   * dispositivo, não a ausência dele.
   */
  const an = CATALOGO['br.patente.anuidade']
  const pr = CATALOGO['br.marca.prorrogacao']

  assert.equal(an.firmeza_padrao, 'legal')
  assert.equal(pr.firmeza_padrao, 'legal')
  assert.doesNotMatch(an.fundamento, /NÃO CONFIRMADA/, 'a régua existe: art. 84 LPI')
  assert.doesNotMatch(pr.fundamento, /NÃO CONFIRMADA/, 'a régua existe: art. 133 LPI')

  // Anuidade: a partir do INÍCIO DO 3º ANO do depósito, anual (art. 84 caput)
  assert.equal(an.ciclo?.base, 'deposito')
  assert.equal(an.ciclo?.primeiro_apos_meses, 24)
  assert.equal(an.ciclo?.periodo_meses, 12)
  assert.equal(an.ciclo?.janela_apos_inicio_dias, 90, 'os 3 primeiros meses de cada período')

  // Prorrogação: 10 anos da CONCESSÃO, pedido no último ano (art. 133 e §1º)
  assert.equal(pr.ciclo?.base, 'concessao')
  assert.equal(pr.ciclo?.periodo_meses, 120)
  assert.equal(pr.ciclo?.janela_abre_antes_dias, 365, 'o último ano de vigência')

  /*
   * ⚠️ A graça de 6 meses é o §2º nas DUAS, não o §1º. O §1º da prorrogação é a janela;
   * confundir os dois faz a tela citar o dispositivo errado num aviso que custa dinheiro.
   */
  assert.match(an.prazo_extraordinario?.fundamento ?? '', /§2º/)
  assert.match(pr.prazo_extraordinario?.fundamento ?? '', /§2º/)
  assert.equal(an.prazo_extraordinario?.taxa_adicional, true)
  assert.equal(pr.prazo_extraordinario?.taxa_adicional, true)
})

test('dias_restantes é função de hoje — nunca gravado', () => {
  assert.equal(diasRestantes('2026-11-30', '2026-09-06'), 85)
  assert.equal(diasRestantes('2026-09-06', '2026-09-06'), 0)
  assert.equal(diasRestantes('2026-09-01', '2026-09-06'), -5)
})

test('estado do prazo respeita as faixas do Papi', () => {
  assert.equal(estadoPrazo('2026-09-01', '2026-09-06'), 'vencido')
  assert.equal(estadoPrazo('2026-09-10', '2026-09-06'), 'critico')
  assert.equal(estadoPrazo('2026-09-30', '2026-09-06'), 'proximo')
  assert.equal(estadoPrazo('2027-01-01', '2026-09-06'), 'no_prazo')
})

test('somarDias atravessa mês e ano sem erro de fuso', () => {
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01')
  assert.equal(somarDias('2026-02-28', 1), '2026-03-01', '2026 não é bissexto')
  assert.equal(somarDias('2024-02-28', 1), '2024-02-29', '2024 é bissexto')
  assert.equal(proximoDiaUtil('2026-09-05'), '2026-09-08', 'sábado → 07/09 feriado → terça')
})

// ═══════════════════════════════════════════════════════════════════════════
// 6. Códigos de despacho → régua
// ═══════════════════════════════════════════════════════════════════════════

test('os códigos de oposição mapeiam para o prazo de 60 dias', () => {
  for (const c of ['I009', 'I421', 'I756', 'I757']) {
    const r = reguaPorDespacho(c)
    assert.ok(r, `${c} deveria ter régua`)
    assert.equal(r!.id, 'br.marca.prazo_oposicao')
    assert.equal(r!.dias, 60)
  }
})

test('os códigos de PAN mapeiam para 180 dias', () => {
  for (const c of ['IPAS158', 'IPAS770', 'IPAS403']) {
    const r = reguaPorDespacho(c)
    assert.ok(r, `${c} deveria ter régua`)
    assert.equal(r!.dias, 180)
  }
})

test('a exigência de patente é 90 dias e a omissão arquiva', () => {
  const r = reguaPorDespacho('6.1')
  assert.ok(r)
  assert.equal(r!.dias, 90)
  assert.equal(CATALOGO['br.marca.exigencia'].consequencia?.includes('ARQUIVAMENTO'), true)
})

test('busca de régua é insensível a caixa e espaço', () => {
  assert.equal(reguaPorDespacho(' ipas770 ')?.id, 'br.marca.pan')
})

// ───────────────────────────────────────────────────────────────────────────
// As medidas que o Gui citou — oposição, nulidade e CADUCIDADE
// ───────────────────────────────────────────────────────────────────────────

test('caducidade existe em DUAS naturezas, e a tela não pode confundi-las', () => {
  /*
   * A caducidade que CORRE contra o cliente é um prazo de defesa de 60 dias (art. 143 §2º):
   * alguém pediu a caducidade da marca dele e o ônus de provar o uso é do titular.
   * A caducidade OFENSIVA é uma JANELA que abre 5 anos após a concessão do registro do
   * terceiro (art. 143) e não vence enquanto o desuso persistir.
   *
   * Tratar as duas com o mesmo relógio produziria contagem regressiva para algo que não
   * expira — e alarme para o que é oportunidade, não ameaça.
   */
  const defesa = CATALOGO['br.marca.caducidade_defesa']
  assert.ok(defesa, 'o prazo de defesa em caducidade precisa existir no catálogo')
  assert.equal(defesa.dias, 60)
  assert.match(defesa.fundamento, /143/)

  const ofensiva = JANELAS['br.marca.caducidade_ofensiva']
  assert.ok(ofensiva, 'a janela ofensiva precisa existir')
  assert.equal(ofensiva.fecha, false, 'janela de caducidade não vence')
  assert.equal(ofensiva.abre_apos_dias, 1826, '5 anos da concessão do terceiro')

  // E as duas não podem morar na mesma estrutura, senão a tela conta os dias de ambas.
  assert.ok(!('dias' in ofensiva), 'janela não tem contagem de dias')
  assert.ok(!('abre_apos_dias' in defesa), 'prazo não é janela')
})

test('a restauração cita o artigo certo — o 161 é de outra coisa', () => {
  // Estava escrito "art. 161 LPI", que trata do certificado de registro. A restauração
  // é o art. 87, e o dies a quo é a NOTIFICAÇÃO, não o termo final.
  const r = CATALOGO['br.patente.restauracao']
  assert.ok(r, 'a régua de restauração precisa existir')
  assert.match(r.fundamento, /art\. 87/)
  assert.ok(!r.fundamento.includes('161'), 'o art. 161 não é o da restauração')
  assert.equal(r.dias, 90)
})

test('a nulidade de patente conta da concessão e não se confunde com a de marca', () => {
  const marca = CATALOGO['br.marca.pan']
  const patente = CATALOGO['br.patente.pan']
  assert.ok(patente, 'a nulidade de patente precisa existir')
  assert.match(patente.fundamento, /art\. 51/)
  assert.match(marca.fundamento, /168/)
  // Coincidem no número de dias, divergem no fundamento e no instituto.
  assert.equal(marca.dias, 180)
  assert.equal(patente.dias, 180)
  assert.notEqual(marca.fundamento, patente.fundamento)
})

test('nenhum código de despacho dispara duas réguas — o gatilho tem de ser único', () => {
  /*
   * O mesmo IPAS158 significa "pague a retribuição" quando o deferimento é SEU e "cabe
   * nulidade" quando é o registro de um TERCEIRO. Quem separa é o lado, que não está no
   * código. Dar gatilho às duas fazia a busca devolver 60 dias onde o caso pede 180.
   */
  const visto = new Map<string, string>()
  for (const [id, r] of Object.entries(CATALOGO)) {
    for (const g of r.gatilhos) {
      const antes = visto.get(g.toUpperCase())
      assert.ok(!antes, `o código ${g} dispara ${antes} E ${id} — a busca fica indeterminada`)
      visto.set(g.toUpperCase(), id)
    }
  }
})

test('toda régua não confirmada avisa na própria tela', () => {
  // Firmeza `estimado` sem aviso no fundamento é uma data que parece lei e não é.
  for (const [id, r] of Object.entries(CATALOGO)) {
    if (r.firmeza_padrao !== 'estimado') continue
    const avisa =
      /NÃO CONFIRMADA/i.test(r.fundamento) || /NÃO CONFIRMADA/i.test(r.observacao ?? '')
    assert.ok(avisa, `${id} é estimada e não avisa disso em lugar nenhum`)
  }
  for (const [id, j] of Object.entries(JANELAS)) {
    if (j.firmeza_padrao !== 'estimado') continue
    assert.match(j.observacao, /NÃO CONFIRMADA/i, `${id} é estimada e não avisa`)
  }
})

/*
 * ── O que o cartão de prazo NÃO pode dizer ────────────────────────────────────
 * Duas frases erradas viviam no cartão do portal e foram para o do gestor quando as duas
 * visões passaram a compartilhar o componente. As duas mentiam sobre dinheiro ou sobre tempo,
 * então ficam travadas aqui, na régua, que é onde o fato mora.
 */

test('régua sem contagem em dias existe — e `dias: 0` não significa "vence hoje"', () => {
  const semContagem = Object.values(CATALOGO).filter((r) => r.dias === 0)
  assert.ok(
    semContagem.length > 0,
    'anuidade e prorrogação decenal saem da data do ciclo do processo, não de um prazo que corre',
  )
  /*
   * ⚠️ Este laço exigia `firmeza: 'estimado'` até 07/09/2026. Mudou com a decisão do Gui: a
   * régua sem contagem pode ser LEI (anuidade e prorrogação são), e o que ela precisa não é
   * um selo de dúvida — é dizer DE ONDE a data sai. Sem `ciclo`, `dias: 0` fica sendo um
   * zero solto, e zero solto ao lado de uma data futura lê-se como "vence hoje".
   */
  for (const r of semContagem) {
    assert.ok(
      r.ciclo,
      `${r.id}: régua sem contagem de dias TEM de declarar o ciclo de onde a data sai`,
    )
    assert.ok(
      r.ciclo!.base === 'deposito' || r.ciclo!.base === 'concessao',
      `${r.id}: o ciclo tem de estar ancorado num fato datado do processo`,
    )
  }
})

test('janela extraordinária carrega o próprio fundamento — não é ajuste de feriado', () => {
  const comExtra = Object.values(CATALOGO).filter((r) => r.prazo_extraordinario)
  assert.ok(comExtra.length > 0)
  for (const r of comExtra) {
    const e = r.prazo_extraordinario!
    assert.ok(
      e.fundamento && e.fundamento.trim().length > 0,
      `${r.id}: sem fundamento próprio, a tela é obrigada a inventar um motivo para a janela`,
    )
    assert.equal(
      typeof e.taxa_adicional,
      'boolean',
      `${r.id}: se cobra retribuição adicional é a diferença entre um mês de graça e uma conta`,
    )
    assert.ok(e.dias > 0, `${r.id}: janela extraordinária de zero dia não é janela`)
  }
})
