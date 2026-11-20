'use client'

/**
 * Completar pelo INPI as marcas que vieram SÓ da planilha.
 *
 * A planilha traz o número, mas a situação é só "REGISTRO"/"PEDIDO" e não há despacho: sem
 * isso, não nasce prazo de despacho e a vigilância não sabe quem está arquivado. O servidor
 * procura cada número na base do INPI e mescla como a importação faz: dado oficial entra;
 * cliente, parceiro, agente e a conciliação ficam.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePortfolio } from './EstadoPortfolio'
import { Botao, Cartao, Girando } from './ui'
import { api } from '@/lib/api'
import { PedidosSemNumero, type SemNumero } from './PedidosSemNumero'
import { useMensagem, toast } from './Toast'
import { Osso } from './Esqueleto'

type Resultado = {
  procurados: number
  encontrados: number
  completados: number
  eventos: number
  nao_encontrados: number
  nao_encontrados_lista: string[]
  n_falhas: number
  falhas: { numero: string; motivo: string }[]
}

type Execucao = {
  id: string
  tipo: string
  estado: 'rodando' | 'concluida' | 'falhou'
  fase: string | null
  processados: number | null
  total: number | null
  resultado: Resultado | null
  erro: string | null
}

export function ComplementoInpi() {
  const { recarregar } = usePortfolio()
  const [pendentes, setPendentes] = useState<number | null>(null)
  const [semNumero, setSemNumero] = useState<SemNumero[]>([])
  const [execucao, setExecucao] = useState<Execucao | null>(null)
  const [erro, setErro] = useMensagem('erro')
  const [pedindo, setPedindo] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const contar = useCallback(async () => {
    try {
      const r = await api<{ marcas: number; sem_numero: SemNumero[] }>('/importacao/openip/complemento')
      setPendentes(r.marcas)
      setSemNumero(r.sem_numero ?? [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }, [setErro])

  const acompanhar = useCallback(
    (id: string) => {
      const passo = async () => {
        try {
          const r = await api<{ execucao: Execucao }>(`/importacao/execucoes/${id}`)
          setExecucao(r.execucao)
          if (r.execucao.estado === 'rodando') {
            temporizador.current = setTimeout(passo, 2000)
            return
          }
          await contar()
          if (r.execucao.estado === 'concluida') {
            await recarregar()
            toast.sucesso('Complemento pelo INPI concluído: situações e despachos atualizados.')
          }
          if (r.execucao.estado === 'falhou') toast.erro(r.execucao.erro ?? 'O complemento pelo INPI falhou.')
        } catch (e) {
          setErro(e instanceof Error ? e.message : String(e))
        }
      }
      void passo()
    },
    [contar, recarregar, setErro],
  )

  useEffect(() => {
    let vivo = true
    void api<{ marcas: number; sem_numero: SemNumero[] }>('/importacao/openip/complemento')
      .then((r) => {
        if (!vivo) return
        setPendentes(r.marcas)
        setSemNumero(r.sem_numero ?? [])
      })
      .catch(() => {})
    // Recarregou a página no meio: retoma o acompanhamento.
    void api<{ execucao: Execucao | null }>('/importacao/execucoes/ultima')
      .then((u) => {
        if (vivo && u.execucao?.tipo === 'complemento_inpi') {
          if (u.execucao.estado === 'rodando') acompanhar(u.execucao.id)
          else setExecucao(u.execucao)
        }
      })
      .catch(() => {})
    return () => {
      vivo = false
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [acompanhar])

  async function iniciar() {
    setErro(null)
    setPedindo(true)
    try {
      const r = await api<{ execucao_id: string }>('/importacao/openip/complemento', { metodo: 'POST', corpo: {} })
      acompanhar(r.execucao_id)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setPedindo(false)
    }
  }

  const rodando = execucao?.estado === 'rodando'
  const res = execucao?.estado === 'concluida' ? execucao.resultado : null

  return (
    <Cartao titulo="Completar pela base do INPI">
      <p className="text-[12px] leading-relaxed text-[var(--tx2)]">
        Marcas que vieram só da planilha têm o número, mas não a situação real nem os despachos — e sem
        despacho não nasce prazo, e a vigilância não sabe quem já foi arquivado. Aqui o sistema procura cada
        número no INPI e completa. Cliente, parceiro e o que foi decidido na Conciliação continuam.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
        {pendentes === null ? (
          <span role="status" aria-busy="true">
            <span className="sr-only">Contando…</span>
            <Osso w={200} h={14} />
          </span>
        ) : pendentes === 0 ? (
          <span className="text-[var(--tx)]">✓ Nenhuma marca da carteira depende só da planilha.</span>
        ) : (
          <>
            <span>
              <span className="num font-semibold text-[var(--tx)]">{pendentes}</span> marca{pendentes === 1 ? '' : 's'} só da
              planilha
            </span>
            {!rodando && (
              <Botao carregando={pedindo} onClick={() => void iniciar()}>
                Completar agora
              </Botao>
            )}
          </>
        )}
      </div>

      {rodando && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--tx)]">
          <Girando />
          {execucao?.fase ?? 'Procurando'}
          {execucao?.total ? (
            <>
              {' '}
              — <span className="num">{execucao.processados ?? 0}</span> de <span className="num">{execucao.total}</span>
            </>
          ) : null}
          . Leva alguns minutos; pode sair da página.
        </p>
      )}
      {execucao?.estado === 'falhou' && <p className="mt-3 text-[12px] text-[var(--color-erro)]">Falhou: {execucao.erro}</p>}
      {erro && <p className="mt-3 text-[12px] text-[var(--color-erro)]">{erro}</p>}

      {res && (
        <div className="mt-3 text-[12px] text-[var(--tx2)]">
          <p className="text-[var(--tx)]">
            ✓ <span className="num">{res.completados}</span> marcas completadas com o INPI (
            <span className="num">{res.eventos}</span> despachos) de <span className="num">{res.procurados}</span>{' '}
            procuradas.
          </p>
          {res.nao_encontrados > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer">
                <span className="num">{res.nao_encontrados}</span> número(s) não existem na base do INPI e ficaram como
                vieram da planilha
              </summary>
              <p className="num mt-1 text-[11px] leading-relaxed">{res.nao_encontrados_lista.join(' · ')}</p>
            </details>
          )}
          {res.n_falhas > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-[var(--color-erro)]">
                <span className="num">{res.n_falhas}</span> não puderam ser lidos agora (tente de novo depois)
              </summary>
              <ul className="mt-1 text-[11px]">
                {res.falhas.map((f) => (
                  <li key={f.numero}>
                    {f.numero}: {f.motivo}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {semNumero.length > 0 && <PedidosSemNumero itens={semNumero} aoMudar={contar} />}
    </Cartao>
  )
}
