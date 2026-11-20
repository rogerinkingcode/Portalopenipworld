'use client'

/**
 * A casca: sidebar fixa + área de conteúdo.
 *
 * A sidebar substitui a barra de abas horizontal — decisão do Gui, e é o que o BI já faz
 * desde o redesign de 17/06. Fundo: o degradê C+D do manual de marca (p.21, "+ usado"),
 * na mesma execução do BI e do Papi.
 *
 * Há DUAS visões, e a sidebar troca de conteúdo entre elas:
 *   gestor  — toda a base, todos os clientes. É a ferramenta interna.
 *   portal  — a experiência de UM cliente, alimentada pela projeção auditada.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ROTULO_PERFIL, useSessao } from './EstadoSessao'
import { useArmazenado } from '@/lib/armazenado'
import { Avatar } from './Avatar'

type Item = {
  href: string
  rotulo: string
  icone: string
  grupo?: string
  beta?: boolean
}

const GESTOR: Item[] = [
  { href: '/', rotulo: 'Painel', icone: '◧', grupo: 'Carteira' },
  { href: '/assets', rotulo: 'Ativos', icone: '◈' },
  /* Prazos antes de Ameaças (decisão do Gui): prazo tem relógio, ameaça não — e a mesma
     ordem já vale no portal, então as duas sidebars deixam de se contradizer. */
  { href: '/deadlines', rotulo: 'Prazos', icone: '◷' },
  { href: '/threats', rotulo: 'Ameaças', icone: '⚑' },
  { href: '/documents', rotulo: 'Documentos', icone: '▤' },
  { href: '/clients', rotulo: 'Clientes', icone: '◫', grupo: 'Cadastro' },
  { href: '/people', rotulo: 'Pessoas', icone: '◍' },
  { href: '/reconciliation', rotulo: 'Conciliação', icone: '⇄' },
  /* Comunicados é só do gestor: o cliente vê o EFEITO do aviso, não o registro do envio. */
  {
    href: '/communications',
    rotulo: 'Comunicados',
    icone: '✉',
    grupo: 'Beta',
    beta: true,
  },
  { href: '/intelligence', rotulo: 'Inteligência', icone: '◎', beta: true },
  { href: '/investments', rotulo: 'Investimentos', icone: '◱', beta: true },
  { href: '/import', rotulo: 'Importar', icone: '↥', grupo: 'Dados' },
  { href: '/export', rotulo: 'Exportar', icone: '↧' },
  /* Histórico de quem fez o quê: a equipe inteira vê (o cliente nunca — o menu dele é o PORTAL). */
  { href: '/activity', rotulo: 'Atividades', icone: '◔' },
]

/* Só o admin gere os logins — inclusive os dos clientes, ligados à pessoa da carteira. */
/* O operador da plataforma (multi-tenant) só administra as empresas: não vê carteira nenhuma. */
const PLATAFORMA: Item[] = [{ href: '/platform', rotulo: 'Empresas', icone: '▦', grupo: 'Plataforma' }]

const ADMIN: Item[] = [
  { href: '/users', rotulo: 'Usuários', icone: '⚿', grupo: 'Acesso' },
  { href: '/integrations', rotulo: 'Integrações', icone: '⇆' },
  /* O admin da empresa leva para fora o banco e os arquivos dela. */
  { href: '/backup', rotulo: 'Backup', icone: '⤓' },
]

const PORTAL: Item[] = [
  { href: '/portal', rotulo: 'Meu portfólio', icone: '◧', grupo: 'Cliente' },
  { href: '/portal/assets', rotulo: 'Meus ativos', icone: '◈' },
  { href: '/portal/deadlines', rotulo: 'Prazos', icone: '◷' },
  { href: '/portal/threats', rotulo: 'Ameaças', icone: '⚑' },
  { href: '/portal/documents', rotulo: 'Documentos', icone: '▤' },
  { href: '/portal/history', rotulo: 'Histórico', icone: '≡' },
  {
    href: '/portal/intelligence',
    rotulo: 'Inteligência',
    icone: '◎',
    grupo: 'Beta',
    beta: true,
  },
  { href: '/portal/investments', rotulo: 'Investimentos', icone: '◱', beta: true },
]

export function Casca({ children }: { children: React.ReactNode }) {
  const caminho = usePathname()
  // A tela de login é a única sem barra lateral: ninguém entrou ainda.
  if (caminho === '/login') return <>{children}</>
  return <CascaLogada caminho={caminho}>{children}</CascaLogada>
}

function CascaLogada({ caminho, children }: { caminho: string; children: React.ReactNode }) {
  const { usuario, ehEquipe, sair } = useSessao()
  const [temaSalvo, gravarTema] = useArmazenado('apex-tema', 'escuro')
  const [recolhidaSalva, gravarRecolhida] = useArmazenado('apex-side', 'nao')
  // Telas estreitas forçam o recolhimento sem apagar a escolha da pessoa.
  const [estreita, setEstreita] = useState(false)
  // A dica do menu recolhido: o nome da página ao lado do ícone (ver <DicaMenu />).
  const [dica, setDica] = useState<{
    texto: string
    nota?: string
    y: number
    x: number
  } | null>(null)

  const tema: 'claro' | 'escuro' = temaSalvo === 'claro' ? 'claro' : 'escuro'
  const recolhida = estreita || recolhidaSalva === 'sim'

  const noPortal = caminho.startsWith('/portal')
  const ehOperador = usuario?.role === 'operador'
  const itens = ehOperador ? PLATAFORMA : noPortal ? PORTAL : usuario?.role === 'admin' ? [...GESTOR, ...ADMIN] : GESTOR

  /*
   * Em tela estreita a sidebar recolhe sozinha: 232px num aparelho de 390 comem 60% da
   * largura. O corte de 860px é o mesmo do BI. Isto é sincronização com um sistema externo
   * de verdade (a largura da janela), então efeito é o lugar certo — e a escolha da pessoa
   * continua guardada, porque o automático só força o recolhimento, nunca a abertura.
   */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    const aplicar = () => setEstreita(mq.matches)
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])

  // O tema é atributo do documento — escrever nele É sincronizar com sistema externo.
  useEffect(() => {
    document.documentElement.dataset.tema = tema
  }, [tema])

  function alternarRecolhida() {
    gravarRecolhida(recolhida ? 'nao' : 'sim')
  }

  const larg = recolhida ? 64 : 232

  /*
   * Um ouvinte só, no <aside>: qualquer elemento com `data-dica` mostra o balão ao receber o
   * mouse ou o foco do teclado. Com o menu aberto o nome já está escrito, então só os itens
   * com nota (as telas beta) ainda explicam algo.
   */
  function mostrarDica(alvo: EventTarget | null) {
    const el = (alvo as HTMLElement | null)?.closest<HTMLElement>('[data-dica]')
    if (!el) return setDica(null)
    const nota = el.dataset.dicaNota
    if (!recolhida && !nota) return setDica(null)
    const r = el.getBoundingClientRect()
    setDica({
      texto: el.dataset.dica!,
      nota,
      y: r.top + r.height / 2,
      x: r.right + 10,
    })
  }

  return (
    <>
      <aside
        className="side"
        data-recolhida={recolhida ? 'sim' : 'nao'}
        onMouseOver={(e) => mostrarDica(e.target)}
        onMouseLeave={() => setDica(null)}
        onFocus={(e) => mostrarDica(e.target)}
        onBlur={() => setDica(null)}
        onScroll={() => setDica(null)}
      >
        {/* ── Marca ─────────────────────────────────────────────────────── */}
        <Link
          href={ehOperador ? '/platform' : noPortal ? '/portal' : '/'}
          className="relative mb-1 flex items-center gap-2.5 px-1.5 py-1"
        >
          <span
            className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-[13px] font-bold text-[#08171d]"
            style={{
              background: 'linear-gradient(135deg,#00E0F6,#1A6581)',
              boxShadow: '0 4px 14px rgba(0,224,246,.28)',
              fontFamily: 'var(--font-titulo)',
            }}
          >
            A
          </span>
          {!recolhida && (
            <span className="side-texto leading-tight">
              <span
                className="block text-[14.5px] font-semibold tracking-tight text-white"
                style={{ fontFamily: 'var(--font-titulo)' }}
              >
                OpenIpWorld
              </span>
              <span className="block text-[8.5px] uppercase tracking-[.12em] text-[rgba(0,224,246,.62)]">
                Propriedade Intelectual
              </span>
            </span>
          )}
        </Link>

        {/* ── Alternador de visão — só a equipe tem as duas; o cliente só tem o portal ── */}
        {!ehEquipe ? null : !recolhida ? (
          <div
            className="side-texto mb-1 mt-3 flex gap-1 rounded-lg p-[3px]"
            style={{
              background: 'rgba(0,0,0,.22)',
              border: '1px solid rgba(0,224,246,.12)',
            }}
          >
            <Visao href="/" ativo={!noPortal} rotulo="Gestor" />
            <Visao href="/portal" ativo={noPortal} rotulo="Cliente" />
          </div>
        ) : (
          <Link
            href={noPortal ? '/' : '/portal'}
            className="side-item mt-2"
            data-dica={noPortal ? 'Ir para a visão do gestor' : 'Ir para a visão do cliente'}
            aria-label={noPortal ? 'Ir para a visão do gestor' : 'Ir para a visão do cliente'}
          >
            <span className="side-icone">{noPortal ? '⚗' : '☰'}</span>
          </Link>
        )}

        {/* ── Navegação ─────────────────────────────────────────────────── */}
        <nav className="relative mt-1 flex flex-col gap-[3px]">
          {itens.map((it) => {
            const raiz = noPortal ? '/portal' : '/'
            const ativo = it.href === raiz ? caminho === it.href : caminho.startsWith(it.href)
            /* Telas beta ficam visíveis no menu, mas trancadas: ninguém entra por enquanto.
               O proxy também barra a URL digitada direto (ver ROTAS_BETA em proxy.ts). */
            const conteudo = (
              <>
                <span className="side-icone" aria-hidden>
                  {it.icone}
                </span>
                <span className="side-texto flex-1">{it.rotulo}</span>
                {/* A marca de beta fica NO MENU, não só dentro da tela: quem clica precisa
                      saber antes de entrar que aquilo ainda não é dado de produção. */}
                {it.beta && (
                  <span
                    className="side-texto rounded px-1 py-[1px] text-[7.5px] font-bold uppercase tracking-[.08em]"
                    style={{
                      fontFamily: 'var(--font-titulo)',
                      background: 'rgba(230,138,0,.18)',
                      color: 'rgba(255,190,90,.92)',
                    }}
                  >
                    beta
                  </span>
                )}
              </>
            )
            return (
              <div key={it.href}>
                {it.grupo && <div className="side-grupo">{it.grupo}</div>}
                {it.beta ? (
                  <span
                    className="side-item"
                    data-ativo="nao"
                    aria-disabled
                    data-dica={it.rotulo}
                    aria-label={it.rotulo}
                    data-dica-nota="Em construção, ainda sem acesso"
                    style={{ opacity: 0.45, cursor: 'not-allowed' }}
                  >
                    {conteudo}
                  </span>
                ) : (
                  <Link
                    href={it.href}
                    className="side-item"
                    data-ativo={ativo ? 'sim' : 'nao'}
                    data-dica={it.rotulo}
                    aria-label={it.rotulo}
                  >
                    {conteudo}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        {/* ── Rodapé ────────────────────────────────────────────────────── */}
        <div className="relative mt-auto flex flex-col gap-1 pt-4">
          <button
            onClick={() => gravarTema(tema === 'escuro' ? 'claro' : 'escuro')}
            className="side-item w-full"
            data-dica={tema === 'escuro' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
            aria-label={tema === 'escuro' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
          >
            <span className="side-icone" aria-hidden>
              {tema === 'escuro' ? '☀' : '☾'}
            </span>
            <span className="side-texto">{tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}</span>
          </button>
          <button
            onClick={() => {
              setDica(null)
              alternarRecolhida()
            }}
            className="side-item w-full"
            data-dica={recolhida ? 'Abrir o menu' : 'Recolher o menu'}
            aria-label={recolhida ? 'Abrir o menu' : 'Recolher o menu'}
          >
            <span className="side-icone" aria-hidden>
              {recolhida ? '»' : '«'}
            </span>
            <span className="side-texto">Recolher</span>
          </button>
          <button
            onClick={() => void sair()}
            className="side-item w-full"
            data-dica="Sair"
            aria-label="Sair"
          >
            <span className="side-icone" aria-hidden>
              ⏻
            </span>
            <span className="side-texto">Sair</span>
          </button>
          {/* O cartão de quem está logado: foto (ou o boneco padrão), nome e perfil. Leva ao
              "Meu perfil" — no portal, ao do portal, porque o cliente só navega lá dentro. */}
          {usuario && (
            <Link
              href={ehOperador ? '/platform' : noPortal ? '/portal/profile' : '/profile'}
              className="side-item mt-2 w-full"
              data-ativo={caminho === '/profile' || caminho === '/portal/profile' ? 'sim' : 'nao'}
              data-dica="Meu perfil"
              aria-label="Meu perfil"
            >
              <Avatar
                usuarioId={usuario.id}
                fotoSha256={usuario.fotoSha256}
                nome={`${usuario.firstName} ${usuario.lastName}`.trim()}
                tamanho={recolhida ? 30 : 28}
                anel
              />
              <span className="side-texto min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[11.5px] font-semibold text-[rgba(232,237,239,.9)]">
                  {usuario.firstName} {usuario.lastName}
                </span>
                <span className="block truncate text-[9.5px] text-[rgba(232,237,239,.5)]">{ROTULO_PERFIL[usuario.role]}</span>
              </span>
            </Link>
          )}

        </div>
      </aside>

      {dica && <DicaMenu {...dica} />}

      <div className="conteudo" style={{ marginLeft: larg, transition: 'margin-left .18s ease' }}>
        <main className="mx-auto w-full max-w-[1480px] px-5 py-6 sm:px-7">{children}</main>
      </div>
    </>
  )
}

function Visao({ href, ativo, rotulo }: { href: string; ativo: boolean; rotulo: string }) {
  return (
    <Link
      href={href}
      className="flex-1 rounded-md py-[5px] text-center text-[10.5px] font-semibold transition"
      style={{
        fontFamily: 'var(--font-titulo)',
        background: ativo ? 'linear-gradient(180deg,#2589A8,#1A6581)' : 'transparent',
        color: ativo ? '#fff' : 'rgba(232,237,239,.6)',
        boxShadow: ativo ? '0 1px 3px rgba(0,0,0,.35)' : 'none',
      }}
    >
      {rotulo}
    </Link>
  )
}

/**
 * O balão ao lado do ícone. Vai para o <body> por portal: a sidebar tem overflow escondido e
 * cortaria qualquer coisa que passasse da sua borda. A entrada é animação de CSS (`dica-entra`),
 * que roda sozinha a cada montagem — sem estado de "visível" para dessincronizar.
 */
function DicaMenu({ texto, nota, x, y }: { texto: string; nota?: string; x: number; y: number }) {
  return createPortal(
    <div
      role="tooltip"
      key={`${texto}-${y}`}
      className="dica-menu pointer-events-none fixed z-[70]"
      style={{ left: x, top: y }}
    >
      <span className="dica-menu-seta" aria-hidden />
      <span
        className="block text-[12px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-titulo)' }}
      >
        {texto}
      </span>
      {nota && (
        <span className="mt-0.5 block text-[10.5px] text-[rgba(255,190,90,.92)]">{nota}</span>
      )}
    </div>,
    document.body,
  )
}
