'use client'

/**
 * Diálogo de confirmação da casa — no lugar do `window.confirm` do navegador.
 *
 * Aparece com fundo escurecido, sobe e ganha opacidade ao abrir, e faz o caminho inverso ao
 * fechar. Esc ou clique fora cancelam; Enter confirma. Vai para o <body> por portal: dentro de
 * um `.card` (que tem backdrop-filter no escuro) o `position: fixed` ficaria preso ao cartão.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Botao } from './ui'
import { CampoSenha } from './CampoSenha'

const DURACAO_MS = 220

export function Confirmacao({
  aberto,
  titulo,
  children,
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  perigo = false,
  campo,
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean
  titulo: string
  children?: React.ReactNode
  rotuloConfirmar?: string
  rotuloCancelar?: string
  /** Ação destrutiva: o botão de confirmar fica vermelho. */
  perigo?: boolean
  /** Pede um texto (justificativa, motivo…) no lugar do `window.prompt`. Obrigatório quando há. */
  campo?: {
    rotulo: string
    inicial?: string
    placeholder?: string
    /** 'senha': uma linha, com os caracteres escondidos (e Enter confirma). Padrão: texto livre. */
    tipo?: 'texto' | 'senha'
    /** Mínimo de caracteres para liberar o botão. Padrão: 1 (não pode ficar vazio). */
    minimo?: number
  }
  /** Recebe o texto digitado (já sem espaços nas pontas) quando há `campo`; senão, ''. */
  aoConfirmar: (texto: string) => void
  aoCancelar: () => void
}) {
  /*
   * ⚠️ `desenhado` e `entrou` só mudam dentro de rAF/timeout, NUNCA durante o render. A versão
   *    anterior ligava "montado" no render e desligava num timeout que rodava até sem a janela
   *    ter aberto: esse desligar ficava pendente na fila do React e era aplicado por cima do
   *    ligar do clique seguinte — a janela só abria se o clique viesse antes de 220 ms.
   */
  // Continua desenhada durante a animação de saída, depois que o pai já mandou fechar.
  const [desenhado, setDesenhado] = useState(false)
  const [entrou, setEntrou] = useState(false)
  const jaAbriu = useRef(false)
  const [texto, setTexto] = useState(campo?.inicial ?? '')
  const [abertoAntes, setAbertoAntes] = useState(aberto)
  const caixa = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  // Abriu: recomeça o texto (padrão "ajustar estado no render"; nenhum timer toca nestes dois).
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto)
    if (aberto) setTexto(campo?.inicial ?? '')
  }
  const montado = aberto || desenhado
  const minimo = campo?.minimo ?? 1
  const pronto = !campo || texto.trim().length >= minimo
  const visivel = entrou && aberto

  useEffect(() => {
    if (aberto) {
      jaAbriu.current = true
      // Dois quadros: o primeiro pinta a janela transparente, o segundo dispara a entrada.
      let q2 = 0
      const q1 = requestAnimationFrame(() => {
        q2 = requestAnimationFrame(() => {
          setEntrou(true)
          setDesenhado(true)
        })
      })
      return () => {
        cancelAnimationFrame(q1)
        cancelAnimationFrame(q2)
      }
    }
    // Nunca abriu: não há saída para animar, e nenhum estado para mexer.
    if (!jaAbriu.current) return
    const t = setTimeout(() => {
      setEntrou(false)
      setDesenhado(false)
    }, DURACAO_MS)
    return () => clearTimeout(t)
  }, [aberto])

  // As funções mais recentes, sem refazer o efeito (e sem roubar o foco) a cada render do pai.
  const confirmar = () => pronto && aoConfirmar(campo ? texto.trim() : '')
  const acoes = useRef({ confirmar, aoCancelar })
  useEffect(() => {
    acoes.current = { confirmar, aoCancelar }
  })

  useEffect(() => {
    if (!aberto) return
    if (area.current) {
      area.current.focus()
      area.current.select()
    } else caixa.current?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') acoes.current.aoCancelar()
      // Enter num botão já é o clique dele (senão "Cancelar" com Enter confirmaria); no campo de
      // texto, Enter quebra linha e Ctrl+Enter confirma.
      else if (e.key === 'Enter') {
        if (e.target instanceof HTMLButtonElement) return
        if (e.target instanceof HTMLTextAreaElement && !(e.ctrlKey || e.metaKey)) return
        e.preventDefault()
        acoes.current.confirmar()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aberto])

  if (!montado) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="alertdialog" aria-modal="true" aria-label={titulo}>
      <div
        className="absolute inset-0 bg-black/50 transition-opacity ease-out"
        style={{ opacity: visivel ? 1 : 0, transitionDuration: `${DURACAO_MS}ms` }}
        onClick={aoCancelar}
      />
      <div
        ref={caixa}
        tabIndex={-1}
        className="relative w-full max-w-[420px] rounded-2xl p-5 outline-none"
        style={{
          background: 'var(--fundo)',
          border: '1px solid var(--brd)',
          boxShadow: 'var(--sh-forte)',
          opacity: visivel ? 1 : 0,
          transform: visivel ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.97)',
          transition: `opacity ${DURACAO_MS}ms ease-out, transform ${DURACAO_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        }}
      >
        <h2 className="text-[15px] font-semibold text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
          {titulo}
        </h2>
        {children && <div className="mt-2 text-[12.5px] leading-relaxed text-[var(--tx2)]">{children}</div>}
        {campo && (
          <label className="mt-4 block">
            <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">{campo.rotulo}</span>
            {campo.tipo === 'senha' ? (
              <CampoSenha
                ref={area as React.RefObject<HTMLInputElement>}
                autoComplete="new-password"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={campo.placeholder}
                className="w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 py-2 text-[12.5px] text-[var(--tx)] outline-none focus:border-[var(--color-ciano)]"
              />
            ) : (
              <textarea
                ref={area as React.RefObject<HTMLTextAreaElement>}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={campo.placeholder}
                rows={3}
                className="w-full resize-y rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 py-2 text-[12.5px] text-[var(--tx)] outline-none focus:border-[var(--color-ciano)]"
              />
            )}
            {!pronto && (
              <span className="mt-1 block text-[10.5px] text-[var(--color-alerta)]">
                {minimo > 1 ? `Mínimo de ${minimo} caracteres (faltam ${minimo - texto.trim().length}).` : 'Preencha para continuar.'}
              </span>
            )}
          </label>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Botao variante="secundaria" onClick={aoCancelar}>
            {rotuloCancelar}
          </Botao>
          <Botao variante={perigo ? 'perigo' : 'primaria'} disabled={!pronto} onClick={confirmar}>
            {rotuloConfirmar}
          </Botao>
        </div>
      </div>
    </div>,
    document.body,
  )
}
