/**
 * Tempo — sempre explícito.
 *
 * ⛔ Regra 6 do `CLAUDE.md`: nada derivado é gravado. `dias_restantes`, contadores e totais são
 * função de `(dado, hoje)` na leitura, e `hoje` é PARÂMETRO — para o teste poder fixá-lo e para
 * a tela poder dizer de quando é o número.
 */

/** Instante ISO com fuso, no fuso local da máquina. Vai no envelope de todo pacote. */
export function agoraIso(): string {
  const d = new Date()
  const off = -d.getTimezoneOffset()
  const sinal = off >= 0 ? '+' : '-'
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
  const mm = String(Math.abs(off) % 60).padStart(2, '0')
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sinal}${hh}:${mm}`
  )
}

/** Data civil de hoje, no fuso local. */
export function hojeIso(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** AAAA-MM-DD → DD/MM/AAAA, para a tela. */
export function dataBr(iso?: string | null): string {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return d && m && a ? `${d}/${m}/${a}` : iso
}

/** Instante ISO → DD/MM/AAAA HH:MM. */
export function instanteBr(iso?: string | null): string {
  if (!iso) return '—'
  const [data, resto] = iso.split('T')
  return `${dataBr(data)} ${resto?.slice(0, 5) ?? ''}`.trim()
}
