'use client'

import { usePathname } from 'next/navigation'
import { ProvedorCliente, useCliente } from '@/componentes/EstadoCliente'
import { SeletorCliente } from '@/componentes/SeletorCliente'
import { EsqPortalPorRota } from '@/componentes/EsqueletosDasPaginas'

export default function LayoutPortal({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorCliente>
      <Moldura>{children}</Moldura>
    </ProvedorCliente>
  )
}

function Moldura({ children }: { children: React.ReactNode }) {
  const { modo, pessoaId, visao, erro, carregando } = useCliente()
  // O esqueleto da espera depende da página que está sendo aberta.
  const caminho = usePathname()

  if (erro) {
    const abortou = erro.includes('VAZAMENTO')
    return (
      <div className="card border-l-4 p-5" style={{ borderLeftColor: 'var(--color-erro)' }}>
        <h2
          className="text-[15px] font-semibold text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          {abortou ? 'A projeção foi abortada' : 'Não foi possível abrir o portal'}
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--tx2)]">
          {abortou
            ? 'A auditoria encontrou um campo que não pode chegar ao cliente e interrompeu a montagem da tela. Nada foi exibido. Isto é o comportamento correto: o portal falha alto em vez de vazar em silêncio.'
            : 'O servidor recusou ou não respondeu. Nada foi exibido.'}
        </p>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-[var(--sup2)] p-3 text-[11px] text-[var(--color-erro)]">
          {erro}
        </pre>
      </div>
    )
  }

  if (modo === 'previa' && !pessoaId) return <SeletorCliente />

  if (carregando || !visao) return <EsqPortalPorRota caminho={caminho} />

  // Recorte vazio: a pessoa tem vínculo, mas nenhum ativo publicável (titular anônimo, ou só
  // vínculos que não se publicam). Sem isto a casa do cliente abria com tudo zerado e calada.
  if (visao.ativos.length === 0) {
    return (
      <>
        {modo === 'previa' && <BarraPrevia />}
        <div className="card p-5">
          <h2 className="text-[15px] font-semibold text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
            {modo === 'previa' ? 'Este portal está vazio' : 'Seu portfólio ainda não tem ativos publicados'}
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--tx2)]">
            {modo === 'previa'
              ? 'A pessoa tem vínculo com ativos, mas nenhum deles é publicável: ou o ativo ainda está sem titular, ou o vínculo dela não se publica (agente). Resolva na Conciliação.'
              : 'Assim que a equipe concluir o cadastro dos seus ativos, eles aparecem aqui. Em caso de dúvida, fale com a gente.'}
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      {modo === 'previa' && <BarraPrevia />}
      {children}
    </>
  )
}

/**
 * A tarja da pré-visualização: a equipe está vendo o portal COMO um cliente vê. Fica no topo de
 * toda tela do portal e não some — quem olha precisa saber de quem é o recorte na tela.
 */
function BarraPrevia() {
  const { nome, escolher } = useCliente()
  return (
    <div
      className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5"
      style={{
        background: 'rgba(0,224,246,.07)',
        border: '1px solid rgba(0,224,246,.22)',
      }}
    >
      <span className="text-[11.5px] text-[var(--tx2)]">
        Pré-visualização: você está vendo o portal como{' '}
        <strong className="text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
          {nome ?? '—'}
        </strong>{' '}
        vê — o mesmo recorte, projetado e auditado no servidor.
      </span>
      <button
        onClick={() => escolher(null)}
        className="rounded-lg border border-[var(--brd)] px-3 py-1 text-[11px] font-semibold text-[var(--tx2)] transition hover:border-[var(--brd-forte)] hover:text-[var(--tx)]"
        style={{ fontFamily: 'var(--font-titulo)' }}
      >
        Trocar de cliente
      </button>
    </div>
  )
}
