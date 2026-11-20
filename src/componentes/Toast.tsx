'use client'

/**
 * Toasts — os avisos que aparecem no canto superior direito e somem sozinhos.
 *
 * Dois jeitos de usar, e os dois valem para o sistema inteiro:
 *
 *   1) Direto, de qualquer lugar (componente, função, até fora do React):
 *        toast.sucesso('Documento enviado.')
 *        toast.erro('Não deu para salvar.')
 *        toast.aviso('A planilha tem 3 linhas recusadas.')
 *        toast.info('A leitura continua em segundo plano.')
 *
 *   2) Como estado de mensagem da tela, no lugar de `useState<string | null>(null)`:
 *        const [erro, setErro] = useMensagem('erro')
 *        const [aviso, setAviso] = useMensagem('sucesso')
 *      Funciona igual a um useState (a tela continua mostrando a mensagem dela, se quiser), e
 *      ainda dispara o toast toda vez que recebe um texto. ⭐ Tela nova: use este — o toast
 *      vem de graça.
 *
 * O <Toasts /> é montado uma vez, no layout raiz. A mesma mensagem repetida em menos de 1,5 s
 * vira um toast só (o modo estrito do React e os re-renders não duplicam aviso).
 */

import { useCallback, useState, useSyncExternalStore } from 'react'

export type TipoToast = 'sucesso' | 'erro' | 'aviso' | 'info'

type Toast = { id: number; tipo: TipoToast; texto: string; saindo: boolean }

/** Quanto tempo cada tipo fica na tela. Erro fica mais: precisa dar tempo de ler. */
const DURACAO_MS: Record<TipoToast, number> = { sucesso: 4500, info: 5000, aviso: 6500, erro: 8000 }
const SAIDA_MS = 220
const MAXIMO = 5

// ── Loja global (fora do React, para poder ser chamada de qualquer lugar) ─────────────────
let fila: Toast[] = []
let proximoId = 1
const ouvintes = new Set<() => void>()
const recentes = new Map<string, number>()
const avisar = () => ouvintes.forEach((f) => f())

function remover(id: number) {
  fila = fila.map((t) => (t.id === id ? { ...t, saindo: true } : t))
  avisar()
  setTimeout(() => {
    fila = fila.filter((t) => t.id !== id)
    avisar()
  }, SAIDA_MS)
}

function mostrar(tipo: TipoToast, texto: string) {
  const limpo = texto.trim()
  if (!limpo || typeof window === 'undefined') return
  const chave = `${tipo}|${limpo}`
  const agora = Date.now()
  if (agora - (recentes.get(chave) ?? 0) < 1500) return
  recentes.set(chave, agora)

  const id = proximoId++
  fila = [...fila, { id, tipo, texto: limpo, saindo: false }].slice(-MAXIMO)
  avisar()
  setTimeout(() => remover(id), DURACAO_MS[tipo])
}

export const toast = {
  sucesso: (texto: string) => mostrar('sucesso', texto),
  erro: (texto: string) => mostrar('erro', texto),
  aviso: (texto: string) => mostrar('aviso', texto),
  info: (texto: string) => mostrar('info', texto),
}

/** Texto de um erro qualquer (Error, ErroApi, string) para o toast. */
export function textoDoErro(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Estado de mensagem que também dispara o toast. Mesmo formato de um useState de string.
 * Aceita string, null ou uma função de atualização, como o useState.
 */
export function useMensagem(tipo: TipoToast, inicial: string | null = null) {
  const [valor, setValor] = useState<string | null>(inicial)
  const definir = useCallback(
    (v: string | null | ((anterior: string | null) => string | null)) => {
      setValor((anterior) => {
        const novo = typeof v === 'function' ? v(anterior) : v
        // O toast sai DEPOIS do render (microtarefa): disparar aviso dentro do updater de
        // estado do React é efeito colateral no meio do render.
        if (novo) queueMicrotask(() => mostrar(tipo, novo))
        return novo
      })
    },
    [tipo],
  )
  return [valor, definir] as const
}

// ── O que aparece na tela ──────────────────────────────────────────────────────────────────

const assinar = (f: () => void) => {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}
const lerFila = () => fila
const filaVazia: Toast[] = []

const ESTILO: Record<TipoToast, { cor: string; fundo: string; borda: string; titulo: string; icone: React.ReactNode }> = {
  sucesso: {
    cor: 'var(--color-ok)',
    fundo: 'rgba(27,140,90,.12)',
    borda: 'rgba(27,140,90,.45)',
    // "Concluído", e não "Tudo certo": fala da AÇÃO, não do resultado (ver CLAUDE.md §6-bis, regra 7).
    titulo: 'Concluído',
    icone: <path d="M5 12.5 10 17.5 19 7" />,
  },
  erro: {
    cor: 'var(--color-erro)',
    fundo: 'rgba(192,57,43,.12)',
    borda: 'rgba(192,57,43,.45)',
    titulo: 'Algo deu errado',
    icone: <path d="M7 7l10 10M17 7 7 17" />,
  },
  aviso: {
    cor: 'var(--color-alerta)',
    fundo: 'rgba(230,138,0,.12)',
    borda: 'rgba(230,138,0,.45)',
    titulo: 'Atenção',
    icone: <path d="M12 7v6M12 16.5v.5" />,
  },
  info: {
    cor: 'var(--color-petrol-cla)',
    fundo: 'rgba(37,137,168,.12)',
    borda: 'rgba(37,137,168,.45)',
    titulo: 'Para saber',
    icone: <path d="M12 11v6M12 7.5v.5" />,
  },
}

export function Toasts() {
  const itens = useSyncExternalStore(assinar, lerFila, () => filaVazia)
  if (itens.length === 0) return null
  return (
    <div
      className="pointer-events-none fixed right-3 top-3 z-[80] flex w-[min(380px,calc(100vw-1.5rem))] flex-col gap-2 sm:right-5 sm:top-5"
      aria-live="polite"
    >
      {itens.map((t) => {
        const e = ESTILO[t.tipo]
        return (
          <div
            key={t.id}
            role={t.tipo === 'erro' ? 'alert' : 'status'}
            className={`toast pointer-events-auto flex items-start gap-3 rounded-xl px-3.5 py-3 ${t.saindo ? 'toast-sai' : ''}`}
            style={{
              background: `linear-gradient(${e.fundo}, ${e.fundo}), var(--fundo)`,
              border: `1px solid ${e.borda}`,
              borderLeft: `4px solid ${e.cor}`,
              boxShadow: 'var(--sh-forte)',
            }}
          >
            <span
              className="mt-[1px] grid h-6 w-6 flex-shrink-0 place-items-center rounded-full"
              style={{ background: e.cor, color: '#fff' }}
              aria-hidden
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                {e.icone}
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold" style={{ color: e.cor, fontFamily: 'var(--font-titulo)' }}>
                {e.titulo}
              </span>
              <span className="mt-0.5 block break-words text-[12px] leading-snug text-[var(--tx)]">{t.texto}</span>
            </span>
            <button
              type="button"
              onClick={() => remover(t.id)}
              aria-label="Fechar aviso"
              className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md text-[13px] text-[var(--tx3)] hover:text-[var(--tx)]"
            >
              ✕
            </button>
            <span className="toast-barra" style={{ background: e.cor, animationDuration: `${DURACAO_MS[t.tipo]}ms` }} aria-hidden />
          </div>
        )
      })}
    </div>
  )
}
