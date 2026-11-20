'use client'

/**
 * Texto encurtado: passa de `max` caracteres → corta e põe "…". Ao passar o mouse (ou focar
 * pelo teclado, ou tocar no celular), um balão mostra o texto inteiro.
 *
 *   <TextoCurto texto={nome} />            → até 20 caracteres
 *   <TextoCurto texto={nome} max={32} />
 *
 * O balão vai para o <body> por portal e se posiciona pela tela: dentro de uma tabela com
 * rolagem lateral (overflow) ele seria cortado. Abre acima do texto; sem espaço, abre abaixo.
 */

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export const MAX_TEXTO_CURTO = 20

/** A regra de corte, sozinha — para quem precisa só da string. */
export function encurtar(texto: string, max = MAX_TEXTO_CURTO): string {
  const t = texto.trim()
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t
}

export function TextoCurto({ texto, max = MAX_TEXTO_CURTO }: { texto: string; max?: number }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number; abaixo: boolean } | null>(null)
  const alvo = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (!aberto || !alvo.current) return
    const r = alvo.current.getBoundingClientRect()
    const abaixo = r.top < 72
    // O balão é centrado no texto, mas nunca sai da tela pelas laterais.
    const x = Math.min(Math.max(r.left + r.width / 2, 140), window.innerWidth - 140)
    setPos({ x, y: abaixo ? r.bottom + 8 : r.top - 8, abaixo })
  }, [aberto])

  const curto = encurtar(texto, max)
  if (curto === texto.trim()) return <>{texto}</>

  const fechar = () => {
    setAberto(false)
    setPos(null)
  }

  return (
    <>
      <span
        ref={alvo}
        tabIndex={0}
        className="cursor-pointer"
        aria-label={texto}
        onMouseEnter={() => setAberto(true)}
        onMouseLeave={fechar}
        onFocus={() => setAberto(true)}
        onBlur={fechar}
        // Toque no celular: não há "passar o mouse", então o toque alterna o balão.
        onTouchStart={() => setAberto((a) => !a)}
      >
        {curto}
      </span>
      {aberto &&
        pos &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[70] max-w-[280px] rounded-lg px-3 py-2 text-[12px] leading-snug text-[var(--tx)]"
            style={{
              left: pos.x,
              top: pos.y,
              transform: pos.abaixo ? 'translateX(-50%)' : 'translate(-50%, -100%)',
              background: 'var(--fundo)',
              border: '1px solid var(--brd-forte)',
              boxShadow: 'var(--sh-forte)',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {texto}
          </div>,
          document.body,
        )}
    </>
  )
}
