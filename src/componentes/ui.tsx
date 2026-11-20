import Link from 'next/link'
import type { Firmeza } from '@/contrato/tipos'
import { dataBr } from '@/lib/tempo'

export function Cartao({
  titulo,
  acessorio,
  children,
}: {
  titulo?: string
  acessorio?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="card">
      {titulo && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--linha)] px-4 py-2.5">
          <h2
            className="text-[13px] font-semibold text-[var(--tx)]"
            style={{ fontFamily: 'var(--font-titulo)' }}
          >
            {titulo}
          </h2>
          {acessorio}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

/** Estado vazio que EXPLICA. Nunca uma tela em branco. */
export function Vazio({
  titulo,
  detalhe,
  acao,
}: {
  titulo: string
  detalhe?: string
  acao?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--brd)] px-6 py-10 text-center">
      <p
        className="text-[13.5px] font-medium text-[var(--tx)]"
        style={{ fontFamily: 'var(--font-titulo)' }}
      >
        {titulo}
      </p>
      {detalhe && (
        <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-[var(--tx2)]">
          {detalhe}
        </p>
      )}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

/** Tom semântico só em pill — é a regra da casa, e esta é a pill. */
export function Chip({
  children,
  tom = 'neutro',
  titulo,
}: {
  children: React.ReactNode
  tom?: 'neutro' | 'ok' | 'alerta' | 'erro' | 'info'
  titulo?: string
}) {
  const tons = {
    neutro: 'pill-neu',
    ok: 'pill-pos',
    alerta: 'pill-avi',
    erro: 'pill-neg',
    info: 'pill-ok',
  }
  return (
    <span title={titulo} className={`pill ${tons[tom]}`}>
      {children}
    </span>
  )
}

/**
 * Selo de firmeza do prazo.
 *
 * ⚠️ Existe porque NENHUM dispositivo legal está documentado na casa. A tela precisa dizer se a
 * data é lei, prática ou estimativa — senão o cliente lê "tudo em dia" sobre uma régua que
 * ninguém confirmou.
 */
export function SeloFirmeza({ firmeza }: { firmeza: Firmeza }) {
  const mapa: Record<Firmeza, { tom: 'ok' | 'info' | 'alerta' | 'neutro'; texto: string; titulo: string }> = {
    legal: { tom: 'ok', texto: 'Legal', titulo: 'Régua com dispositivo legal confirmado pela casa.' },
    praticado: {
      tom: 'info',
      texto: 'Praticado',
      titulo:
        'É o que o escritório faz hoje. O dies a quo ainda não foi confirmado — medido: 62 dias em 19 de 19 oposições, onde a lei diz 60.',
    },
    estimado: {
      tom: 'alerta',
      texto: 'Estimado',
      titulo:
        'Régua NÃO confirmada. Anuidade e prorrogação não têm regra escrita na casa — confira na fonte oficial antes de agir.',
    },
    informado: {
      tom: 'neutro',
      texto: 'Informado',
      titulo: 'Veio de agente ou cliente, sem régua própria.',
    },
  }
  const m = mapa[firmeza]
  return (
    <Chip tom={m.tom} titulo={m.titulo}>
      {m.texto}
    </Chip>
  )
}

/**
 * Carimbo de vigilância — POR ATIVO, nunca no rodapé.
 *
 * ⚠️ Um "atualizado em" único mentiria sobre 12,13% da carteira: o Brasil atualiza toda semana
 * pela RPI, a China só quando alguém digita.
 */
export function CarimboVigilancia({
  vigilancia,
}: {
  vigilancia: { ativa: boolean; motivo?: string; atualizado_em?: string; proxima_verificacao?: string }
}) {
  if (!vigilancia.ativa) {
    return (
      <Chip tom="alerta" titulo={vigilancia.motivo ?? 'Sem fonte automatizada para esta jurisdição.'}>
        Vigilância desligada
      </Chip>
    )
  }
  return (
    <Chip
      tom="ok"
      titulo={`Lido em ${dataBr(vigilancia.atualizado_em)}${
        vigilancia.proxima_verificacao
          ? ` · próxima verificação ${dataBr(vigilancia.proxima_verificacao)}`
          : ''
      }`}
    >
      Vigiado · {dataBr(vigilancia.atualizado_em)}
    </Chip>
  )
}

/** Aviso de completude: a lista diz quando é parcial, e por quê. */
export function AvisoCompletude({
  completo,
  motivo,
  n,
}: {
  completo: boolean
  motivo?: string
  n: number
}) {
  if (completo) return null
  return (
    <p
      className="mt-3 rounded-lg px-3 py-2 text-[11px] leading-snug"
      style={{
        background: 'rgba(230,138,0,.1)',
        border: '1px solid rgba(230,138,0,.24)',
        color: 'var(--color-alerta)',
      }}
    >
      ⚠️ Lista parcial ({n} {n === 1 ? 'registro' : 'registros'}). {motivo}
    </p>
  )
}

type Variante = 'primaria' | 'secundaria' | 'perigo'

export function Botao({
  children,
  onClick,
  variante = 'primaria',
  disabled,
  titulo,
  carregando = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  variante?: Variante
  disabled?: boolean
  titulo?: string
  /** Tarefa em andamento: mostra o ícone girando e trava o botão. */
  carregando?: boolean
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  const estilos: Record<Variante, React.CSSProperties> = {
    primaria: {
      background: 'linear-gradient(135deg,#2589A8,#1A6581)',
      color: '#fff',
      boxShadow: '0 2px 10px rgba(26,101,129,.35)',
    },
    secundaria: {
      background: 'var(--sup2)',
      color: 'var(--tx)',
      border: '1px solid var(--brd)',
    },
    perigo: {
      background: 'rgba(192,57,43,.12)',
      color: 'var(--color-erro)',
      border: '1px solid rgba(192,57,43,.3)',
    },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || carregando}
      title={titulo}
      aria-busy={carregando || undefined}
      className={base}
      style={{ fontFamily: 'var(--font-titulo)', ...estilos[variante] }}
    >
      {carregando && <Girando />}
      {children}
    </button>
  )
}

/**
 * Botão de voltar para a lista — o mesmo em todas as telas de detalhe.
 * É um link (navega), com cara de botão e sem sublinhado.
 */
export function BotaoVoltar({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--tx)] no-underline transition hover:border-[var(--color-ciano)] hover:bg-[var(--sup-h)]"
      style={{ fontFamily: 'var(--font-titulo)' }}
    >
      <span aria-hidden>←</span> {children}
    </Link>
  )
}

/** Ícone de carregamento: um arco que gira. Herda a cor do texto. */
export function Girando({ tamanho = 13 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="flex-shrink-0 animate-spin"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Botão só com ícone, para ações de linha de tabela. O nome da ação vai no `rotulo`: vira o
 * texto ao passar o mouse e o nome lido pelo leitor de tela (um ícone sozinho não diz nada).
 */
export function BotaoIcone({
  rotulo,
  onClick,
  variante = 'secundaria',
  disabled,
  carregando = false,
  children,
}: {
  rotulo: string
  onClick?: () => void
  variante?: 'secundaria' | 'perigo' | 'primaria'
  disabled?: boolean
  carregando?: boolean
  /** O ícone (um dos `Icone*` abaixo). */
  children: React.ReactNode
}) {
  const cores: Record<string, string> = {
    secundaria: 'border-[var(--brd)] text-[var(--tx2)] hover:border-[var(--color-ciano)] hover:text-[var(--tx)] hover:bg-[var(--sup-h)]',
    perigo: 'border-[rgba(192,57,43,.3)] text-[var(--color-erro)] hover:bg-[rgba(192,57,43,.12)]',
    primaria: 'border-[var(--color-petrol-cla)] text-[var(--color-petrol-cla)] hover:bg-[var(--sup-h)]',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || carregando}
      title={rotulo}
      aria-label={rotulo}
      aria-busy={carregando || undefined}
      className={`grid h-8 w-8 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${cores[variante]}`}
    >
      {carregando ? <Girando tamanho={14} /> : children}
    </button>
  )
}

const tracoIcone = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function IconeCadeado({ aberto = false }: { aberto?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden {...tracoIcone}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d={aberto ? 'M8 10.5V7a4 4 0 0 1 7.5-1.9' : 'M8 10.5V7a4 4 0 0 1 8 0v3.5'} />
    </svg>
  )
}

export function IconeChave() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden {...tracoIcone}>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12 20 3M16.5 6.5l2.5 2.5M14 9l2 2" />
    </svg>
  )
}

export function IconeLixeira() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden {...tracoIcone}>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />
    </svg>
  )
}

/**
 * Link só com ícone — o mesmo visual do <BotaoIcone />, para o que NAVEGA ou baixa (abrir um
 * arquivo, baixá-lo). O `rotulo` vira o texto do hover e o nome lido pelo leitor de tela.
 */
export function LinkIcone({
  href,
  rotulo,
  novaAba = false,
  baixar = false,
  children,
}: {
  href: string
  rotulo: string
  novaAba?: boolean
  /** Pede ao navegador para baixar em vez de abrir. */
  baixar?: boolean
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      title={rotulo}
      aria-label={rotulo}
      download={baixar || undefined}
      {...(novaAba ? { target: '_blank', rel: 'noopener' } : {})}
      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border border-[var(--brd)] text-[var(--color-petrol-cla)] transition hover:border-[var(--color-ciano)] hover:bg-[var(--sup-h)]"
    >
      {children}
    </a>
  )
}

export function IconeOlho() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden {...tracoIcone}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

export function IconeBaixar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden {...tracoIcone}>
      <path d="M12 4v11M7 10.5l5 5 5-5" />
      <path d="M4.5 19.5h15" />
    </svg>
  )
}
