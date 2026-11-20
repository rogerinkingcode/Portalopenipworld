'use client'

/**
 * A foto de perfil, redonda. Sem foto (ou se a imagem não carregar — por exemplo, enquanto o
 * armazenamento ainda não está configurado), mostra o boneco padrão dos sistemas: cabeça e ombros
 * sobre um fundo neutro, que diz "aqui vai uma foto".
 *
 * A URL leva o hash da foto (`?v=`): trocou a foto, mudou a URL, e o navegador busca de novo.
 */

import { useState } from 'react'
import { BASE_API } from '@/lib/api'

export function Avatar({
  usuarioId,
  fotoSha256,
  nome,
  tamanho = 32,
  anel = false,
}: {
  usuarioId: string
  fotoSha256: string | null | undefined
  /** Para o texto alternativo da imagem. */
  nome: string
  tamanho?: number
  /** Contorno ciano, para quando a foto fica sobre fundo escuro (a sidebar). */
  anel?: boolean
}) {
  // Guarda QUAL foto falhou: trocar de foto tenta de novo, sem estado para resetar.
  const [falhou, setFalhou] = useState<string | null>(null)
  const temFoto = !!fotoSha256 && falhou !== fotoSha256
  const borda = anel ? '0 0 0 2px rgba(0,224,246,.45)' : '0 0 0 1px var(--brd)'

  if (temFoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagem autenticada servida pela API, não pelo otimizador do Next
      <img
        src={`${BASE_API}/usuarios/${usuarioId}/foto?v=${fotoSha256!.slice(0, 16)}`}
        alt={`Foto de ${nome}`}
        width={tamanho}
        height={tamanho}
        onError={() => setFalhou(fotoSha256!)}
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: tamanho, height: tamanho, boxShadow: borda, background: 'var(--sup2)' }}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={`${nome} ainda não tem foto`}
      className="relative grid flex-shrink-0 place-items-end overflow-hidden rounded-full"
      style={{
        width: tamanho,
        height: tamanho,
        boxShadow: borda,
        background: 'linear-gradient(160deg, #cfd9de, #a9b9c1)',
      }}
    >
      {/* O boneco padrão: cabeça e ombros, cortados pela borda redonda. */}
      <svg viewBox="0 0 32 32" width={tamanho} height={tamanho} aria-hidden>
        <circle cx="16" cy="12.5" r="6" fill="#f4f7f8" />
        <path d="M4 32c0-7.2 5.4-12 12-12s12 4.8 12 12z" fill="#f4f7f8" />
      </svg>
    </span>
  )
}
