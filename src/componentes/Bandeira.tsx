'use client'

/**
 * Bandeira da jurisdição. Mesma biblioteca dos três painéis da casa (flag-icons),
 * aqui instalada localmente em vez de por CDN — o Wallet roda offline.
 *
 * Duas jurisdições NÃO são países e por isso não têm bandeira ISO. Elas ganham selo
 * próprio em vez de um retângulo vazio ou de uma bandeira errada:
 *   EM → marca da União Europeia (EUIPO), usa a bandeira da UE
 *   WO → registro internacional (Madri / PCT). Não é país. Selo "WO".
 */

import { isoBandeira } from '@/lib/visao'
import { rotuloJurisdicao } from '@/lib/rotulos'

export function Bandeira({ j, grande = false }: { j: string; grande?: boolean }) {
  const iso = isoBandeira(j)
  const titulo = rotuloJurisdicao(j)
  const cls = grande ? 'fi fi-g' : 'fi'

  if (!iso) {
    return (
      <span
        className={`${cls} fi-vazio grid place-items-center font-semibold`}
        title={titulo}
        aria-label={titulo}
        style={{ fontSize: grande ? 8 : 6.5, letterSpacing: '.02em' }}
      >
        {j === 'WO' ? '◍' : j}
      </span>
    )
  }
  return <span className={`${cls} fi-${iso}`} title={titulo} aria-label={titulo} role="img" />
}

/** Bandeira + sigla, o par que aparece em lista e em tabela. */
export function BandeiraRotulo({ j, grande = false }: { j: string; grande?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Bandeira j={j} grande={grande} />
      <span className="num text-[11px] font-medium text-[var(--tx2)]">{j}</span>
    </span>
  )
}
