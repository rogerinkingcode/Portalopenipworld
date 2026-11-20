'use client'

/**
 * A fila de análise: candidatos que a vigilância levantou e ninguém decidiu ainda.
 *
 * ⛔ É o PORTÃO HUMANO. Nada daqui chega ao cliente antes de alguém assinar o parecer com a
 *    decisão "enviar" — e é aí que nasce o prazo de oposição. "Descartar" tira da fila; "manter
 *    em análise" guarda a anotação e deixa o caso aqui.
 *
 * A ordem P0–P3 é de RECUPERAÇÃO (o que o computador achou mais parecido), não de risco. O prazo
 * para opor corre desde a RPI: a coluna mostra quantos dias ainda restam.
 */

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { Confirmacao } from './Confirmacao'
import { Paginacao, usePaginacao } from './Paginacao'
import type { Pacote } from '@/contrato/tipos'
import { usePortfolio } from './EstadoPortfolio'
import { Bandeira } from './Bandeira'
import { Botao, Chip } from './ui'
import { api } from '@/lib/api'
import { dataBr, diasAte, nomeAtivo, textoDias } from '@/lib/visao'
import { calcularPrazo } from '@/regras/calendario'
import { CATALOGO } from '@/regras/reguas'
import { useMensagem } from './Toast'

type Colidencia = Pacote['colidencias'][number]
type Decisao = 'enviar' | 'nao_enviar' | 'avaliar'
type Risco = 'alto' | 'medio' | 'baixo'

const ORDEM_TIER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }
const DESCARTE_PADRAO = 'Sem colidência relevante após análise.'

export function FilaAnalise({ candidatos }: { candidatos: Colidencia[] }) {
  const { pacote, hoje, recarregar } = usePortfolio()
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [aberto, setAberto] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  // A decisão em andamento e os casos dela: só o botão clicado gira; o "ocupado" trava o resto.
  const [rodando, setRodando] = useState<{ decisao: Decisao; ids: string[] } | null>(null)
  const [erro, setErro] = useMensagem('erro')
  const [aviso, setAviso] = useMensagem('sucesso')

  const linhas = useMemo(() => {
    const ativos = new Map(pacote.ativos.map((a) => [a.ativo_id, a]))
    const regua = CATALOGO['br.marca.prazo_oposicao']
    return candidatos
      .map((c) => ({ c, ativo: ativos.get(c.ativo_id), vence: calcularPrazo(c.evento_gatilho.data, regua).vence_em }))
      .sort(
        (x, y) =>
          x.vence.localeCompare(y.vence) || (ORDEM_TIER[x.c.tier] ?? 9) - (ORDEM_TIER[y.c.tier] ?? 9) || x.c.caso_id.localeCompare(y.c.caso_id),
      )
  }, [candidatos, pacote])

  const paginacao = usePaginacao(linhas.length)
  const daPagina = paginacao.fatia(linhas)
  const todosDaPagina = daPagina.length > 0 && daPagina.every((l) => selecionados.has(l.c.colidencia_id))

  async function decidir(ids: string[], decisao: Decisao, risco: Risco, justificativa: string) {
    setOcupado(true)
    setRodando({ decisao, ids })
    setErro(null)
    setAviso(null)
    try {
      await api('/colidencias/parecer', { metodo: 'POST', corpo: { ids, decisao, risco, justificativa } })
      await recarregar()
      setSelecionados(new Set())
      setAberto(null)
      setAviso(
        decisao === 'enviar'
          ? `${ids.length === 1 ? 'Caso enviado' : `${ids.length} casos enviados`} ao cliente, com o prazo de oposição criado.`
          : decisao === 'nao_enviar'
            ? `${ids.length === 1 ? 'Caso descartado' : `${ids.length} casos descartados`}.`
            : 'Anotação guardada; o caso continua na fila.',
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
      setRodando(null)
    }
  }

  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)
  const cancelarDescarte = useCallback(() => setConfirmandoDescarte(false), [])

  const alternar = (id: string) => {
    const s = new Set(selecionados)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSelecionados(s)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[12px]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={todosDaPagina}
            onChange={() => {
              const s = new Set(selecionados)
              for (const l of daPagina) {
                if (todosDaPagina) s.delete(l.c.colidencia_id)
                else s.add(l.c.colidencia_id)
              }
              setSelecionados(s)
            }}
          />
          selecionar os da página
        </label>
        {selecionados.size > 0 && (
          <Botao
            variante="secundaria"
            disabled={ocupado}
            carregando={rodando?.decisao === 'nao_enviar' && rodando.ids.length > 1}
            onClick={() => setConfirmandoDescarte(true)}
          >
            Descartar {selecionados.size} selecionado{selecionados.size === 1 ? '' : 's'}
          </Botao>
        )}
        {aviso && <span className="text-[var(--tx)]">✓ {aviso}</span>}
        {erro && <span className="text-[var(--color-erro)]">{erro}</span>}
      </div>

      <Confirmacao
        aberto={confirmandoDescarte}
        titulo={`Descartar ${selecionados.size} caso${selecionados.size === 1 ? '' : 's'}?`}
        rotuloConfirmar="Descartar"
        perigo
        campo={{ rotulo: 'Justificativa (fica registrada no parecer de cada caso)', inicial: DESCARTE_PADRAO }}
        aoCancelar={cancelarDescarte}
        aoConfirmar={(motivo) => {
          setConfirmandoDescarte(false)
          void decidir([...selecionados], 'nao_enviar', 'baixo', motivo)
        }}
      >
        Os casos saem da fila de análise e vão para a aba Descartadas. Nada é enviado ao cliente.
      </Confirmacao>

      <div className="flex flex-col gap-2">
        {daPagina.map(({ c, ativo, vence }) => {
          const dias = diasAte(vence, hoje)
          return (
            <div key={c.colidencia_id} className="card p-3">
              <div className="flex flex-wrap items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selecionados.has(c.colidencia_id)}
                  onChange={() => alternar(c.colidencia_id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12.5px]">
                    <span className="num text-[10.5px] text-[var(--tx3)]">{c.caso_id}</span>
                    <span className="pill pill-neu" title="fila de recuperação — não é grau de risco">
                      {c.tier}
                    </span>
                    {ativo ? (
                      <Link href={`/assets/${ativo.ativo_id}`} className="inline-flex items-center gap-1.5 font-semibold text-[var(--tx)] hover:underline">
                        <Bandeira j={ativo.jurisdicao} />
                        {nomeAtivo(ativo)}
                      </Link>
                    ) : (
                      '—'
                    )}
                    <span className="text-[var(--tx3)]">×</span>
                    <span className="font-semibold text-[var(--color-erro)]">{c.terceiro.marca}</span>
                    <span className="text-[11px] text-[var(--tx2)]">
                      de {c.terceiro.titular} · processo <span className="num">{c.terceiro.processo}</span> · classe
                      {c.terceiro.classes.length === 1 ? '' : 's'} {c.terceiro.classes.map((k) => k.codigo).join(', ')}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-[var(--tx2)]">{c.triagem.elementos_comuns}</p>
                  {c.parecer && (
                    <p className="mt-1 text-[11px] text-[var(--tx3)]">
                      Anotação de {c.parecer.por} em {dataBr(c.parecer.em)}: {c.parecer.justificativa}
                    </p>
                  )}
                </div>
                <div className="text-right text-[11px] text-[var(--tx2)]">
                  RPI <span className="num">{c.evento_gatilho.revista}</span> · {dataBr(c.evento_gatilho.data)}
                  <br />
                  oposição até <span className="num">{dataBr(vence)}</span>{' '}
                  <Chip tom={dias < 0 ? 'erro' : dias <= 15 ? 'alerta' : 'neutro'}>{textoDias(dias)}</Chip>
                </div>
                <Botao variante="secundaria" onClick={() => setAberto(aberto === c.colidencia_id ? null : c.colidencia_id)}>
                  {aberto === c.colidencia_id ? 'Fechar' : 'Analisar'}
                </Botao>
              </div>
              {aberto === c.colidencia_id && (
                <FormParecer
                  ocupado={ocupado}
                  rodando={rodando?.ids.length === 1 && rodando.ids[0] === c.colidencia_id ? rodando.decisao : null}
                  meusDados={ativo ? `${(ativo.marca?.classes ?? []).map((k) => k.codigo).join(', ') || 'sem classe'}` : ''}
                  onDecidir={(decisao, risco, justificativa) => void decidir([c.colidencia_id], decisao, risco, justificativa)}
                />
              )}
            </div>
          )
        })}
      </div>

      <Paginacao {...paginacao.props} />
    </div>
  )
}

function FormParecer({
  ocupado,
  rodando,
  meusDados,
  onDecidir,
}: {
  ocupado: boolean
  /** A decisão deste caso que está sendo gravada agora (gira o botão dela). */
  rodando: Decisao | null
  meusDados: string
  onDecidir: (decisao: Decisao, risco: Risco, justificativa: string) => void
}) {
  const [risco, setRisco] = useState<Risco>('medio')
  const [justificativa, setJustificativa] = useState('')
  const pronto = justificativa.trim().length > 0 && !ocupado

  return (
    <div className="mt-3 border-t border-[var(--linha)] pt-3">
      <p className="mb-2 text-[11px] text-[var(--tx3)]">Classes da marca da carteira: {meusDados}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label>
          <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Risco (o seu juízo)</span>
          <select
            value={risco}
            onChange={(e) => setRisco(e.target.value as Risco)}
            className="rounded border border-borda bg-transparent px-2 py-1.5 text-[12.5px]"
          >
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </label>
        <label className="min-w-[280px] flex-1">
          <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">
            Justificativa (o cliente lê, se for enviado)
          </span>
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={2}
            className="w-full rounded border border-borda bg-transparent px-2 py-1.5 text-[12.5px]"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Botao
          disabled={!pronto}
          carregando={rodando === 'enviar'}
          onClick={() => onDecidir('enviar', risco, justificativa.trim())}
          titulo="Vira ameaça no portal do cliente e cria o prazo de oposição"
        >
          Enviar ao cliente
        </Botao>
        <Botao variante="secundaria" disabled={!pronto} carregando={rodando === 'nao_enviar'} onClick={() => onDecidir('nao_enviar', risco, justificativa.trim())}>
          Descartar
        </Botao>
        <Botao variante="secundaria" disabled={!pronto} carregando={rodando === 'avaliar'} onClick={() => onDecidir('avaliar', risco, justificativa.trim())}>
          Manter em análise
        </Botao>
      </div>
    </div>
  )
}

