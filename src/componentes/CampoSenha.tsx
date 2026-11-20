'use client'

/**
 * Campo de senha com o "olho": mostra e esconde o que foi digitado.
 *
 * Aceita tudo o que um <input> aceita (value, onChange, autoComplete, className, ref…) e só troca
 * o `type` entre password e text. ⭐ Todo campo de senha do sistema usa este, no lugar de
 * <input type="password">.
 */

import { useState } from 'react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { ref?: React.Ref<HTMLInputElement> }

export function CampoSenha({ ref, style, ...props }: Props) {
  const [visivel, setVisivel] = useState(false)
  return (
    <span className="relative block">
      <input
        {...props}
        ref={ref}
        type={visivel ? 'text' : 'password'}
        // Espaço à direita para o texto não passar por baixo do olho.
        style={{ ...style, paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        disabled={props.disabled}
        aria-label={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
        aria-pressed={visivel}
        title={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
        className="olho-senha absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-[var(--tx3)] transition hover:text-[var(--tx)] disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="2.8" />
          {/* Riscado quando a senha está à mostra: clicar de novo esconde. */}
          {visivel && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </span>
  )
}
