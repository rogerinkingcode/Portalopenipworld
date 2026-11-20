'use client'

/**
 * Importação de planilha — a leitura é do SERVIDOR.
 *
 * O navegador só envia o arquivo, em bytes. Duas etapas, porque quem opera precisa ver antes de
 * gravar:
 *   1. Analisar  — o servidor lê, mescla numa cópia da carteira e devolve o relatório: linhas
 *                  lidas, o que foi recusado e por quê, o que é novo e o que já existe. Nada é gravado.
 *   2. Importar  — o MESMO arquivo (o servidor confere pelo SHA-256 da análise) é mesclado na
 *                  carteira e gravado numa transação só, em segundo plano.
 *
 * A planilha SOMA na carteira: não apaga o que veio do INPI nem a conciliação.
 */

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePortfolio } from './EstadoPortfolio'
import { Botao, Cartao, Chip, Girando } from './ui'
import { TiposEnvolvido } from './TiposEnvolvido'
import { api, BASE_API } from '@/lib/api'
import { toast } from './Toast'

/** O mesmo limite da API (backend/src/modules/core/planilha/services/ImportacaoPlanilha.ts). */
const LIMITE_BYTES = 20 * 1024 * 1024

type Recusa = { linha: number; coluna?: string; valor?: string; motivo: string }

type Relatorio = {
  lidos: number
  ativos: number
  classes_anexadas: number
  recusados: number
  recusas: Recusa[]
  recusas_omitidas: number
  sem_numero: number
  sem_titular: number
  /** "TIPO DO ENVOLVIDO" que o sistema não reconheceu: o que cadastrar em Tipos de envolvido. */
  tipos_desconhecidos?: { tipo: string; linhas: number }[]
}

type Resumo = {
  novos: number
  atualizados: number
  completados: number
  vinculos_acrescentados: number
  pessoas_novas: number
  fora_da_planilha: number
}

type Analise = { arquivo: string; tamanho: number; sha256: string; relatorio: Relatorio; resumo: Resumo }

type Execucao = {
  id: string
  tipo: string
  estado: 'rodando' | 'concluida' | 'falhou'
  fase: string | null
  resultado: (Resumo & { arquivo: string; relatorio: Relatorio }) | { recusas: string[] } | null
  erro: string | null
}

export function ImportarPlanilha() {
  const { recarregar } = usePortfolio()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [analise, setAnalise] = useState<Analise | null>(null)
  const [execucao, setExecucao] = useState<Execucao | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErroEstado] = useState<{ mensagem: string; detalhes: string[] } | null>(null)
  // Todo erro desta seção também vira toast (a lista de detalhes continua só na tela).
  const setErro = useCallback((v: { mensagem: string; detalhes: string[] } | null) => {
    setErroEstado(v)
    if (v) toast.erro(v.mensagem)
  }, [])
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const entrada = useRef<HTMLInputElement | null>(null)

  const falhou = useCallback(
    (e: unknown) =>
      setErro({
        mensagem: e instanceof Error ? e.message : String(e),
        detalhes: e && typeof e === 'object' && 'detalhes' in e && Array.isArray(e.detalhes) ? (e.detalhes as string[]) : [],
      }),
    [setErro],
  )

  const acompanhar = useCallback(
    (id: string) => {
      const passo = async () => {
        try {
          const r = await api<{ execucao: Execucao }>(`/importacao/execucoes/${id}`)
          setExecucao(r.execucao)
          if (r.execucao.estado === 'rodando') {
            temporizador.current = setTimeout(passo, 1500)
            return
          }
          if (r.execucao.estado === 'concluida') {
            setAnalise(null)
            setArquivo(null)
            await recarregar()
            toast.sucesso('Planilha importada: a carteira foi atualizada.')
          }
          if (r.execucao.estado === 'falhou') toast.erro(r.execucao.erro ?? 'A importação da planilha falhou.')
        } catch (e) {
          falhou(e)
        }
      }
      void passo()
    },
    [recarregar, falhou],
  )

  useEffect(() => {
    // Recarregou a página no meio de uma importação de planilha: retoma o acompanhamento.
    let vivo = true
    void api<{ execucao: Execucao | null }>('/importacao/execucoes/ultima')
      .then((u) => {
        if (vivo && u.execucao?.estado === 'rodando' && u.execucao.tipo === 'planilha') acompanhar(u.execucao.id)
      })
      .catch(() => {})
    return () => {
      vivo = false
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [acompanhar])

  async function analisar(f: File) {
    setArquivo(f)
    setAnalise(null)
    setExecucao(null)
    setErro(null)
    // O servidor recusa acima de 20 MB; aqui só se poupa o envio inútil.
    if (f.size > LIMITE_BYTES) {
      setErro({ mensagem: `O arquivo tem ${(f.size / 1024 / 1024).toFixed(1)} MB; o limite é 20 MB.`, detalhes: [] })
      if (entrada.current) entrada.current.value = ''
      return
    }
    setOcupado(true)
    try {
      const r = await api<{ analise: Analise }>('/importacao/planilha/analise', { metodo: 'POST', arquivo: f })
      setAnalise(r.analise)
      toast.info('Planilha analisada: confira o resultado antes de importar.')
    } catch (e) {
      falhou(e)
    } finally {
      setOcupado(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  async function importar() {
    if (!arquivo || !analise) return
    setErro(null)
    setOcupado(true)
    try {
      const r = await api<{ execucao_id: string }>(`/importacao/planilha?sha256=${analise.sha256}`, { metodo: 'POST', arquivo })
      acompanhar(r.execucao_id)
    } catch (e) {
      falhou(e)
    } finally {
      setOcupado(false)
    }
  }

  const rodando = execucao?.estado === 'rodando'
  const concluida = execucao?.estado === 'concluida' && execucao.resultado && 'novos' in execucao.resultado ? execucao.resultado : null

  return (
    <>
      <Cartao titulo="Importar por planilha">
        <p className="mb-3 text-[12.5px] text-tx2">
          Para o que a busca no INPI não traz (marcas com outro procurador, Madri, exterior) ou para a carga
          inicial. Aceita a base-mestra e a planilha canônica do contrato. A planilha{' '}
          <strong className="text-tinta">soma</strong> na carteira: o que já veio do INPI continua valendo, e
          ela só acrescenta cliente, parceiro e agente (e o titular ou procurador que faltar).
        </p>
        <p className="mb-3 text-[12px] text-tx2">
          Montando uma planilha nova?{' '}
          <a href={`${BASE_API}/importacao/planilha/modelo`} className="font-semibold text-petrol underline">
            Baixe o modelo
          </a>{' '}
          — as colunas que o sistema lê, com exemplos e a explicação de cada uma.
        </p>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-borda bg-neutro px-6 py-8 text-center transition hover:border-petrol">
          <input
            ref={entrada}
            type="file"
            accept=".xlsx,.xlsm,.xls,.csv"
            className="hidden"
            disabled={ocupado || rodando}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void analisar(f)
            }}
          />
          <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-petrol">
            {ocupado && !analise && <Girando />}
            {ocupado && !analise ? 'Analisando…' : 'Escolher planilha (.xlsx, .xlsm, .xls, .csv)'}
          </span>
          <span className="mt-1 text-[10.5px] text-tx2">
            O arquivo é lido no servidor. Primeiro você vê a análise; nada é gravado antes de confirmar.
          </span>
        </label>
      </Cartao>

      {erro && (
        <Cartao titulo="A planilha não foi aceita">
          <p className="text-[12.5px] text-erro">{erro.mensagem}</p>
          {erro.detalhes.length > 0 && (
            <ul className="mt-2 max-h-56 list-disc overflow-auto pl-5 text-[11px] text-tx2">
              {erro.detalhes.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10.5px] text-tx2">A carteira não foi alterada.</p>
        </Cartao>
      )}

      {analise && !concluida && (
        <Cartao
          titulo={`Análise — ${analise.arquivo}`}
          acessorio={
            analise.relatorio.recusados === 0 ? (
              <Chip tom="ok">sem recusas</Chip>
            ) : (
              <Chip tom="alerta">{analise.relatorio.recusados} linha(s) recusada(s)</Chip>
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Numero rotulo="Linhas lidas" valor={analise.relatorio.lidos} />
            <Numero rotulo="Recusadas" valor={analise.relatorio.recusados} alerta={analise.relatorio.recusados > 0} />
            <Numero rotulo="Novos na carteira" valor={analise.resumo.novos} destaque />
            <Numero rotulo="Já vieram do INPI" valor={analise.resumo.completados} />
            <Numero rotulo="Já vieram de planilha" valor={analise.resumo.atualizados} />
            <Numero rotulo="Sem titular" valor={analise.relatorio.sem_titular} alerta={analise.relatorio.sem_titular > 0} />
          </div>
          <p className="mt-3 text-[10.5px] text-tx2">
            ⚠️ <strong>As linhas lidas têm de bater com o arquivo.</strong> Se a planilha tem outro número de
            linhas, não importe. {analise.resumo.fora_da_planilha > 0 && (
              <>Os {analise.resumo.fora_da_planilha} ativo(s) da carteira que não estão na planilha ficam como estão.</>
            )}
          </p>

          <TabelaRecusas recusas={analise.relatorio.recusas} omitidas={analise.relatorio.recusas_omitidas} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Botao
              disabled={ocupado || rodando || analise.relatorio.ativos === 0}
              carregando={rodando || (ocupado && !!analise)}
              onClick={() => void importar()}
            >
              {rodando ? `Importando… ${execucao?.fase ?? ''}` : `Importar ${analise.relatorio.ativos} ativo(s)`}
            </Botao>
            <Botao
              variante="secundaria"
              disabled={ocupado || rodando}
              onClick={() => {
                setAnalise(null)
                setArquivo(null)
              }}
            >
              Cancelar
            </Botao>
          </div>
        </Cartao>
      )}

      {execucao?.estado === 'falhou' && (
        <Cartao titulo="A importação falhou">
          <p className="text-[12.5px] text-erro">{execucao.erro}</p>
          {execucao.resultado && 'recusas' in execucao.resultado && Array.isArray(execucao.resultado.recusas) && typeof execucao.resultado.recusas[0] === 'string' && (
            <ul className="mt-2 max-h-56 list-disc overflow-auto pl-5 text-[11px] text-tx2">
              {(execucao.resultado.recusas as string[]).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10.5px] text-tx2">A carteira não foi alterada. Nada foi gravado pela metade.</p>
        </Cartao>
      )}

      {concluida && (
        <Cartao titulo={`Importação concluída — ${concluida.arquivo}`} acessorio={<Chip tom="ok">gravada</Chip>}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Numero rotulo="Novos" valor={concluida.novos} destaque />
            <Numero rotulo="Completados (INPI)" valor={concluida.completados} />
            <Numero rotulo="Atualizados (planilha)" valor={concluida.atualizados} />
            <Numero rotulo="Vínculos acrescentados" valor={concluida.vinculos_acrescentados} />
            <Numero rotulo="Pessoas novas" valor={concluida.pessoas_novas} />
          </div>
          <TabelaRecusas recusas={concluida.relatorio.recusas} omitidas={concluida.relatorio.recusas_omitidas} />
          <div className="mt-3 flex gap-2">
            <Link href="/assets">
              <Botao>Ver os ativos</Botao>
            </Link>
            {concluida.relatorio.sem_titular + concluida.relatorio.sem_numero > 0 && (
              <Link href="/reconciliation">
                <Botao variante="secundaria">Resolver pendências</Botao>
              </Link>
            )}
          </div>
        </Cartao>
      )}
      {/* Os nomes próprios da empresa para o TIPO DO ENVOLVIDO — com os não reconhecidos da análise. */}
      <TiposEnvolvido sugestoes={analise?.relatorio.tipos_desconhecidos ?? concluida?.relatorio.tipos_desconhecidos ?? []} />
    </>
  )
}

function TabelaRecusas({ recusas, omitidas }: { recusas: Recusa[]; omitidas: number }) {
  if (recusas.length === 0) return null
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[12.5px] font-medium">
        O que foi recusado, e por quê ({recusas.length + omitidas})
      </p>
      <div className="max-h-72 overflow-auto rounded border border-[var(--linha)]">
        <table className="tb">
          <thead className="sticky top-0 bg-neutro">
            <tr>
              <th>Linha</th>
              <th>Coluna</th>
              <th>Valor</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {recusas.map((e, i) => (
              <tr key={i} className="border-t border-[var(--linha)]">
                <td className="tabular">{e.linha}</td>
                <td>{e.coluna ?? '—'}</td>
                <td>{e.valor ?? '—'}</td>
                <td className="text-tx2">{e.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {omitidas > 0 && <p className="mt-1 text-[10.5px] text-tx2">e mais {omitidas} recusa(s) não listadas.</p>}
    </div>
  )
}

function Numero({ rotulo, valor, destaque, alerta }: { rotulo: string; valor: number; destaque?: boolean; alerta?: boolean }) {
  return (
    <div className="rounded border border-[var(--linha)] p-3">
      <p className="text-[10.5px] text-tx2">{rotulo}</p>
      <p className={'tabular mt-0.5 text-xl font-semibold ' + (alerta ? 'text-alerta' : destaque ? 'text-petrol' : 'text-tinta')}>
        {valor}
      </p>
    </div>
  )
}
