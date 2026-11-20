'use client'

/**
 * Ficha do ativo em tela cheia — abre ao clicar numa linha da tabela de Ativos.
 *
 * Sobe ao abrir e desce ao fechar (transform + transition, 320 ms). Fecha no ✕, no Esc e no
 * "Abrir página completa" (que navega). Enquanto aberta, a página de trás não rola.
 *
 * Mostra tudo o que o pacote sabe do ativo, sem nada calculado aqui que a tela de Ativos ou a
 * de detalhe não calculem: identificação, datas, pessoas por papel, classes, prazos,
 * vigilância e pendências. No celular as seções empilham numa coluna só.
 */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { Pacote } from '@/contrato/tipos'
import { CarimboVigilancia, Chip } from '@/componentes/ui'
import { BandeiraRotulo } from '@/componentes/Bandeira'
import { dataBr } from '@/lib/tempo'
import { rotuloEspecie, rotuloFonte, rotuloPapel } from '@/lib/rotulos'
import { ESTADO_PRAZO_ROTULO, estadoDoPrazo } from '@/lib/visao'

type Ativo = Pacote['ativos'][number]

const DURACAO_MS = 320

const PENDENCIA_ROTULO: Record<string, string> = {
  sem_numero: 'Sem número do INPI',
  titular_anonimo: 'Titular não identificado',
  classe_inferida: 'Classe inferida, não confirmada',
  imagem_ausente: 'Imagem da marca ausente',
  especificacao_ausente: 'Especificação ausente',
  outro: 'Outra pendência',
}

const maiuscula = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export function FichaAtivo({
  ativo,
  pacote,
  hoje,
  aoFechar,
}: {
  /** `null` = fechada. Trocar de ativo com a ficha aberta só troca o conteúdo. */
  ativo: Ativo | null
  pacote: Pacote
  hoje: string
  aoFechar: () => void
}) {
  // O ativo continua desenhado durante a descida, mesmo depois de o pai já ter mandado null.
  /*
   * ⚠️ `desenhado` e `subiu` só mudam dentro de rAF/timeout, NUNCA durante o render — ver a
   *    explicação em Confirmacao.tsx (um desligar pendente apagava o ligar do clique seguinte).
   */
  // O último ativo aberto: continua desenhado durante a descida, depois que o pai mandou null.
  const [ultimo, setUltimo] = useState<Ativo | null>(ativo)
  const [desenhado, setDesenhado] = useState(false)
  const [subiu, setSubiu] = useState(false)
  const jaAbriu = useRef(false)
  const rolagem = useRef<HTMLDivElement>(null)

  // Ativo novo chegou: guarda (padrão "ajustar estado no render"; nenhum timer toca em `ultimo`).
  if (ativo && ativo !== ultimo) setUltimo(ativo)
  const mostrado = ativo ?? (desenhado ? ultimo : null)
  // Na tela só enquanto o pai mantém aberto; ao fechar, a descida começa no mesmo instante.
  const visivel = subiu && ativo !== null

  useEffect(() => {
    if (ativo) {
      jaAbriu.current = true
      rolagem.current?.scrollTo({ top: 0 })
      // Dois quadros: o primeiro monta embaixo, o segundo dispara a subida.
      let q2 = 0
      const q1 = requestAnimationFrame(() => {
        q2 = requestAnimationFrame(() => {
          setSubiu(true)
          setDesenhado(true)
        })
      })
      return () => {
        cancelAnimationFrame(q1)
        cancelAnimationFrame(q2)
      }
    }
    // Nunca abriu: não há descida para animar.
    if (!jaAbriu.current) return
    // Desmonta só depois que a descida terminou.
    const t = setTimeout(() => {
      setSubiu(false)
      setDesenhado(false)
    }, DURACAO_MS)
    return () => clearTimeout(t)
  }, [ativo])

  // Esc fecha; a página de trás fica parada enquanto a ficha está na tela.
  useEffect(() => {
    if (!mostrado) return
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', tecla)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', tecla)
    }
  }, [mostrado, aoFechar])

  if (!mostrado) return null
  const a = mostrado

  const nomes = new Map(pacote.pessoas.map((p) => [p.pessoa_id, p.nome]))
  const porPapel = new Map<string, string[]>()
  for (const v of pacote.vinculos) {
    if (v.ativo_id !== a.ativo_id) continue
    porPapel.set(v.papel, [...(porPapel.get(v.papel) ?? []), nomes.get(v.pessoa_id) ?? '(desconhecido)'])
  }
  const prazos = pacote.prazos
    .filter((p) => p.ativo_id === a.ativo_id)
    .sort((x, y) => x.vence_em.localeCompare(y.vence_em))
  const nome = a.marca?.nome ?? a.patente?.titulo ?? '(sem nome)'

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Ficha de ${nome}`}>
      {/* Fundo escurecido: aparece e some junto com a ficha. */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity ease-out"
        style={{ opacity: visivel ? 1 : 0, transitionDuration: `${DURACAO_MS}ms` }}
        onClick={aoFechar}
      />

      <div
        className="absolute inset-0 flex flex-col overflow-hidden shadow-2xl sm:inset-x-3 sm:top-4 sm:bottom-0 sm:rounded-t-2xl"
        style={{
          background: 'var(--fundo)',
          border: '1px solid var(--brd)',
          transform: visivel ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${DURACAO_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        }}
      >
        {/* ── Cabeçalho fixo ─────────────────────────────────────────────── */}
        <header className="flex items-start gap-3 border-b border-[var(--linha)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="rotulo">{rotuloEspecie(a.especie)}</p>
            <h2
              className="mt-0.5 break-words text-[18px] font-semibold leading-tight tracking-tight text-[var(--tx)] sm:text-[21px]"
              style={{ fontFamily: 'var(--font-titulo)' }}
            >
              {nome}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--tx2)]">
              <BandeiraRotulo j={a.jurisdicao} />
              <span>·</span>
              <span>{a.situacao.texto}</span>
            </div>
          </div>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-[var(--brd)] text-[16px] text-[var(--tx2)] transition hover:bg-[var(--sup-h)] hover:text-[var(--tx)]"
          >
            ✕
          </button>
        </header>

        {/* ── Conteúdo rolável ───────────────────────────────────────────── */}
        <div ref={rolagem} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto grid max-w-[1100px] gap-3 md:grid-cols-2">
            <Secao titulo="Identificação">
              <Campo rotulo="Espécie" valor={rotuloEspecie(a.especie)} />
              <Campo rotulo="Jurisdição" valor={<BandeiraRotulo j={a.jurisdicao} />} />
              {a.identificadores.length === 0 ? (
                <Campo rotulo="Número" valor={<Chip tom="alerta">Sem número</Chip>} />
              ) : (
                a.identificadores.map((i) => (
                  <Campo
                    key={`${i.papel}-${i.valor_normalizado}`}
                    rotulo={`Número (${i.papel})`}
                    valor={<span className="tabular">{i.valor_normalizado}</span>}
                  />
                ))
              )}
              {a.marca?.apresentacao && <Campo rotulo="Apresentação" valor={maiuscula(a.marca.apresentacao)} />}
              {a.marca?.natureza && <Campo rotulo="Natureza" valor={maiuscula(a.marca.natureza)} />}
              <Campo rotulo="Fonte" valor={rotuloFonte(a.fonte)} />
            </Secao>

            <Secao titulo="Situação e datas">
              <Campo rotulo="Situação" valor={a.situacao.texto} />
              <Campo rotulo="Depósito" valor={dataBr(a.datas.deposito)} />
              <Campo rotulo="Publicação" valor={dataBr(a.datas.publicacao)} />
              <Campo rotulo="Concessão" valor={dataBr(a.datas.concessao)} />
              <Campo rotulo="Vigência até" valor={dataBr(a.datas.vigencia_ate)} />
            </Secao>

            <Secao titulo="Pessoas">
              {porPapel.size === 0 ? (
                <Vazio>Nenhuma pessoa vinculada.</Vazio>
              ) : (
                [...porPapel].map(([papel, lista]) => (
                  <Campo key={papel} rotulo={maiuscula(rotuloPapel(papel))} valor={lista.join(' · ')} />
                ))
              )}
            </Secao>

            <Secao titulo="Vigilância">
              <Campo rotulo="Estado" valor={<CarimboVigilancia vigilancia={a.vigilancia} />} />
              {a.vigilancia.motivo && <Campo rotulo="Motivo" valor={a.vigilancia.motivo} />}
              {a.vigilancia.proxima_verificacao && (
                <Campo rotulo="Próxima leitura" valor={dataBr(a.vigilancia.proxima_verificacao)} />
              )}
            </Secao>

            {a.marca && (
              <Secao titulo={`Classes (${a.marca.classes.length})`} largo>
                {a.marca.classes.length === 0 ? (
                  <Vazio>Nenhuma classe registrada.</Vazio>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {a.marca.classes.map((c, i) => (
                      <li key={`${c.codigo}-${i}`} className="rounded-lg border border-[var(--linha)] px-3 py-2">
                        <span className="text-[12px] font-semibold text-[var(--tx)]">Classe {c.codigo}</span>
                        {c.edicao_ncl && <span className="ml-2 text-[10.5px] text-[var(--tx3)]">NCL {c.edicao_ncl}</span>}
                        {c.especificacao_bruta && (
                          <p className="mt-1 text-[11.5px] leading-snug text-[var(--tx2)]">{c.especificacao_bruta}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Secao>
            )}

            {a.patente && (
              <Secao titulo="Patente" largo>
                {a.patente.titulo && <Campo rotulo="Título" valor={a.patente.titulo} />}
                {a.patente.ipc?.length ? <Campo rotulo="IPC" valor={a.patente.ipc.join(' · ')} /> : null}
                {a.patente.inventores?.length ? (
                  <Campo rotulo="Inventores" valor={a.patente.inventores.join(' · ')} />
                ) : null}
                {a.patente.pct && <Campo rotulo="PCT" valor={`${a.patente.pct.numero} · ${dataBr(a.patente.pct.data)}`} />}
                {a.patente.prioridades?.map((p) => (
                  <Campo key={p.numero} rotulo="Prioridade" valor={`${p.pais} ${p.numero} · ${dataBr(p.data)}`} />
                ))}
              </Secao>
            )}

            <Secao titulo={`Prazos (${prazos.length})`} largo>
              {prazos.length === 0 ? (
                <Vazio>Nenhum prazo para este ativo.</Vazio>
              ) : (
                <ul className="flex flex-col gap-2">
                  {prazos.map((p) => {
                    const estado = estadoDoPrazo(p, hoje)
                    return (
                      <li
                        key={p.prazo_id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--linha)] px-3 py-2"
                      >
                        <span className="min-w-0 text-[12px] text-[var(--tx)]">{p.regua.nome}</span>
                        <span className="flex items-center gap-2 text-[11.5px] text-[var(--tx2)]">
                          <span className="tabular">Vence {dataBr(p.vence_em)}</span>
                          <Chip tom={estado === 'vencido' ? 'erro' : estado === 'cumprido' ? 'ok' : estado === 'aberto' ? 'alerta' : 'neutro'}>
                            {maiuscula(ESTADO_PRAZO_ROTULO[estado])}
                          </Chip>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Secao>

            {a.pendencias.length > 0 && (
              <Secao titulo={`Pendências (${a.pendencias.length})`} largo>
                <ul className="flex flex-col gap-1.5">
                  {a.pendencias.map((p, i) => (
                    <li key={i} className="text-[12px] text-[var(--tx)]">
                      <Chip tom="alerta">{PENDENCIA_ROTULO[p.tipo] ?? p.tipo}</Chip>
                      {p.detalhe && <span className="ml-2 text-[var(--tx2)]">{p.detalhe}</span>}
                    </li>
                  ))}
                </ul>
              </Secao>
            )}
          </div>
        </div>

        {/* ── Rodapé ─────────────────────────────────────────────────────── */}
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--linha)] px-4 py-3 sm:px-6">
          <button
            onClick={aoFechar}
            className="rounded-lg border border-[var(--brd)] px-4 py-2 text-[12px] text-[var(--tx2)] transition hover:text-[var(--tx)]"
          >
            Fechar
          </button>
          <Link
            href={`/assets/${a.ativo_id}`}
            className="rounded-lg px-4 py-2 text-[12px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#2589A8,#1A6581)' }}
          >
            Abrir página completa
          </Link>
        </footer>
      </div>
    </div>
  )
}

function Secao({ titulo, largo, children }: { titulo: string; largo?: boolean; children: React.ReactNode }) {
  return (
    <section className={`card p-4 ${largo ? 'md:col-span-2' : ''}`}>
      <h3 className="rotulo mb-2.5">{titulo}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

/** Rótulo em cima e valor embaixo no celular; lado a lado a partir de 640 px. */
function Campo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="text-[10.5px] text-[var(--tx3)] sm:w-[130px] sm:flex-shrink-0">{rotulo}</span>
      <span className="min-w-0 break-words text-[12.5px] text-[var(--tx)]">{valor}</span>
    </div>
  )
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-[var(--tx3)]">{children}</p>
}
