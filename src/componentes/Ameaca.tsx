'use client'

/**
 * O choque: a sua marca contra a publicação do terceiro.
 *
 * A estrutura vem do parecer em PDF que a casa já emite, e a regra §5.1 dele é dura:
 * a comparação é UMA TABELA de linhas compartilhadas, nunca duas pilhas lado a lado.
 * Com pilhas independentes, "Data de depósito" de um lado cai na altura de "Situação"
 * do outro — o olho compara linhas que não são a mesma coisa, e a diferença de altura
 * entre as colunas vira assimetria que PARECE juízo ("o lado maior é o mais importante").
 * Em grid, células da mesma linha partilham a altura por definição.
 *
 * ⛔ O score cru nunca aparece. Verin × Vaerin tem fonético 100,00 e combinado 78,80,
 *    e é BAIXO porque a especificação é 0,00. Um cliente lendo "78,80" lê ameaça.
 *    O que se mostra é o juízo da pessoa e as dimensões em palavras.
 */

import Link from 'next/link'
import { Bandeira } from './Bandeira'
import { dataBr, diasAte, textoDias, urgenciaDe } from '@/lib/visao'
import type { AmeacaVista } from '@/lib/ameacas'
import { rotuloFirmeza } from '@/lib/rotulos'

export type { AmeacaVista }


const RISCO_ROTULO: Record<string, string> = { alto: 'Risco alto', medio: 'Risco médio', baixo: 'Risco baixo' }
const RISCO_PILL: Record<string, string> = { alto: 'pill-neg', medio: 'pill-avi', baixo: 'pill-neu' }
const MEDIDA_ROTULO: Record<string, string> = {
  oposicao: 'Oposição recomendada',
  pan: 'Nulidade administrativa recomendada',
}

export function CardAmeaca({ a, hoje, href }: { a: AmeacaVista; hoje: string; href?: string }) {
  const dias = a.prazo ? diasAte(a.prazo.vence_em, hoje) : null
  const urg = dias === null ? null : urgenciaDe(dias)

  return (
    <article className="card card-i overflow-hidden">
      {/* ── Cabeçalho: as DUAS etiquetas, lado a lado e nunca fundidas ───────── */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--linha)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* juízo humano — cor semântica */}
          <span className={`pill ${RISCO_PILL[a.risco] ?? 'pill-neu'}`}>
            {RISCO_ROTULO[a.risco] ?? a.risco}
          </span>
          {/* relógio — cor por proximidade, dimensão diferente */}
          {dias !== null && urg && (
            <span
              className={`pill ${urg === 'urgente' ? 'pill-neg' : urg === 'atencao' ? 'pill-avi' : 'pill-neu'}`}
              title={
                a.prazo
                  ? `${a.prazo.regua} · ${a.prazo.fundamento} · vence em ${dataBr(a.prazo.vence_em)}`
                  : undefined
              }
            >
              ◷ {textoDias(dias)}
            </span>
          )}
          <span className="pill pill-ok">{MEDIDA_ROTULO[a.medida] ?? a.medida}</span>
        </div>
        <span className="num text-[10px] text-[var(--tx3)]">
          {a.caso_id} · parecer de {dataBr(a.parecer_em)}
        </span>
      </header>

      {/* ── O choque: grid 2 × 4, linhas compartilhadas ──────────────────────── */}
      <div className="grid grid-cols-2">
        {/* linha 1 — cabeçalho das colunas */}
        <div
          className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-white"
          style={{ fontFamily: 'var(--font-titulo)', background: 'var(--color-petrol)' }}
        >
          Seu ativo
        </div>
        <div
          className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-white"
          style={{ fontFamily: 'var(--font-titulo)', background: 'var(--color-petrol-esc)' }}
        >
          Pedido de terceiro
        </div>

        {/* linha 2 — apresentação */}
        <div className="flex min-h-[74px] flex-col items-center justify-center gap-1 border-r border-[var(--linha)] px-4 py-3 text-center">
          <span
            className="text-[17px] font-semibold leading-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            {a.meu.nome}
          </span>
          <span className="text-[9.5px] text-[var(--tx3)]">representação nominativa</span>
        </div>
        <div className="flex min-h-[74px] flex-col items-center justify-center gap-1 px-4 py-3 text-center">
          <span
            className="text-[17px] font-semibold leading-tight text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            {a.terceiro.marca}
          </span>
          <span className="text-[9.5px] text-[var(--tx3)]">representação nominativa</span>
        </div>

        {/* linha 3 — dados processuais, na mesma ordem dos dois lados */}
        <dl className="space-y-1.5 border-r border-t border-[var(--linha)] px-4 py-3 text-[11.5px]">
          <Campo r="Processo" v={a.meu.processo ?? '—'} num />
          <Campo
            r="Jurisdição"
            v={
              <span className="inline-flex items-center gap-1.5">
                <Bandeira j={a.meu.jurisdicao} />
                {a.meu.jurisdicao}
              </span>
            }
          />
          <Campo r="Depósito" v={dataBr(a.meu.deposito)} num />
          <Campo r="Situação" v={a.meu.situacao ?? '—'} />
          <Campo r="Classes" v={a.meu.classes.join(' · ') || '—'} num />
        </dl>
        <dl className="space-y-1.5 border-t border-[var(--linha)] px-4 py-3 text-[11.5px]">
          <Campo r="Processo" v={a.terceiro.processo} num />
          <Campo
            r="Jurisdição"
            v={
              <span className="inline-flex items-center gap-1.5">
                <Bandeira j={a.terceiro.pais ?? 'BR'} />
                {a.terceiro.pais ?? 'BR'}
                {a.terceiro.uf ? ` · ${a.terceiro.uf}` : ''}
              </span>
            }
          />
          <Campo r="Depósito" v={dataBr(a.terceiro.deposito)} num />
          <Campo r="Titular" v={a.terceiro.titular} />
          <Campo
            r="Classes"
            v={a.terceiro.classes.map((c) => c.codigo).join(' · ') || '—'}
            num
          />
          {a.terceiro.apresentacao && <Campo r="Forma" v={a.terceiro.apresentacao} />}
        </dl>

        {/* linha 4 — produtos e serviços. É o campo que tem VETO sobre o score: dois sinais
            quase idênticos em mercados que não se encontram NÃO são conflito, e é aqui que o
            cliente vê isso com os próprios olhos, em vez de ter de confiar no nosso veredito. */}
        {(a.meu.especificacoes.some((e) => e.texto) ||
          a.terceiro.classes.some((c) => c.especificacao_bruta)) && (
          <>
            <div
              className="border-r border-t border-[var(--linha)] px-4 py-3"
              style={{ background: 'var(--sup-h)' }}
            >
              <div className="rotulo mb-1.5">Produtos e serviços</div>
              {a.meu.especificacoes.filter((e) => e.texto).length === 0 ? (
                <p className="text-[11px] text-[var(--tx3)]">não informado</p>
              ) : (
                a.meu.especificacoes
                  .filter((e) => e.texto)
                  .map((e) => (
                    <p key={e.codigo} className="text-[11.5px] leading-snug text-[var(--tx2)]">
                      <span className="num font-semibold text-[var(--tx)]">{e.codigo}</span>{' '}
                      {e.texto}
                    </p>
                  ))
              )}
            </div>
            <div
              className="border-t border-[var(--linha)] px-4 py-3"
              style={{ background: 'var(--sup-h)' }}
            >
              <div className="rotulo mb-1.5">Produtos e serviços</div>
              {a.terceiro.classes.filter((c) => c.especificacao_bruta).length === 0 ? (
                <p className="text-[11px] text-[var(--tx3)]">não informado</p>
              ) : (
                a.terceiro.classes
                  .filter((c) => c.especificacao_bruta)
                  .map((c) => (
                    <p key={c.codigo} className="text-[11.5px] leading-snug text-[var(--tx2)]">
                      <span className="num font-semibold text-[var(--tx)]">{c.codigo}</span>{' '}
                      {c.especificacao_bruta}
                    </p>
                  ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── O prazo para atuar. Pedido do Gui: "sempre buscar e trazer com destaque prazos
             para atuar". Fica DEPOIS do choque e ANTES do fundamento: antes de ver o choque a
             pessoa nem sabe do que se trata, e depois de vê-lo a primeira pergunta e' "ate quando
             eu posso agir?". ───────────────────────────────────────────────────────────────── */}
      {a.prazo ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"
          style={{
            borderColor: 'var(--linha)',
            background:
              urg === 'urgente'
                ? 'rgba(192,57,43,.07)'
                : urg === 'atencao'
                  ? 'rgba(230,138,0,.07)'
                  : 'var(--sup2)',
          }}
        >
          <div className="min-w-0">
            <div className="rotulo mb-0.5">Prazo para agir</div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className="text-[13px] font-semibold text-[var(--tx)]"
                style={{ fontFamily: 'var(--font-titulo)' }}
              >
                {a.prazo.regua}
              </span>
              {dias !== null && (
                <span
                  className={`pill ${urg === 'urgente' ? 'pill-neg' : urg === 'atencao' ? 'pill-avi' : 'pill-neu'}`}
                >
                  {textoDias(dias)}
                </span>
              )}
              {/* A firmeza aparece SEMPRE. Mostrá-la só quando é ruim faz da ausência da
                  pílula o código de "legal" — e ausência não se distingue de esquecimento. */}
              <span
                className={`pill ${a.prazo.firmeza === 'legal' ? 'pill-ok' : 'pill-avi'}`}
                title={
                  a.prazo.firmeza === 'legal'
                    ? 'data com dispositivo legal confirmado pela casa'
                    : 'a régua desta data ainda não foi confirmada pela casa'
                }
              >
                {rotuloFirmeza(a.prazo.firmeza)}
              </span>
            </div>
            <p className="mt-1 text-[10.5px] leading-snug text-[var(--tx2)]">
              {a.prazo.fundamento} · contado da publicação na RPI{' '}
              <span className="num">{a.gatilho.revista}</span>, de{' '}
              <span className="num">{dataBr(a.gatilho.data)}</span>
              {a.prazo.firmeza !== 'legal' &&
                ' · confirme esta data conosco antes de contar com ela'}
            </p>
          </div>
          <div className="text-right">
            <div className="rotulo">vence em</div>
            <div
              className="num-g text-[19px]"
              style={{
                color:
                  urg === 'urgente'
                    ? 'var(--color-erro)'
                    : urg === 'atencao'
                      ? 'var(--color-alerta)'
                      : 'var(--tx)',
              }}
            >
              {dataBr(a.prazo.vence_em)}
            </div>
          </div>
        </div>
      ) : (
        /* Sem prazo derivado nao se inventa data — mas tambem nao se cala: a AUSÊNCIA de prazo
           é informação, e o silêncio aqui seria lido como "nao ha urgencia". */
        <div className="border-t border-[var(--linha)] bg-[var(--sup2)] px-4 py-2.5">
          <span className="rotulo">Prazo para agir</span>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--tx2)]">
            Ainda não apuramos a data limite deste caso. A medida recomendada tem prazo legal
            próprio — <strong className="text-[var(--tx)]">fale conosco antes de decidir</strong>.
          </p>
        </div>
      )}

      {/* ── Dimensões da aproximação — em palavras, não em número ────────────── */}
      {a.dimensoes.length > 0 && (
        <div className="border-t border-[var(--linha)] px-4 py-3">
          <div className="rotulo mb-2">Quão perto está</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <tbody>
                {a.dimensoes.map((d) => (
                  <tr key={d.dimensao} className="align-top">
                    <td className="w-[110px] whitespace-nowrap py-1 pr-3 font-medium text-[var(--tx2)]">
                      {d.dimensao}
                    </td>
                    <td
                      className="w-[150px] py-1 pr-3 font-semibold text-[var(--tx)]"
                      style={{ fontFamily: 'var(--font-titulo)' }}
                    >
                      {d.avaliacao}
                    </td>
                    <td className="py-1 text-[var(--tx2)]">{d.fundamento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Rodapé: de onde veio e o que fazer ───────────────────────────────── */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--linha)] bg-[var(--sup2)] px-4 py-2.5">
        <span className="text-[10.5px] text-[var(--tx2)]">
          Detectada na{' '}
          <strong className="text-[var(--tx)]">
            RPI <span className="num">{a.gatilho.revista}</span>
          </strong>{' '}
          de <span className="num">{dataBr(a.gatilho.data)}</span>
          {a.gatilho.pagina && (
            <>
              , página <span className="num">{a.gatilho.pagina}</span>
            </>
          )}
          .
        </span>
        {/* ⛔ Daqui não se sai do sistema. O processo do terceiro abre em tela própria, dentro
            do painel, e é lá que existe o link de conferência no INPI — mandar o cliente para a
            consulta do INPI é mandá-lo para uma tela sem o contexto do parecer, da qual ele não
            volta. Decisão do Gui em 06/09. */}
        {href && (
          <Link
            href={href}
            className="text-[11px] font-semibold text-[var(--color-petrol-cla)] transition hover:brightness-125"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            Ver o seu ativo →
          </Link>
        )}
      </footer>
    </article>
  )
}

function Campo({ r, v, num }: { r: string; v: React.ReactNode; num?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[72px] flex-shrink-0 text-[10px] uppercase tracking-wide text-[var(--tx3)]" style={{ fontFamily: 'var(--font-titulo)' }}>
        {r}
      </dt>
      <dd className={`flex-1 text-[var(--tx)] ${num ? 'num' : ''}`}>{v}</dd>
    </div>
  )
}

/**
 * O bloco fixo que explica como uma ameaça chega até aqui. Fica visível SEMPRE,
 * inclusive quando a lista está vazia — a lista vazia é o estado mais comum
 * (medido: 3 aprovações em 19 casos de risco alto, ao longo de três revistas).
 *
 * ⛔ Não publica o funil ("analisamos 13.078, 7 eram altos, aprovamos 1"). Isso parece
 *    transparência e é o contrário: convida a perguntar pelos que não aparecem, e a
 *    resposta honesta destrói a confiança no portão.
 */
export function ComoChegaAqui() {
  return (
    <div className="nota">
      <strong className="text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
        Como uma ameaça chega aqui
      </strong>
      <p className="mt-1.5">
        Toda semana lemos a Revista da Propriedade Industrial do INPI inteira e cruzamos cada
        publicação nova contra os seus ativos. O cruzamento por computador levanta candidatos;{' '}
        <strong className="text-[var(--tx)]">quem decide é uma pessoa do escritório</strong>, que examina
        o caso e assina o parecer. Só o que essa pessoa aprova aparece nesta lista.
      </p>
      <p className="mt-1.5">
        Isso é de propósito: o cruzamento automático marca semelhanças que, olhadas de perto, não
        são conflito — marcas parecidas em mercados que não se encontram. Mandar essas a você seria
        alarme sem causa.
      </p>
      <p className="mt-1.5 text-[var(--tx)]">
        <strong>Nenhuma medida é protocolada sem a sua instrução.</strong>
      </p>
    </div>
  )
}
