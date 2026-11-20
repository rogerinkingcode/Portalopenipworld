/**
 * A lógica do filtro, separada do componente.
 *
 * Mora aqui, e não no `.tsx`, por um motivo prático: o runner de teste do Node lê `.ts` e não
 * `.tsx`. Regra que não pode ser testada tende a virar regra que ninguém confere.
 */

export type Opcao = {
  valor: string
  rotulo: string
  n: number
  /** quando presente, a barra desenha a bandeira antes do rótulo */
  jurisdicao?: string
}

/**
 * A partir de quantos itens um filtro deixa de ser ruído.
 *
 * Abaixo disto a lista cabe no olho e o filtro custa mais do que resolve: a pessoa varre
 * quatro linhas mais rápido do que decide em qual chip clicar. É o que o Gui pediu com
 * "de forma intuitiva quando houver".
 */
export const LIMIAR_FILTRO = 4

/** Conta ocorrências e devolve as opções ordenadas por frequência, desempatando por nome. */
export function contar<T>(
  itens: T[],
  chave: (i: T) => string | undefined,
  rotulo: (v: string) => string,
  jurisdicao?: (v: string) => string | undefined,
): Opcao[] {
  const m = new Map<string, number>()
  for (const i of itens) {
    const k = chave(i)
    if (!k) continue
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([valor, n]) => ({ valor, n, rotulo: rotulo(valor), jurisdicao: jurisdicao?.(valor) }))
    // frequência primeiro; o desempate por nome existe para a ordem não dançar entre renders
    .sort((a, b) => b.n - a.n || a.rotulo.localeCompare(b.rotulo))
}

/**
 * O filtro se justifica? Vale quando já está ligado (senão a pessoa não consegue desligar),
 * quando alguém pediu para forçar, ou quando há escolha real E lista longa o bastante.
 */
export function valeFiltrar({
  opcoes,
  escolhido,
  total,
  forcar = false,
}: {
  opcoes: number
  escolhido: string | null
  total: number
  forcar?: boolean
}): boolean {
  return forcar || !!escolhido || (opcoes > 1 && total > LIMIAR_FILTRO)
}
