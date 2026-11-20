'use client'

/**
 * Calendário de prazos — a mesma lista, na forma que responde "como está o meu mês?".
 *
 * A lista responde "o que vem primeiro"; o calendário responde "onde há aperto".
 * São perguntas diferentes, e por isso as duas formas convivem em vez de uma
 * substituir a outra.
 *
 * ⛔ Sem contagem regressiva animada, sem vermelho pulsante, sem sino. A casa entrega
 *    um ou dois casos por revista; urgência teatral vista toda semana ensina a ignorar.
 */

import { useMemo, useState } from 'react'
import { diasAte, MES_NOME, urgenciaDe } from '@/lib/visao'

export type ItemCalendario = {
  id: string
  data: string
  titulo: string
  detalhe?: string
  href?: string
  firme: boolean
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function partes(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return { a, m, d }
}

function diaDaSemana(a: number, m: number, d: number): number {
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay()
}

function diasNoMes(a: number, m: number): number {
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}

export function Calendario({
  itens,
  hoje,
  aoClicar,
}: {
  itens: ItemCalendario[]
  hoje: string
  aoClicar?: (id: string) => void
}) {
  const h = partes(hoje)
  const [ano, setAno] = useState(h.a)
  const [mes, setMes] = useState(h.m)

  const porDia = useMemo(() => {
    const m = new Map<string, ItemCalendario[]>()
    for (const i of itens) {
      const l = m.get(i.data) ?? []
      l.push(i)
      m.set(i.data, l)
    }
    return m
  }, [itens])

  const total = diasNoMes(ano, mes)
  const inicio = diaDaSemana(ano, mes, 1)
  const celulas: (number | null)[] = [
    ...Array.from({ length: inicio }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ]
  while (celulas.length % 7 !== 0) celulas.push(null)

  function mover(d: number) {
    let m = mes + d
    let a = ano
    if (m < 1) {
      m = 12
      a -= 1
    }
    if (m > 12) {
      m = 1
      a += 1
    }
    setMes(m)
    setAno(a)
  }

  // Meses que têm prazo, para o salto rápido — quem tem 12 prazos não quer clicar 8 vezes.
  const mesesComPrazo = useMemo(() => {
    const s = new Set<string>()
    for (const i of itens) {
      const p = partes(i.data)
      s.add(`${p.a}-${String(p.m).padStart(2, '0')}`)
    }
    return [...s].sort()
  }, [itens])

  const noMes = itens.filter((i) => {
    const p = partes(i.data)
    return p.a === ano && p.m === mes
  })

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => mover(-1)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--brd)] text-[var(--tx2)] transition hover:border-[var(--brd-forte)] hover:text-[var(--tx)]"
            aria-label="Mês anterior"
          >
            ‹
          </button>
          <span
            className="min-w-[150px] text-center text-[13px] font-semibold text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            {MES_NOME[mes - 1]} <span className="num text-[var(--tx2)]">{ano}</span>
          </span>
          <button
            onClick={() => mover(1)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--brd)] text-[var(--tx2)] transition hover:border-[var(--brd-forte)] hover:text-[var(--tx)]"
            aria-label="Próximo mês"
          >
            ›
          </button>
          {(ano !== h.a || mes !== h.m) && (
            <button
              onClick={() => {
                setAno(h.a)
                setMes(h.m)
              }}
              className="ml-1 rounded-lg px-2 py-1 text-[10.5px] font-medium text-[var(--tx2)] transition hover:text-[var(--tx)]"
            >
              hoje
            </button>
          )}
        </div>

        {mesesComPrazo.length > 1 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="rotulo mr-1">com prazo</span>
            {mesesComPrazo.slice(0, 8).map((k) => {
              const [a, m] = k.split('-').map(Number)
              const on = a === ano && m === mes
              return (
                <button
                  key={k}
                  onClick={() => {
                    setAno(a)
                    setMes(m)
                  }}
                  className="num rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition"
                  style={{
                    borderColor: on ? 'var(--color-ciano)' : 'var(--brd)',
                    color: on ? 'var(--tx)' : 'var(--tx3)',
                    background: on ? 'rgba(0,224,246,.1)' : 'transparent',
                  }}
                >
                  {String(m).padStart(2, '0')}/{String(a).slice(2)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* rola dentro de si em tela estreita, em vez de empurrar a página */}
      <div className="-mx-1 overflow-x-auto px-1">
      <div className="grid min-w-[430px] grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="rotulo pb-1 text-center">
            {d}
          </div>
        ))}

        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`v${i}`} />
          const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
          const doDia = porDia.get(iso) ?? []
          const eHoje = iso === hoje
          const fds = [0, 6].includes(diaDaSemana(ano, mes, dia))

          return (
            <div
              key={iso}
              className="relative min-h-[62px] rounded-lg border p-1.5 transition"
              style={{
                borderColor: eHoje ? 'var(--color-ciano)' : 'var(--linha)',
                background: eHoje
                  ? 'rgba(0,224,246,.07)'
                  : doDia.length
                    ? 'var(--sup2)'
                    : 'transparent',
                opacity: fds && !doDia.length ? 0.45 : 1,
              }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className="num text-[10.5px] font-semibold"
                  style={{ color: eHoje ? 'var(--color-ciano)' : 'var(--tx3)' }}
                >
                  {dia}
                </span>
                {doDia.length > 1 && (
                  <span className="num text-[9px] font-semibold text-[var(--tx3)]">
                    {doDia.length}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {doDia.slice(0, 2).map((it) => {
                  const u = urgenciaDe(diasAte(it.data, hoje))
                  const cor =
                    u === 'vencido'
                      ? 'var(--tx3)'
                      : u === 'urgente'
                        ? 'var(--color-erro)'
                        : u === 'atencao'
                          ? 'var(--color-alerta)'
                          : 'var(--color-petrol-cla)'
                  return (
                    <button
                      key={it.id}
                      onClick={() => aoClicar?.(it.id)}
                      title={`${it.titulo}${it.detalhe ? ` — ${it.detalhe}` : ''}${it.firme ? '' : ' (data ainda não confirmada)'}`}
                      className="w-full truncate rounded px-1 py-[2px] text-left text-[9.5px] font-medium leading-tight transition hover:brightness-110"
                      style={{
                        fontFamily: 'var(--font-titulo)',
                        borderLeft: `2px solid ${cor}`,
                        background: 'var(--sup-h)',
                        color: 'var(--tx2)',
                        // Data não confirmada é tracejada — o olho vê que ainda pode mudar.
                        borderLeftStyle: it.firme ? 'solid' : 'dashed',
                      }}
                    >
                      {it.titulo}
                    </button>
                  )
                })}
                {doDia.length > 2 && (
                  <span className="px-1 text-[9px] text-[var(--tx3)]">+{doDia.length - 2}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </div>

      <p className="mt-3 text-[11px] text-[var(--tx2)]">
        {noMes.length === 0 ? (
          <>Nenhum prazo em {MES_NOME[mes - 1]}.</>
        ) : (
          <>
            <strong className="num text-[var(--tx)]">{noMes.length}</strong>{' '}
            {noMes.length === 1 ? 'prazo' : 'prazos'} em {MES_NOME[mes - 1]}.
          </>
        )}{' '}
        A borda tracejada marca data que ainda depende de confirmação.
      </p>
    </div>
  )
}
