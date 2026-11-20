'use client'

/**
 * Ler `localStorage` sem quebrar a hidratação e sem `setState` dentro de efeito.
 *
 * O caminho ingênuo — `useState(padrão)` + `useEffect(() => setValor(lido))` — funciona, mas
 * dispara renderização em cascata e o lint do React 19 reclama com razão: efeito serve para
 * sincronizar com sistema externo, não para carregar estado inicial.
 *
 * `useSyncExternalStore` é a API feita exatamente para isto: ela lê a fonte externa, avisa o
 * React quando ela muda, e recebe um valor separado para o servidor — que é o que evita o
 * descasamento de hidratação sem precisar de `montado`.
 *
 * ⚠️ O navegador pode negar o acesso (janela anônima, dados de site bloqueados). Toda leitura e
 *    toda escrita ficam em try/catch, e o padrão vale quando não há armazenamento.
 */

import { useCallback, useSyncExternalStore } from 'react'

const ouvintes = new Set<() => void>()

/** Avisa todos os componentes que leem a mesma chave — inclusive em outra aba. */
function avisar() {
  for (const o of ouvintes) o()
}

function inscrever(ao: () => void): () => void {
  ouvintes.add(ao)
  // `storage` só dispara em OUTRAS abas; o aviso local é o `avisar()` da escrita.
  const daOutraAba = () => ao()
  window.addEventListener('storage', daOutraAba)
  return () => {
    ouvintes.delete(ao)
    window.removeEventListener('storage', daOutraAba)
  }
}

export function lerArmazenado(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

export function gravarArmazenado(chave: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, valor)
  } catch {
    /* sem armazenamento: o valor vale só enquanto a página estiver aberta */
  }
  avisar()
}

/**
 * Devolve o valor da chave e uma função para gravá-la.
 * No servidor devolve sempre `padrao`, que é o que a primeira pintura usa.
 */
export function useArmazenado(
  chave: string,
  padrao: string | null = null,
): [string | null, (v: string | null) => void] {
  const valor = useSyncExternalStore(
    inscrever,
    () => lerArmazenado(chave) ?? padrao,
    () => padrao,
  )
  const gravar = useCallback((v: string | null) => gravarArmazenado(chave, v), [chave])
  return [valor, gravar]
}
