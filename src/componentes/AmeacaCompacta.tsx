'use client'

/**
 * A ameaça em forma MINIMIZADA — o confronto em uma faixa.
 *
 * Pedido do Gui: *"X no meio com poucas infos como autarquia (país), classe e número de processo
 * além de nome + logo se tiver, é o que poderia ter de maneira minimizada para expandir se o
 * cliente quiser."*
 *
 * O que entra e por quê: aqui se responde **"isso me ameaça, e até quando eu posso agir?"**.
 * Nome, bandeira, classe e número são identidade — o mínimo para reconhecer o caso. O prazo é
 * o que decide ação, e por isso tem bloco próprio à direita, não uma etiqueta entre outras.
 * Especificação, dimensões e fundamento respondem "por quê?", e o porquê é do expandido.
 *
 * ⚠️ Cada lado ocupa a SUA metade e alinha para fora, com o × no centro. A primeira versão
 *    empurrava os dois para o meio e sobrava tela nas bordas — a mesma informação, ilegível
 *    por aperto num lugar e vazia no outro.
 *
 * ⛔ Logo só quando existe imagem de verdade. Para marca nominativa não se desenha logotipo:
 *    a skill do parecer é expressa — mostrar a tipografia como se fosse a identidade visual
 *    registrada induz a erro sobre o que está protegido. Medido: a imagem NÃO vem no XML da RPI
 *    (0 em 54,6 MB), então na prática ela só existe quando alguém subiu à mão.
 */

import Link from 'next/link'
import { Bandeira } from './Bandeira'
import type { AmeacaVista } from '@/lib/ameacas'
import { dataBr, diasAte, textoDias, urgenciaDe } from '@/lib/visao'
import { rotuloFirmeza } from '@/lib/rotulos'

const RISCO_ROTULO: Record<string, string> = {
  alto: 'Risco alto',
  medio: 'Risco médio',
  baixo: 'Risco baixo',
}
const RISCO_PILL: Record<string, string> = {
  alto: 'pill-neg',
  medio: 'pill-avi',
  baixo: 'pill-neu',
}
const MEDIDA_CURTA: Record<string, string> = {
  oposicao: 'Oposição',
  pan: 'Nulidade administrativa',
}

export function CardAmeacaCompacta({
  a,
  hoje,
  href,
  aoExpandir,
  expandido,
  semMoldura = false,
}: {
  a: AmeacaVista
  hoje: string
  /** quando dado, a faixa inteira vira link — usado na home e na ficha do ativo */
  href?: string
  /** quando dado, a faixa abre no lugar — usado na aba de ameaças */
  aoExpandir?: () => void
  expandido?: boolean
  /**
   * Dentro de outro cartão, a moldura própria vira cartão-em-cartão — duas bordas e duas
   * sombras para uma coisa só. Aqui ele fica com fundo e borda leves, e quem molda é o pai.
   */
  semMoldura?: boolean
}) {
  const dias = a.prazo ? diasAte(a.prazo.vence_em, hoje) : null
  const urg = dias === null ? null : urgenciaDe(dias)
  /*
   * A cor do prazo é RELÓGIO: branco enquanto há folga, âmbar quando aperta, vermelho quando
   * é agora. Vencido continua vermelho — apagar em cinza faria a perda parecer arquivamento.
   *
   * ⚠️ E a AUSÊNCIA de prazo não é tranquilidade: é pendência. Sai em âmbar, nunca em cinza —
   *    cinza lê-se como "nada a fazer aqui", que é o oposto do que a linha diz.
   */
  const corPrazo =
    dias === null
      ? 'var(--color-alerta)'
      : urg === 'vencido' || urg === 'urgente'
        ? 'var(--color-erro)'
        : urg === 'atencao'
          ? 'var(--color-alerta)'
          : 'var(--tx)'

  const fundoPrazo =
    dias === null || urg === 'atencao'
      ? 'rgba(230,138,0,.09)'
      : urg === 'vencido' || urg === 'urgente'
        ? 'rgba(192,57,43,.09)'
        : 'var(--sup2)'

  const bordaPrazo =
    dias === null || urg === 'atencao'
      ? 'rgba(230,138,0,.26)'
      : urg === 'vencido' || urg === 'urgente'
        ? 'rgba(192,57,43,.26)'
        : 'var(--linha)'

  const corpo = (
    <>
      {/* ── Faixa de cima: juízo à esquerda, identificação à direita ─────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`pill ${RISCO_PILL[a.risco] ?? 'pill-neu'}`}>
            {RISCO_ROTULO[a.risco] ?? a.risco}
          </span>
          <span className="pill pill-ok">{MEDIDA_CURTA[a.medida] ?? a.medida}</span>
        </div>
        <span className="num text-[10px] text-[var(--tx3)]">
          {a.caso_id} · RPI {a.gatilho.revista}
        </span>
      </div>

      {/* ── O confronto: cada lado na SUA metade, o × no centro.
             ⚠️ Com largura livre os dois lados iam para as bordas extremas e abria um vão no
                meio; sem limite nenhum eles se comprimiam no centro. O teto centralizado é o
                meio-termo: em tela larga o par respira sem se separar. ─────────────────── */}
      <div className="mx-auto flex max-w-[620px] items-center gap-2 px-4 py-3.5">
        <Lado
          nome={a.meu.nome}
          rotulo="seu ativo"
          jurisdicao={a.meu.jurisdicao}
          processo={a.meu.processo ?? undefined}
          classes={a.meu.classes}
          alinhar="esquerda"
        />

        {/* o × — convenção de confronto, lida antes de qualquer rótulo */}
        <span
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[14px] font-bold"
          style={{
            fontFamily: 'var(--font-titulo)',
            background: 'var(--sup2)',
            border: '1px solid var(--brd)',
            color: 'var(--tx2)',
          }}
          aria-label="contra"
        >
          ×
        </span>

        <Lado
          nome={a.terceiro.marca}
          rotulo={a.terceiro.titular}
          jurisdicao={a.terceiro.pais ?? 'BR'}
          processo={a.terceiro.processo}
          classes={a.terceiro.classes.map((c) => c.codigo)}
          alinhar="direita"
        />
      </div>

      {/* ── O PRAZO. Bloco próprio, não etiqueta: é o dado que decide ação. ─ */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5"
        style={{ borderColor: bordaPrazo, background: fundoPrazo, borderTopWidth: 1 }}
      >
        {a.prazo && dias !== null ? (
          <>
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span className="rotulo">prazo para agir</span>
              <span
                className="truncate text-[11.5px] font-medium text-[var(--tx2)]"
                title={a.prazo.fundamento}
              >
                {a.prazo.regua}
              </span>
              {/* A firmeza aparece SEMPRE, inclusive quando é boa. */}
              <span
                className={`pill ${a.prazo.firmeza === 'legal' ? 'pill-ok' : 'pill-avi'}`}
                title={
                  a.prazo.firmeza === 'legal'
                    ? 'data com dispositivo legal confirmado'
                    : 'régua ainda não confirmada pela casa'
                }
              >
                {rotuloFirmeza(a.prazo.firmeza)}
              </span>
            </span>
            <span className="flex flex-shrink-0 items-baseline gap-2.5">
              <span className="num-g text-[17px]" style={{ color: corPrazo }}>
                {textoDias(dias)}
              </span>
              <span className="num text-[12.5px] font-semibold text-[var(--tx2)]">
                {dataBr(a.prazo.vence_em)}
              </span>
            </span>
          </>
        ) : (
          <span className="flex flex-wrap items-center gap-2 text-[11.5px] leading-snug">
            <span className="rotulo" style={{ color: corPrazo }}>
              prazo para agir
            </span>
            <span style={{ color: corPrazo }}>
              ⚠ ainda não apurado —{' '}
              <strong>fale conosco antes de decidir</strong>
            </span>
          </span>
        )}
      </div>

      {/* ── Rodapé ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--linha)] px-4 py-2">
        <span className="num text-[10px] text-[var(--tx3)]">
          detectada em {dataBr(a.gatilho.data)}
          {a.gatilho.pagina ? ` · p. ${a.gatilho.pagina}` : ''}
        </span>
        <span
          className="text-[10.5px] font-semibold text-[var(--color-petrol-cla)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          {aoExpandir ? (expandido ? 'Recolher ▴' : 'Ver o confronto ▾') : 'Abrir o caso →'}
        </span>
      </div>
    </>
  )

  const moldura = semMoldura
    ? 'overflow-hidden rounded-xl border border-[var(--linha)] bg-[var(--sup2)] transition hover:border-[var(--brd)]'
    : 'card card-i overflow-hidden'

  if (aoExpandir) {
    return (
      <button onClick={aoExpandir} className={`${moldura} w-full text-left`} aria-expanded={expandido}>
        {corpo}
      </button>
    )
  }
  if (href) {
    return (
      <Link href={href} className={`${moldura} block`}>
        {corpo}
      </Link>
    )
  }
  return <div className={moldura}>{corpo}</div>
}

function Lado({
  nome,
  rotulo,
  jurisdicao,
  processo,
  classes,
  logo,
  alinhar,
}: {
  nome: string
  rotulo: string
  jurisdicao: string
  processo?: string
  classes: string[]
  /** só existe quando a marca é figurativa ou mista E há imagem guardada */
  logo?: string
  alinhar: 'esquerda' | 'direita'
}) {
  const dir = alinhar === 'direita' ? 'items-end text-right' : 'items-start text-left'
  const inv = alinhar === 'direita' ? 'flex-row-reverse' : ''
  return (
    <span className={`flex min-w-0 flex-1 flex-col justify-center gap-1 ${dir}`}>
      <span className={`flex w-full items-center gap-2.5 ${inv}`}>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="h-9 w-9 flex-shrink-0 rounded border border-[var(--linha)] object-contain"
          />
        )}
        <span
          className="min-w-0 truncate text-[19px] font-semibold leading-tight tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
          title={nome}
        >
          {nome}
        </span>
      </span>

      <span className={`flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ${inv}`}>
        <Bandeira j={jurisdicao} />
        {processo && <span className="num text-[var(--tx2)]">{processo}</span>}
        {classes.length > 0 && (
          <span className="num text-[var(--tx3)]">
            cl. {classes.slice(0, 3).join('·')}
            {classes.length > 3 ? '…' : ''}
          </span>
        )}
      </span>

      <span className="w-full truncate text-[10px] text-[var(--tx3)]" title={rotulo}>
        {rotulo}
      </span>
    </span>
  )
}
