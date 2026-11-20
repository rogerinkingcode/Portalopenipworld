'use client'

/**
 * Janela (modal) da casa para conteúdo livre — formulários, principalmente. Para "tem certeza?",
 * use a <Confirmacao />, que já traz os botões.
 *
 * Mesma animação da Confirmação (fundo escurece; a caixa sobe e ganha opacidade) e a mesma
 * regra de estado: `desenhado` e `entrou` só mudam dentro de rAF/timeout, nunca no render — ver
 * o porquê em Confirmacao.tsx. Esc, o ✕ ou clique fora fecham.
 *
 * Quem rola é a camada de fora, não a caixa: assim uma lista suspensa dentro do formulário
 * (a busca de pessoa, por exemplo) pode passar da borda da caixa sem ser cortada.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const DURACAO_MS = 220

export function Janela({
  aberto,
  titulo,
  subtitulo,
  aoFechar,
  largura = 640,
  children,
}: {
  aberto: boolean
  titulo: string
  subtitulo?: string
  aoFechar: () => void
  /** Largura máxima da caixa, em px. */
  largura?: number
  children: React.ReactNode
}) {
  const [desenhado, setDesenhado] = useState(false)
  const [entrou, setEntrou] = useState(false)
  const jaAbriu = useRef(false)
  const caixa = useRef<HTMLDivElement>(null)
  const fechar = useRef(aoFechar)
  useEffect(() => {
    fechar.current = aoFechar
  })

  const montado = aberto || desenhado
  const visivel = entrou && aberto

  useEffect(() => {
    if (aberto) {
      jaAbriu.current = true
      let q2 = 0
      const q1 = requestAnimationFrame(() => {
        q2 = requestAnimationFrame(() => {
          setEntrou(true)
          setDesenhado(true)
        })
      })
      return () => {
        cancelAnimationFrame(q1)
        cancelAnimationFrame(q2)
      }
    }
    if (!jaAbriu.current) return
    const t = setTimeout(() => {
      setEntrou(false)
      setDesenhado(false)
    }, DURACAO_MS)
    return () => clearTimeout(t)
  }, [aberto])

  // Esc fecha; o foco vai para o primeiro campo; a página de trás não rola.
  useEffect(() => {
    if (!aberto) return
    const primeiro = caixa.current?.querySelector<HTMLElement>('input, select, textarea, button')
    primeiro?.focus()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fechar.current()
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', tecla)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  if (!montado) return null

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={titulo}>
      <div
        className="absolute inset-0 bg-black/50 transition-opacity ease-out"
        style={{ opacity: visivel ? 1 : 0, transitionDuration: `${DURACAO_MS}ms` }}
      />
      {/* Camada que rola; o clique no vazio dela (fora da caixa) fecha. */}
      <div
        className="absolute inset-0 overflow-y-auto px-3 py-6 sm:px-4 sm:py-12"
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return
          // Clique na BARRA DE ROLAGEM desta camada também chega aqui como clique "fora": a barra
          // fica além de clientWidth. Só fecha o clique no vazio de verdade.
          const camada = e.currentTarget
          if (e.clientX >= camada.getBoundingClientRect().left + camada.clientWidth) return
          aoFechar()
        }}
      >
        <div
          ref={caixa}
          className="relative mx-auto w-full rounded-2xl"
          style={{
            maxWidth: largura,
            background: 'var(--fundo)',
            border: '1px solid var(--brd)',
            boxShadow: 'var(--sh-forte)',
            opacity: visivel ? 1 : 0,
            transform: visivel ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.97)',
            transition: `opacity ${DURACAO_MS}ms ease-out, transform ${DURACAO_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
          }}
        >
          <header className="flex items-start gap-3 border-b border-[var(--linha)] px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
                {titulo}
              </h2>
              {subtitulo && <p className="mt-0.5 text-[11.5px] text-[var(--tx2)]">{subtitulo}</p>}
            </div>
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar"
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-[var(--brd)] text-[14px] text-[var(--tx2)] transition hover:bg-[var(--sup-h)] hover:text-[var(--tx)]"
            >
              ✕
            </button>
          </header>
          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
