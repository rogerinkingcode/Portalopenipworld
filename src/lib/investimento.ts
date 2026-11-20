/**
 * O que o portfólio custou — e o que a casa pode afirmar sobre isso.
 *
 * Pedido do Gui: *"transparência e previsibilidade para o cliente saber valorar o custo do
 * portfólio"*, com recorte por ativo, por país, por matéria, e a série mensal e anual.
 *
 * ⚠️ A regra que governa tudo aqui: **só entra o que tem procedência**. O valor do card no CRM
 *    (`order_amount`) infla o nacional em R$ 145.153,79, porque card espelhado repete o valor do
 *    irmão — ele não atravessa a projeção e não chega a estas funções. Mas o serviço SEM valor
 *    continua existindo, e toda soma aqui carrega quantos ficaram de fora. Um total que omite os
 *    silêncios mente por baixo, que é a forma mais convincente de mentir sobre dinheiro.
 *
 * ⚠️ Três naturezas, nunca fundidas: **honorário** é a Apex, **taxa oficial** é repasse ao INPI,
 *    **taxa internacional** é associado e autarquia no exterior. São três perguntas distintas —
 *    "quanto pago a vocês", "quanto é do governo", "quanto custa estar lá fora".
 *
 * ⚠️ Moeda NÃO se converte. Um portfólio internacional gasta em real e em dólar; somar exige uma
 *    cotação com data, e uma cotação escolhida em silêncio muda o número do cliente.
 */

export type ValorServico = {
  moeda: 'BRL' | 'USD' | 'EUR'
  total: number
  honorario?: number
  taxa_oficial?: number
  taxa_internacional?: number
  origem: string
}

export type PapelNaConta = 'proposta' | 'derivado' | 'avulso' | 'indefinido'

export type ServicoComValor = {
  servico_id: string
  ativo_ids: string[]
  tipo?: string
  materia?: string[]
  paises?: string[]
  estado: string
  datas?: { abertura?: string; conclusao?: string }
  valor?: ValorServico
  /** Ver `contabilizavel` — é o que impede contar a proposta e os derivados dela. */
  papel_na_conta?: PapelNaConta
  origem?: { deal_id?: number; origem_deal_id?: number }
}

export type Soma = {
  moeda: string
  total: number
  honorario: number
  taxaOficial: number
  taxaInternacional: number
  /** O que sobrou do total depois das três naturezas — despesa não classificada. */
  outros: number
  n: number
}

export type Recorte = { chave: string; somas: Soma[]; n: number; semValor: number }

export type Investimento = {
  porMoeda: Soma[]
  comValor: number
  /** Serviços SEM valor publicável — a tela precisa dizer isto. */
  semValor: number
  porAtivo: Recorte[]
  porPais: Recorte[]
  porMateria: Recorte[]
  porAno: Recorte[]
  porMes: Recorte[]
}

/** A data que representa o gasto: conclusão se houver, senão abertura. */
export function dataDoGasto(s: ServicoComValor): string | undefined {
  return s.datas?.conclusao ?? s.datas?.abertura
}

/**
 * O que entra na conta.
 *
 * Duas exclusões, e a segunda é a que evita o erro mais caro:
 *
 * 1. Serviço perdido ou cancelado não virou gasto.
 *
 * 2. ⛔ **DERIVADO não soma junto com a PROPOSTA.** Uma proposta fechada no Ploomes cobre mais
 *    de um ativo — uma marca e uma patente, por exemplo — e ao ser executada gera um card por
 *    ativo, cada um com a sua GRU. O cliente pagou UMA vez, na proposta. Contar os dois lados
 *    dobra o custo do portfólio.
 *
 *    O DERIVADO é quem fica, e não a proposta, porque é ele que sabe a QUAL ativo o dinheiro
 *    pertence — e o recorte por ativo, por país e por matéria é justamente o que se quer ver.
 *    A proposta só entraria como um bloco indivisível.
 *
 * 3. `indefinido` também fica de fora: sem saber o papel, não dá para saber se somar duplica.
 *    Um total menor e certo vale mais que um maior e errado — e a tela conta quantos ficaram
 *    de fora, para o silêncio não passar por zero.
 */
function contabilizavel(s: ServicoComValor): boolean {
  if (s.estado === 'perdido' || s.estado === 'cancelado') return false
  const papel = s.papel_na_conta ?? 'indefinido'
  return papel === 'derivado' || papel === 'avulso'
}

/** Por que um serviço com valor ficou fora da conta — a tela precisa saber dizer. */
export function motivoDeFora(s: ServicoComValor): string | null {
  if (s.estado === 'perdido') return 'proposta não seguiu'
  if (s.estado === 'cancelado') return 'contratação cancelada'
  const papel = s.papel_na_conta ?? 'indefinido'
  if (papel === 'proposta') {
    return 'proposta guarda-chuva — o valor está nos serviços derivados dela'
  }
  if (papel === 'indefinido') {
    return 'ainda não sabemos se este valor já está contado em outra linha'
  }
  return null
}

function novaSoma(moeda: string): Soma {
  return {
    moeda,
    total: 0,
    honorario: 0,
    taxaOficial: 0,
    taxaInternacional: 0,
    outros: 0,
    n: 0,
  }
}

function acumular(m: Map<string, Soma>, v: ValorServico) {
  const s = m.get(v.moeda) ?? novaSoma(v.moeda)
  const h = v.honorario ?? 0
  const t = v.taxa_oficial ?? 0
  const i = v.taxa_internacional ?? 0
  s.total += v.total
  s.honorario += h
  s.taxaOficial += t
  s.taxaInternacional += i
  // O que não foi classificado não some: aparece como "outros" em vez de sumir do total.
  s.outros += Math.max(0, v.total - h - t - i)
  s.n += 1
  m.set(v.moeda, s)
}

function ordenar(somas: Map<string, Soma>): Soma[] {
  return [...somas.values()].sort((a, b) => b.total - a.total)
}

/**
 * Agrupa por uma chave. Um serviço pode pertencer a VÁRIAS chaves (dois ativos, três países),
 * e nesse caso o valor entra inteiro em cada grupo — por isso a soma dos grupos pode passar do
 * total geral. Quem exibe precisa dizer isso; é a mesma armadilha de contar picklist múltipla
 * como se fosse uma linha por card.
 */
function agrupar(
  servicos: ServicoComValor[],
  chaves: (s: ServicoComValor) => string[],
): Recorte[] {
  const m = new Map<string, { somas: Map<string, Soma>; n: number; semValor: number }>()
  for (const s of servicos) {
    if (!contabilizavel(s)) continue
    for (const k of chaves(s)) {
      const e = m.get(k) ?? { somas: new Map<string, Soma>(), n: 0, semValor: 0 }
      e.n += 1
      if (s.valor) acumular(e.somas, s.valor)
      else e.semValor += 1
      m.set(k, e)
    }
  }
  return [...m.entries()]
    .map(([chave, e]) => ({ chave, somas: ordenar(e.somas), n: e.n, semValor: e.semValor }))
    .sort((a, b) => (b.somas[0]?.total ?? 0) - (a.somas[0]?.total ?? 0))
}

export function somarInvestimento(servicos: ServicoComValor[]): Investimento {
  const geral = new Map<string, Soma>()
  let comValor = 0
  let semValor = 0

  for (const s of servicos) {
    if (!contabilizavel(s)) continue
    if (!s.valor) {
      semValor += 1
      continue
    }
    comValor += 1
    acumular(geral, s.valor)
  }

  return {
    porMoeda: ordenar(geral),
    comValor,
    semValor,
    porAtivo: agrupar(servicos, (s) => s.ativo_ids),
    porPais: agrupar(servicos, (s) => s.paises ?? []),
    porMateria: agrupar(servicos, (s) => s.materia ?? []),
    porAno: agrupar(servicos, (s) => {
      const d = dataDoGasto(s)
      return d ? [d.slice(0, 4)] : []
    }),
    porMes: agrupar(servicos, (s) => {
      const d = dataDoGasto(s)
      return d ? [d.slice(0, 7)] : []
    }),
  }
}

const SIMBOLO: Record<string, string> = { BRL: 'R$', USD: 'US$', EUR: '€' }

/** Duas casas decimais sempre — é a regra da casa para valor. */
export function dinheiro(v: number, moeda = 'BRL'): string {
  return `${SIMBOLO[moeda] ?? moeda} ${v.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const MES_CURTO = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

/** `2026-09` → `set/26`. */
export function rotuloMes(aaaaMm: string): string {
  const [a, m] = aaaaMm.split('-')
  return `${MES_CURTO[Number(m) - 1] ?? m}/${a.slice(2)}`
}
