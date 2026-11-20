'use client'

/**
 * O estado da vigilância semanal, no topo de Ameaças: quantas marcas estão vigiadas, quais RPIs
 * já foram lidas e se há edição nova esperando. A leitura roda sozinha (o servidor confere a cada
 * 6 h); o botão existe para não esperar.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePortfolio } from './EstadoPortfolio'
import { Botao } from './ui'
import { Confirmacao } from './Confirmacao'
import { api } from '@/lib/api'
import { dataBr } from '@/lib/visao'
import { useMensagem, toast } from './Toast'
import { Esqueleto, Osso } from './Esqueleto'

type Estado = {
  vigiados: number
  desligadas: number
  rodando: string | null
  pendentes: { numero: number; data: string }[] | null
  rodadas: { revista: { numero: number; data: string }; estado: string; motivo?: string | null; base: number; em: string }[]
}

type Execucao = {
  id: string
  estado: 'rodando' | 'concluida' | 'falhou'
  fase: string | null
  processados: number | null
  total: number | null
  erro: string | null
}

export function PainelVigilancia() {
  const { recarregar } = usePortfolio()
  const [estado, setEstado] = useState<Estado | null>(null)
  const [execucao, setExecucao] = useState<Execucao | null>(null)
  const [erro, setErro] = useMensagem('erro')
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [confirmandoReler, setConfirmandoReler] = useState(false)
  const [pedindo, setPedindo] = useState<'ler' | 'reler' | null>(null)
  const cancelarReler = useCallback(() => setConfirmandoReler(false), [])

  const carregar = useCallback(async () => {
    try {
      setEstado(await api<Estado>('/vigilancia'))
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
          await carregar()
          if (r.execucao.estado === 'concluida') {
            await recarregar()
            toast.sucesso('Leitura da RPI concluída: os casos novos estão na fila Em análise.')
          }
          if (r.execucao.estado === 'falhou') toast.erro(r.execucao.erro ?? 'A leitura da RPI falhou.')
        } catch (e) {
          setErro(e instanceof Error ? e.message : String(e))
        }
      }
      void passo()
    },
    [carregar, recarregar, setErro],
  )

  useEffect(() => {
    let vivo = true
    void api<Estado>('/vigilancia')
      .then((e) => {
        if (!vivo) return
        setEstado(e)
        // Recarregou a página no meio de uma leitura: retoma o acompanhamento.
        if (e.rodando) acompanhar(e.rodando)
      })
      .catch((e: unknown) => vivo && setErro(e instanceof Error ? e.message : String(e)))
    return () => {
      vivo = false
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [acompanhar, setErro])

  async function lerAgora(reler = false) {
    setErro(null)
    setPedindo(reler ? 'reler' : 'ler')
    try {
      const r = await api<{ execucao: string }>('/vigilancia/rodadas', { metodo: 'POST', corpo: reler ? { reler: true } : {} })
      acompanhar(r.execucao)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setPedindo(null)
    }
  }

  if (!estado) {
    if (erro) return <p className="mt-3 text-[12px] text-[var(--color-erro)]">{erro}</p>
    // Esqueleto do próprio painel: título, a linha da situação e os dois botões.
    return (
      <Esqueleto className="card mt-4 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-[240px] flex-1 space-y-2">
          <Osso w={180} h={12} />
          <Osso w="75%" h={10} />
        </div>
        <div className="flex gap-2">
          <Osso w={130} h={34} r={8} />
          <Osso w={150} h={34} r={8} />
        </div>
      </Esqueleto>
    )
  }

  const ultima = estado.rodadas[0]
  const rodando = execucao?.estado === 'rodando'
  const pendentes = estado.pendentes ?? []
  // A base da última leitura × a de hoje: marca que entrou depois não viu as edições já lidas.
  const novasDesdeAUltima = ultima ? Math.max(0, estado.vigiados - ultima.base) : 0

  return (
    <section className="card mt-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-[12px] leading-relaxed text-[var(--tx2)]">
          <strong className="text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
            Vigilância semanal da RPI
          </strong>
          <br />
          <span className="num">{estado.vigiados}</span> marcas brasileiras vigiadas
          {estado.desligadas > 0 && (
            <>
              {' '}
              · <span className="num">{estado.desligadas}</span> desligada{estado.desligadas === 1 ? '' : 's'} à mão
            </>
          )}
          {' · '}
          {ultima ? (
            <>
              última leitura: RPI <span className="num">{ultima.revista.numero}</span>, de{' '}
              <span className="num">{dataBr(ultima.revista.data)}</span>
            </>
          ) : (
            'nenhuma RPI lida ainda'
          )}
          {estado.pendentes === null && ' · não deu para consultar a RPI agora'}
        </div>
        <div className="flex flex-wrap gap-2">
          {!rodando && pendentes.length > 0 && (
            <Botao carregando={pedindo === 'ler'} disabled={pedindo !== null} onClick={() => void lerAgora()}>
              Ler {pendentes.length === 1 ? `a RPI ${pendentes[0].numero}` : `${pendentes.length} RPIs`} agora
            </Botao>
          )}
          {!rodando && ultima && (
            <Botao
              variante="secundaria"
              titulo="Cruza de novo as RPIs ainda no prazo de oposição. Só entram casos novos — os já levantados não se repetem."
              carregando={pedindo === 'reler'}
              disabled={pedindo !== null}
              onClick={() => setConfirmandoReler(true)}
            >
              Reler edições abertas
            </Botao>
          )}
        </div>
      </div>

      {!rodando && ultima && novasDesdeAUltima > 0 && (
        <p className="mt-2 text-[11.5px] text-[var(--color-alerta)]">
          <span className="num">{novasDesdeAUltima}</span> marca{novasDesdeAUltima === 1 ? '' : 's'} passaram a ser vigiadas
          depois da última leitura e não foram comparadas com as RPIs já lidas. Use “Reler edições abertas”.
        </p>
      )}

      {rodando && (
        <p className="mt-3 text-[12px] text-[var(--tx)]">
          ⏳ {execucao?.fase ?? 'Lendo'}
          {execucao?.total ? (
            <>
              {' '}
              — <span className="num">{execucao.processados ?? 0}</span> de <span className="num">{execucao.total}</span>
            </>
          ) : null}
          . Leva cerca de 1 a 2 minutos por edição; pode sair da página.
        </p>
      )}
      {execucao?.estado === 'falhou' && (
        <p className="mt-3 text-[12px] text-[var(--color-erro)]">A leitura falhou: {execucao.erro}</p>
      )}
      {erro && <p className="mt-3 text-[12px] text-[var(--color-erro)]">{erro}</p>}

      <Confirmacao
        aberto={confirmandoReler}
        titulo="Reler as edições abertas?"
        rotuloConfirmar="Reler agora"
        aoCancelar={cancelarReler}
        aoConfirmar={() => {
          setConfirmandoReler(false)
          void lerAgora(true)
        }}
      >
        As RPIs que ainda estão no prazo de oposição serão cruzadas de novo com as marcas vigiadas. Só
        casos novos entram na fila; os já levantados não se repetem. Leva cerca de 1 a 2 minutos por
        edição.
      </Confirmacao>

      {estado.rodadas.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] text-[var(--tx2)]">RPIs lidas</summary>
          <ul className="mt-2 space-y-1 text-[11.5px] text-[var(--tx2)]">
            {estado.rodadas.map((r) => (
              <li key={`${r.revista.numero}-${r.em}`}>
                RPI <span className="num">{r.revista.numero}</span> ({dataBr(r.revista.data)}) — {r.motivo} ·{' '}
                <span className="num">{r.base}</span> marcas vigiadas
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
