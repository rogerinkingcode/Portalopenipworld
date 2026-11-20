'use client'

/**
 * Pedidos da planilha SEM número do INPI (só o código interno ND). O número pode ter saído
 * depois do depósito: o sistema procura no INPI pelo NOME EXATO e só SUGERE — nome igual não
 * prova que é o mesmo pedido. A equipe confirma "é este" (ou digita o número), e o ativo ganha o
 * número e os dados oficiais. O ND continua no ativo: é por ele que a planilha o reconhece.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePortfolio } from './EstadoPortfolio'
import { Botao } from './ui'
import { api } from '@/lib/api'
import { dataBr } from '@/lib/visao'
import { useMensagem } from './Toast'

export type SemNumero = { ativo_id: string; nome: string; nd: string }
type Candidato = { numero: string; deposito: string | null; situacao: string | null; titulares: string[]; classes: string[]; procuradores: string[] }
type Sugestao = SemNumero & { candidatos: Candidato[] }
type Execucao = {
  id: string
  tipo: string
  estado: 'rodando' | 'concluida' | 'falhou'
  fase: string | null
  processados: number | null
  total: number | null
  resultado: { sugestoes?: Sugestao[] } | null
  erro: string | null
}

export function PedidosSemNumero({ itens, aoMudar }: { itens: SemNumero[]; aoMudar: () => Promise<void> }) {
  const { recarregar } = usePortfolio()
  const [execucao, setExecucao] = useState<Execucao | null>(null)
  const [sugestoes, setSugestoes] = useState<Sugestao[] | null>(null)
  const [digitado, setDigitado] = useState<Record<string, string>>({})
  const [erro, setErro] = useMensagem('erro')
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const acompanhar = useCallback(
    (id: string) => {
      const passo = async () => {
        try {
          const r = await api<{ execucao: Execucao }>(`/importacao/execucoes/${id}`)
          setExecucao(r.execucao)
          if (r.execucao.estado === 'rodando') {
            temporizador.current = setTimeout(passo, 2500)
            return
          }
          if (r.execucao.estado === 'concluida') {
            if (r.execucao.tipo === 'complemento_nome') setSugestoes(r.execucao.resultado?.sugestoes ?? [])
            else {
              await recarregar()
              await aoMudar()
            }
          }
        } catch (e) {
          setErro(e instanceof Error ? e.message : String(e))
        }
      }
      void passo()
    },
    [recarregar, aoMudar, setErro],
  )

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    },
    [],
  )

  async function iniciar(caminho: string, corpo: object) {
    setErro(null)
    try {
      const r = await api<{ execucao_id: string }>(caminho, { metodo: 'POST', corpo })
      acompanhar(r.execucao_id)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  const rodando = execucao?.estado === 'rodando'
  const atribuir = (ativoId: string, numero: string) => void iniciar('/importacao/openip/complemento/numero', { ativo_id: ativoId, numero })
  const porAtivo = new Map((sugestoes ?? []).map((s) => [s.ativo_id, s]))

  return (
    <div className="mt-4 border-t border-[var(--linha)] pt-3 text-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="text-[var(--tx)]">
            <span className="num">{itens.length}</span> pedido{itens.length === 1 ? '' : 's'} sem número do INPI
          </strong>{' '}
          — a planilha só tem o código interno (ND). O número pode ter saído depois.
        </span>
        {!rodando && (
          <Botao variante="secundaria" onClick={() => void iniciar('/importacao/openip/complemento/nomes', {})}>
            Procurar pelo nome no INPI
          </Botao>
        )}
      </div>
      {rodando && (
        <p className="mt-2 text-[var(--tx)]">
          ⏳ {execucao?.fase}
          {execucao?.total ? (
            <>
              {' '}
              — <span className="num">{execucao.processados ?? 0}</span> de <span className="num">{execucao.total}</span>
            </>
          ) : null}
          . A busca por nome é lenta (1 a 2 minutos por marca); pode sair da página.
        </p>
      )}
      {execucao?.estado === 'falhou' && <p className="mt-2 text-[var(--color-erro)]">Falhou: {execucao.erro}</p>}
      {erro && <p className="mt-2 text-[var(--color-erro)]">{erro}</p>}

      <ul className="mt-2 space-y-2">
        {itens.map((it) => {
          const s = porAtivo.get(it.ativo_id)
          return (
            <li key={it.ativo_id} className="rounded border border-[var(--linha)] p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[var(--tx)]">{it.nome}</span>
                <span className="num text-[11px] text-[var(--tx3)]">{it.nd}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <input
                    value={digitado[it.ativo_id] ?? ''}
                    onChange={(e) => setDigitado({ ...digitado, [it.ativo_id]: e.target.value })}
                    placeholder="Nº do INPI (9 dígitos)"
                    className="w-40 rounded border border-borda bg-transparent px-2 py-1 text-[12px]"
                  />
                  <Botao
                    variante="secundaria"
                    disabled={rodando || (digitado[it.ativo_id] ?? '').replace(/\D/g, '').length !== 9}
                    onClick={() => atribuir(it.ativo_id, digitado[it.ativo_id] ?? '')}
                  >
                    Usar este número
                  </Botao>
                </span>
              </div>
              {s && s.candidatos.length === 0 && (
                <p className="mt-1 text-[11px] text-[var(--tx3)]">Nenhum processo com este nome exato nos últimos 5 anos.</p>
              )}
              {s?.candidatos.map((c) => (
                <div key={c.numero} className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--tx2)]">
                  <span className="num font-semibold text-[var(--tx)]">{c.numero}</span>
                  <span>depósito {dataBr(c.deposito)}</span>
                  <span>· {c.titulares.join(', ') || 'titular não informado'}</span>
                  {c.classes.length > 0 && <span>· classe {c.classes.join(', ')}</span>}
                  {c.situacao && <span>· {c.situacao}</span>}
                  {c.procuradores.length > 0 && <span>· procurador {c.procuradores.join(', ')}</span>}
                  <Botao disabled={rodando} onClick={() => atribuir(it.ativo_id, c.numero)}>
                    É este
                  </Botao>
                </div>
              ))}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
