'use client'

/**
 * O CASO aberto por dentro — o processo do terceiro no próprio sistema.
 *
 * Pedido do Gui: *"A ideia é que abra no próprio sistema para ver, com opção adicional de
 * 'ver no INPI' e não ir para lá direto."*
 *
 * Por que isso importa além da conveniência: mandar o cliente para a consulta do INPI é mandá-lo
 * para uma tela que não fala a língua dele, sem o contexto do parecer, e da qual ele não volta.
 * O que sabemos do pedido do terceiro já está aqui — veio da publicação oficial. O link externo
 * fica como conferência, no fim, para quem quiser a fonte.
 */

import { BotaoVoltar } from '@/componentes/ui'
import { Bandeira } from './Bandeira'
import { CardAmeaca } from './Ameaca'
import type { AmeacaVista } from '@/lib/ameacas'
import { rotuloJurisdicao } from '@/lib/rotulos'
import { dataBr } from '@/lib/visao'

/** Consulta pública do INPI pelo número do processo — base aberta, sem credencial. */
function urlInpi(processo: string): string {
  const n = processo.replace(/[^0-9]/g, '')
  return `https://busca.inpi.gov.br/pePI/servlet/MarcasServletController?Action=detail&CodPedido=${n}`
}

export function CasoAmeaca({
  a,
  hoje,
  hrefAtivo,
  hrefVoltar,
}: {
  a: AmeacaVista
  hoje: string
  hrefAtivo: string
  hrefVoltar: string
}) {
  return (
    <>
      <header>
        <BotaoVoltar href={hrefVoltar}>Voltar para Ameaças</BotaoVoltar>
        <h1
          className="mt-1.5 flex flex-wrap items-center gap-3 text-[21px] font-semibold tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          {a.meu.nome}
          <span
            className="grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold"
            style={{
              background: 'var(--sup2)',
              border: '1px solid var(--brd)',
              color: 'var(--tx2)',
            }}
          >
            ×
          </span>
          {a.terceiro.marca}
        </h1>
        <p className="mt-1 text-[12px] text-[var(--tx2)]">
          Caso <span className="num">{a.caso_id}</span> · parecer de{' '}
          <span className="num">{dataBr(a.parecer_em)}</span>
        </p>
      </header>

      {/* O confronto completo, que é o coração do caso. */}
      <div className="mt-5">
        <CardAmeaca a={a} hoje={hoje} href={hrefAtivo} />
      </div>

      <div className="mt-4">
        <ProcessoDoTerceiro a={a} />
      </div>

      <div className="nota mt-4">
        <strong className="text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
          Nenhuma medida é protocolada sem a sua instrução.
        </strong>{' '}
        Se quiser seguir com a medida recomendada, fale conosco — o prazo acima é o limite para a
        decisão.
      </div>
    </>
  )
}

/**
 * O processo do terceiro, por dentro — sem sair do sistema.
 *
 * Mora em componente próprio porque aparece em dois lugares: dentro do confronto expandido
 * (o caminho normal) e na tela do caso (o destino de um link de aviso). Mandar o cliente para
 * a consulta do INPI para ver isto seria mandá-lo a uma tela que não fala a língua dele, sem o
 * contexto do parecer, e da qual ele não volta. O link externo fica como conferência, no fim.
 */
export function ProcessoDoTerceiro({ a }: { a: AmeacaVista }) {
  const pais = a.terceiro.pais ?? 'BR'
  return (
      <section className="card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="sec">O processo do terceiro</h2>
          <span className="num text-[10.5px] text-[var(--tx3)]">
            publicado na RPI {a.gatilho.revista}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <dl className="flex flex-col gap-2 text-[12px]">
            <Campo r="Marca" v={a.terceiro.marca} forte />
            <Campo r="Processo" v={a.terceiro.processo} num />
            <Campo r="Titular" v={a.terceiro.titular} />
            <Campo
              r="Autarquia"
              v={
                <span className="inline-flex items-center gap-1.5">
                  <Bandeira j={pais} />
                  {rotuloJurisdicao(pais)}
                  {a.terceiro.uf ? ` · ${a.terceiro.uf}` : ''}
                </span>
              }
            />
          </dl>
          <dl className="flex flex-col gap-2 text-[12px]">
            <Campo r="Depósito" v={dataBr(a.terceiro.deposito)} num />
            {a.terceiro.apresentacao && <Campo r="Apresentação" v={a.terceiro.apresentacao} />}
            {a.terceiro.natureza && <Campo r="Natureza" v={a.terceiro.natureza} />}
            <Campo
              r="Classes"
              v={a.terceiro.classes.map((c) => c.codigo).join(' · ') || '—'}
              num
            />
          </dl>
        </div>

        {a.terceiro.classes.some((c) => c.especificacao_bruta) && (
          <div className="mt-4 border-t border-[var(--linha)] pt-3">
            <div className="rotulo mb-2">O que ele reivindica</div>
            {a.terceiro.classes
              .filter((c) => c.especificacao_bruta)
              .map((c) => (
                <p key={c.codigo} className="text-[11.5px] leading-relaxed text-[var(--tx2)]">
                  <span className="num font-semibold text-[var(--tx)]">Classe {c.codigo}</span>
                  {c.edicao_ncl && <span className="num text-[var(--tx3)]"> {c.edicao_ncl}</span>} —{' '}
                  {c.especificacao_bruta}
                </p>
              ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--linha)] pt-3">
          {pais === 'BR' ? (
            <a
              href={urlInpi(a.terceiro.processo)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[var(--brd)] px-3 py-1.5 text-[11px] font-semibold text-[var(--tx2)] transition hover:border-[var(--brd-forte)] hover:text-[var(--tx)]"
              style={{ fontFamily: 'var(--font-titulo)' }}
            >
              Conferir no INPI ↗
            </a>
          ) : (
            <span className="text-[11px] text-[var(--tx3)]">
              Consulta pública desta autarquia não integrada — os dados acima vêm da publicação
              oficial recebida.
            </span>
          )}
          <span className="text-[10.5px] text-[var(--tx3)]">
            Os dados desta ficha vieram da publicação oficial; o link abre a fonte.
          </span>
        </div>
      </section>

  )
}

function Campo({
  r,
  v,
  num,
  forte,
}: {
  r: string
  v: React.ReactNode
  num?: boolean
  forte?: boolean
}) {
  return (
    <div className="flex gap-3">
      <dt
        className="w-[88px] flex-shrink-0 text-[10px] uppercase tracking-wide text-[var(--tx3)]"
        style={{ fontFamily: 'var(--font-titulo)' }}
      >
        {r}
      </dt>
      <dd
        className={`flex-1 text-[var(--tx)] ${num ? 'num' : ''} ${forte ? 'font-semibold' : ''}`}
        style={forte ? { fontFamily: 'var(--font-titulo)' } : undefined}
      >
        {v}
      </dd>
    </div>
  )
}
