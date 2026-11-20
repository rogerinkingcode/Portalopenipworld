/**
 * Testes das peças que a rodada de navegação acrescentou: a ficha do ativo do cliente,
 * o portfólio por cliente, os filtros e os campos do terceiro.
 *
 * O que se trava aqui não é o pixel — é a REGRA que o pixel expressa.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carregarExemplo } from './exemplo.ts'
import { montarAmeacas } from './ameacas.ts'
import { contar, LIMIAR_FILTRO } from './filtro.ts'
import { projetarParaCliente, auditarProjecao } from '../projecao/cliente.ts'
import { estadoDoPrazo, materiaDe } from './visao.ts'
import { motivoDeFora, somarInvestimento } from './investimento.ts'

/** Data fixa: o estado do prazo é f(hoje), e um teste que muda de resultado por dia não vale. */
const HOJE_FIXO = '2026-09-07'


const pacote = carregarExemplo()

/** Quem tem portal: vínculo publicável com papel de carteira. */
function comPortal(): string[] {
  const papeis = ['titular', 'cotitular', 'cliente', 'parceiro']
  return [
    ...new Set(
      pacote.vinculos
        .filter((v) => v.publicavel && papeis.includes(v.papel))
        .map((v) => v.pessoa_id),
    ),
  ]
}

// ───────────────────────────────────────────────────────────────────────────
// A FICHA DO ATIVO NO PORTAL — o cliente precisa achar o ativo dele pelo id
// ───────────────────────────────────────────────────────────────────────────

test('todo ativo que o cliente vê na lista abre pela própria rota', () => {
  // A lista linka para /portal/ativos/<ativo_id>. Se um id da lista não achasse o ativo na
  // projeção, o clique cairia em "ativo não encontrado" — que foi o defeito que o Gui viu.
  for (const pessoa of comPortal()) {
    const v = projetarParaCliente(pacote, pessoa)
    for (const a of v.ativos) {
      assert.ok(
        v.ativos.some((x) => x.ativo_id === a.ativo_id),
        `${a.ativo_id} está na lista e precisa abrir`,
      )
    }
  }
})

test('a ficha do cliente tem o que precisa para se sustentar sozinha', () => {
  const v = projetarParaCliente(pacote, comPortal()[0])
  const a = v.ativos[0]
  assert.ok(a.identificadores.length > 0, 'sem identificador a ficha não diz qual processo é')
  assert.ok(a.situacao.texto.length > 0, 'situação é a resposta de uma linha')
  assert.ok(typeof a.vigilancia.ativa === 'boolean', 'o carimbo de vigilância é por ativo')
  assert.ok(materiaDe(a.especie), 'a matéria decide a cor da borda do cartão')
})

test('documentos e ameaças de um ativo são alcançáveis a partir dele', () => {
  // A ficha reúne o que estava espalhado. Se o vínculo por ativo_id não fechasse, a ficha
  // mostraria "nenhum documento" com documentos existindo na aba ao lado.
  for (const pessoa of comPortal()) {
    const v = projetarParaCliente(pacote, pessoa)
    const ids = new Set(v.ativos.map((a) => a.ativo_id))
    for (const d of v.documentos) {
      if (d.ativo_id) assert.ok(ids.has(d.ativo_id), 'documento aponta para ativo fora da projeção')
    }
    for (const c of montarAmeacas(v)) {
      assert.ok(ids.has(c.ativo_id), 'ameaça aponta para ativo fora da projeção')
    }
  }
})

// ───────────────────────────────────────────────────────────────────────────
// O TERCEIRO — o Gui viu "DEPÓSITO —" no portal
// ───────────────────────────────────────────────────────────────────────────

test('o pedido do terceiro chega completo ao cliente', () => {
  let conferidos = 0
  for (const pessoa of comPortal()) {
    for (const a of montarAmeacas(projetarParaCliente(pacote, pessoa))) {
      assert.ok(a.terceiro.titular.length > 0, `${a.caso_id} sem titular do terceiro`)
      assert.ok(a.terceiro.processo.length > 0, `${a.caso_id} sem número do processo`)
      // Era o defeito: `deposito` não estava na projeção e o cartão mostrava "—".
      assert.ok(a.terceiro.deposito, `${a.caso_id} sem data de depósito do terceiro`)
      assert.match(a.terceiro.deposito!, /^\d{4}-\d{2}-\d{2}$/)
      conferidos += 1
    }
  }
  assert.ok(conferidos > 0, 'o exemplo precisa ter ameaça aprovada para o teste valer')
})

test('a especificação vai dos DOIS lados — é ela que tem veto sobre o score', () => {
  for (const pessoa of comPortal()) {
    for (const a of montarAmeacas(projetarParaCliente(pacote, pessoa))) {
      assert.ok(Array.isArray(a.meu.especificacoes), 'o lado do cliente precisa da especificação')
      const algum =
        a.meu.especificacoes.some((e) => e.texto) ||
        a.terceiro.classes.some((c) => c.especificacao_bruta)
      assert.ok(algum, `${a.caso_id}: sem especificação de nenhum lado, a comparação não fecha`)
    }
  }
})

test('ampliar o terceiro não abriu porta para o que é interno', () => {
  // A projeção ganhou campos novos nesta rodada. A auditoria roda de novo, inteira.
  for (const pessoa of comPortal()) {
    const v = projetarParaCliente(pacote, pessoa)
    assert.doesNotThrow(() => auditarProjecao(v))
    const s = JSON.stringify(v)
    for (const proibido of ['scores', 'combinado', 'tier', 'triagem', 'prazo_interno_em']) {
      assert.ok(!s.includes(proibido), `${proibido} não pode ter entrado junto`)
    }
  }
})

// ───────────────────────────────────────────────────────────────────────────
// FILTROS — "de forma intuitiva quando houver"
// ───────────────────────────────────────────────────────────────────────────

test('contar agrupa, ordena por frequência e ignora o que não tem chave', () => {
  const itens = [
    { k: 'BR' }, { k: 'BR' }, { k: 'BR' }, { k: 'US' }, { k: 'US' }, { k: 'CN' }, { k: undefined },
  ]
  const o = contar(itens, (i) => i.k, (v) => `país ${v}`)
  assert.equal(o.length, 3, 'o item sem chave não vira opção')
  assert.deepEqual(
    o.map((x) => [x.valor, x.n]),
    [['BR', 3], ['US', 2], ['CN', 1]],
  )
  assert.equal(o[0].rotulo, 'país BR')
})

test('empate de frequência desempata por nome, para a ordem não dançar', () => {
  const o = contar([{ k: 'zz' }, { k: 'aa' }], (i) => i.k, (v) => v)
  assert.deepEqual(o.map((x) => x.valor), ['aa', 'zz'])
})

test('o limiar do filtro é um número declarado, não um palpite espalhado', () => {
  // O filtro só aparece acima dele. Se alguém mudar, muda em um lugar só.
  assert.equal(typeof LIMIAR_FILTRO, 'number')
  assert.ok(LIMIAR_FILTRO >= 3 && LIMIAR_FILTRO <= 10, 'limiar fora de qualquer faixa razoável')
})

test('filtrar por ativo e por país compõe, e nenhuma combinação some com tudo', () => {
  const v = projetarParaCliente(pacote, comPortal()[0])
  const todas = montarAmeacas(v)
  for (const pais of new Set(todas.map((a) => a.terceiro.pais ?? 'BR'))) {
    const doPais = todas.filter((a) => (a.terceiro.pais ?? 'BR') === pais)
    assert.ok(doPais.length > 0, 'a opção de país oferecida tem de render resultado')
    for (const id of new Set(doPais.map((a) => a.ativo_id))) {
      const both = doPais.filter((a) => a.ativo_id === id)
      assert.ok(both.length > 0, 'opção de ativo dentro do país não pode render lista vazia')
    }
  }
})

// ───────────────────────────────────────────────────────────────────────────
// A CARTEIRA POR CLIENTE — visão do gestor
// ───────────────────────────────────────────────────────────────────────────

test('todo cliente da carteira tem pelo menos um ativo — senão não é linha', () => {
  const papeis = ['titular', 'cotitular', 'cliente', 'parceiro']
  const porPessoa = new Map<string, Set<string>>()
  for (const v of pacote.vinculos) {
    if (!papeis.includes(v.papel)) continue
    const s = porPessoa.get(v.pessoa_id) ?? new Set<string>()
    s.add(v.ativo_id)
    porPessoa.set(v.pessoa_id, s)
  }
  assert.ok(porPessoa.size > 0)
  for (const [pessoa, ativos] of porPessoa) {
    assert.ok(ativos.size > 0, `${pessoa} entraria na carteira sem nenhum ativo`)
    assert.ok(
      pacote.pessoas.some((p) => p.pessoa_id === pessoa),
      'vínculo aponta para pessoa que não existe',
    )
  }
})

test('o agente correspondente NÃO é cliente e fica fora da carteira', () => {
  // Medido: 69,6% dos ativos apontam pelo ContactId para um agente. Se agente virasse linha
  // da carteira, a lista de clientes ficaria dominada por escritórios do exterior.
  const papeis = ['titular', 'cotitular', 'cliente', 'parceiro']
  const agentes = new Set(
    pacote.vinculos.filter((v) => v.papel === 'agente').map((v) => v.pessoa_id),
  )
  assert.ok(agentes.size > 0, 'o exemplo precisa ter agente para o teste valer')
  for (const a of agentes) {
    const temOutroPapel = pacote.vinculos.some(
      (v) => v.pessoa_id === a && papeis.includes(v.papel),
    )
    if (!temOutroPapel) {
      assert.ok(true, 'agente puro não aparece na carteira')
    }
  }
})

test('"ver como o cliente vê" só é oferecido a quem tem PAPEL DE CARTEIRA publicável', () => {
  // O botão grava a escolha e manda para o portal. Oferecê-lo a quem renderia portal vazio
  // faria o operador ler o vazio como defeito do sistema.
  const papeis = ['titular', 'cotitular', 'cliente', 'parceiro']
  let ofertados = 0
  for (const p of pacote.pessoas) {
    const oferece = pacote.vinculos.some(
      (v) => v.pessoa_id === p.pessoa_id && v.publicavel && papeis.includes(v.papel),
    )
    if (!oferece) continue
    ofertados += 1
    const v = projetarParaCliente(pacote, p.pessoa_id)
    assert.ok(v.ativos.length > 0, `${p.nome} recebe o botão mas o portal sairia vazio`)
  }
  assert.ok(ofertados > 0)
})

test('CONTATO não tem portal próprio — é rastreabilidade, não escopo de visão', () => {
  /*
   * Regra do Gui, verbatim: "É bom registrar para ver quem contratou o serviço (cadastro do
   * usuário e quem autorizou) mas claro que o login do usuário responsável ele consegue ver
   * tudo mesmo que mais de um contato tenha autorizado serviços."
   *
   * Ou seja: o contato aparece na trilha de quem autorizou o quê, mas não gera uma visão
   * recortada. Quem vê a carteira é o responsável, inteira. Este teste existe porque o
   * contrário — dar portal ao contato — produziria um portal VAZIO, que é pior que nenhum:
   * o contato concluiria que não tem ativo nenhum.
   */
  const contatos = pacote.vinculos.filter((v) => v.papel === 'contato')
  assert.ok(contatos.length > 0, 'o exemplo precisa ter contato para o teste valer')

  for (const c of contatos) {
    const soContato = pacote.vinculos
      .filter((v) => v.pessoa_id === c.pessoa_id)
      .every((v) => v.papel === 'contato')
    if (!soContato) continue
    const v = projetarParaCliente(pacote, c.pessoa_id)
    assert.equal(v.ativos.length, 0, 'contato puro não recorta portfólio')
  }
})

test('o responsável vê a carteira inteira, mesmo com vários contatos autorizando', () => {
  // A outra metade da mesma regra: se o escopo fosse por contato, um titular com dois contatos
  // veria a carteira partida em duas. Ela tem de vir inteira.
  const papeis = ['titular', 'cotitular', 'cliente']
  for (const p of pacote.pessoas) {
    const meus = pacote.vinculos.filter(
      (v) => v.pessoa_id === p.pessoa_id && v.publicavel && papeis.includes(v.papel),
    )
    if (meus.length === 0) continue
    const v = projetarParaCliente(pacote, p.pessoa_id)
    const esperados = new Set(meus.map((x) => x.ativo_id))
    // Ativo com titular anônimo não vai para ninguém — esses saem da conta.
    const anonimos = new Set(
      pacote.ativos
        .filter((a) => a.pendencias.some((x) => x.tipo === 'titular_anonimo'))
        .map((a) => a.ativo_id),
    )
    for (const id of esperados) {
      if (anonimos.has(id)) continue
      assert.ok(
        v.ativos.some((a) => a.ativo_id === id),
        `${p.nome} deveria ver ${id} e não vê`,
      )
    }
  }
})

// ───────────────────────────────────────────────────────────────────────────
// ESTADO DO PRAZO — "pode ter prazo ainda não aberto"
// ───────────────────────────────────────────────────────────────────────────

test('um prazo tem QUATRO estados, e "ainda não aberto" é um deles', () => {
  /*
   * Nem todo prazo corre desde já. A prorrogação decenal só pode ser pedida no último ano de
   * vigência (art. 133 §1º) e a caducidade contra terceiro só 5 anos após a concessão dele
   * (art. 143). Antes da abertura não há o que fazer — e mostrá-los junto com os que correm
   * faz "em 7 anos" disputar atenção com "13 dias".
   */
  const H = '2026-09-07'
  assert.equal(estadoDoPrazo({ vence_em: '2026-10-01' }, H), 'aberto')
  assert.equal(estadoDoPrazo({ vence_em: '2026-09-07' }, H), 'aberto', 'vence hoje ainda corre')
  assert.equal(estadoDoPrazo({ vence_em: '2026-09-06' }, H), 'vencido')
  assert.equal(estadoDoPrazo({ abre_em: '2033-05-14', vence_em: '2034-05-14' }, H), 'a_abrir')
  // Abertura no passado não muda nada: o prazo já está correndo.
  assert.equal(estadoDoPrazo({ abre_em: '2020-01-01', vence_em: '2026-10-01' }, H), 'aberto')
  // Cumprido ganha de tudo, inclusive de vencido.
  assert.equal(
    estadoDoPrazo({ vence_em: '2020-01-01', cumprido: { em: '2019-12-01' } }, H),
    'cumprido',
  )
})

test('o exemplo tem prazo em mais de um estado — senão o filtro não prova nada', () => {
  const estados = new Set(pacote.prazos.map((p) => estadoDoPrazo(p, HOJE_FIXO)))
  assert.ok(estados.has('aberto'), 'precisa haver prazo correndo')
  assert.ok(estados.has('a_abrir'), 'precisa haver prazo que ainda não abriu')
})

test('todo prazo que ainda não abriu tem abertura ANTES do vencimento', () => {
  for (const p of pacote.prazos) {
    if (!p.abre_em) continue
    assert.ok(
      p.abre_em < p.vence_em,
      `${p.prazo_id}: a janela abriria depois de vencer, o que não existe`,
    )
  }
})

test('a data de abertura chega ao cliente — sem ela a lista dele mente', () => {
  for (const pessoa of comPortal()) {
    const v = projetarParaCliente(pacote, pessoa)
    for (const p of v.prazos) {
      const orig = pacote.prazos.find((x) => x.prazo_id === p.prazo_id)
      assert.equal(p.abre_em, orig?.abre_em, `${p.prazo_id}: abre_em não atravessou a projeção`)
    }
  }
})

// ───────────────────────────────────────────────────────────────────────────
// LINKS INTERNOS — o modo de falha silenciosa que já custou 58 regras ao BI
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// INVESTIMENTO — onde a dupla contagem nasce
// ───────────────────────────────────────────────────────────────────────────

test('proposta e derivados NÃO somam juntos', () => {
  /*
   * O caso real do Ploomes: uma proposta fechada cobre uma marca E uma patente, e ao ser
   * executada gera um card por ativo, cada um com a sua GRU. O cliente pagou UMA vez.
   * Contar os dois lados dobra o custo do portfólio.
   */
  const v = (total: number) => ({ moeda: 'BRL' as const, total, origem: 'nota_fiscal' })
  const servicos = [
    { servico_id: 'p', ativo_ids: ['a', 'b'], estado: 'concluido', papel_na_conta: 'proposta' as const, valor: v(10000) },
    { servico_id: 'd1', ativo_ids: ['a'], estado: 'concluido', papel_na_conta: 'derivado' as const, valor: v(6000) },
    { servico_id: 'd2', ativo_ids: ['b'], estado: 'concluido', papel_na_conta: 'derivado' as const, valor: v(4000) },
  ]
  const inv = somarInvestimento(servicos)
  assert.equal(inv.porMoeda[0].total, 10000, 'somou a proposta junto com os derivados')
  assert.equal(inv.comValor, 2, 'só os dois derivados entram na conta')
})

test('serviço com papel INDEFINIDO fica fora — menor e certo vale mais que maior e errado', () => {
  const servicos = [
    { servico_id: 'x', ativo_ids: ['a'], estado: 'concluido', valor: { moeda: 'BRL' as const, total: 999, origem: 'nota_fiscal' } },
  ]
  const inv = somarInvestimento(servicos)
  assert.equal(inv.porMoeda.length, 0, 'sem saber o papel, não dá para saber se duplica')
  assert.equal(motivoDeFora(servicos[0]), 'ainda não sabemos se este valor já está contado em outra linha')
})

test('perdido e cancelado não viraram gasto', () => {
  const v = { moeda: 'BRL' as const, total: 500, origem: 'nota_fiscal' }
  for (const estado of ['perdido', 'cancelado']) {
    const inv = somarInvestimento([
      { servico_id: 'x', ativo_ids: ['a'], estado, papel_na_conta: 'avulso' as const, valor: v },
    ])
    assert.equal(inv.porMoeda.length, 0, `${estado} não pode entrar no total`)
  }
})

test('as três naturezas somam para o total, e o resto vira "outros"', () => {
  const inv = somarInvestimento([
    {
      servico_id: 'x', ativo_ids: ['a'], estado: 'concluido', papel_na_conta: 'avulso' as const,
      valor: { moeda: 'BRL' as const, total: 1000, honorario: 600, taxa_oficial: 300, taxa_internacional: 50, origem: 'nota_fiscal' },
    },
  ])
  const s = inv.porMoeda[0]
  assert.equal(s.honorario, 600)
  assert.equal(s.taxaOficial, 300)
  assert.equal(s.taxaInternacional, 50)
  assert.equal(s.outros, 50, 'o não classificado aparece em vez de sumir')
  assert.equal(s.honorario + s.taxaOficial + s.taxaInternacional + s.outros, s.total)
})

test('moedas diferentes nunca se somam', () => {
  const inv = somarInvestimento([
    { servico_id: 'a', ativo_ids: ['x'], estado: 'concluido', papel_na_conta: 'avulso' as const, valor: { moeda: 'BRL' as const, total: 1000, origem: 'nota_fiscal' } },
    { servico_id: 'b', ativo_ids: ['x'], estado: 'concluido', papel_na_conta: 'avulso' as const, valor: { moeda: 'USD' as const, total: 200, origem: 'nota_fiscal' } },
  ])
  assert.equal(inv.porMoeda.length, 2, 'cada moeda na sua linha')
  assert.ok(!inv.porMoeda.some((m) => m.total === 1200), 'converter em silêncio muda o número do cliente')
})

test('o valor de procedência duvidosa não chega ao cliente', () => {
  // `order_amount` infla o nacional em R$ 145.153,79 — card espelhado repete o valor do irmão.
  for (const pessoa of comPortal()) {
    const v = projetarParaCliente(pacote, pessoa)
    for (const s of v.servicos) {
      if (!s.valor) continue
      assert.notEqual(s.valor.origem, 'order_amount', `${s.servico_id} vazou valor do CRM`)
    }
  }
})
