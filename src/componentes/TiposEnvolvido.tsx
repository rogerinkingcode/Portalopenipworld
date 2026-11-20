'use client'

/**
 * Tipos de envolvido da planilha — os nomes PRÓPRIOS da empresa e o papel de cada um.
 *
 * A planilha diz o papel de cada pessoa pelo "TIPO DO ENVOLVIDO". Os termos do mercado (Cliente,
 * Parceiro, Agente…) o sistema já entende sozinho; nomes da casa — o de um canal de vendas, o de
 * um escritório parceiro — cada empresa cadastra aqui. Vale da próxima análise em diante.
 *
 * A equipe vê; só o admin altera.
 */

import { useCallback, useEffect, useState } from 'react'
import { useSessao } from './EstadoSessao'
import { BotaoIcone, Cartao, Chip, Girando, IconeLixeira } from './ui'
import { Osso } from './Esqueleto'
import { toast, useMensagem } from './Toast'
import { api } from '@/lib/api'

type Papel = 'cliente' | 'parceiro' | 'agente' | 'titular' | 'ignorar'
type Apelido = { tipo: string; papel: Papel }

const PAPEL_ROTULO: Record<Papel, string> = {
  cliente: 'Cliente',
  parceiro: 'Parceiro',
  agente: 'Agente (nunca vai ao cliente)',
  titular: 'Titular',
  ignorar: 'Ignorar (não é do nosso lado)',
}

/** A mesma normalização do servidor: maiúsculo, sem acento, espaços simples. */
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

const CAMPO =
  'h-9 w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 text-[12.5px] text-[var(--tx)] outline-none focus:border-[var(--color-ciano)] disabled:opacity-60'

export function TiposEnvolvido({ sugestoes = [] }: { sugestoes?: { tipo: string; linhas: number }[] }) {
  const { usuario } = useSessao()
  const ehAdmin = usuario?.role === 'admin'
  const [, setErro] = useMensagem('erro')
  const [genericos, setGenericos] = useState<Apelido[] | null>(null)
  const [lista, setLista] = useState<Apelido[]>([])
  const [salvo, setSalvo] = useState<string>('[]')
  const [salvando, setSalvando] = useState(false)
  const [verGenericos, setVerGenericos] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const r = await api<{ genericos: Apelido[]; apelidos: Apelido[] }>('/configuracoes/envolvidos')
      setGenericos(r.genericos)
      const l = r.apelidos.map((a) => ({ tipo: a.tipo, papel: a.papel }))
      setLista(l)
      setSalvo(JSON.stringify(l))
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }, [setErro])

  useEffect(() => {
    // Leitura da configuração na API — sincronização com sistema externo; setState depois do await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar()
  }, [carregar])

  const mudou = JSON.stringify(lista) !== salvo
  const jaTem = new Set(lista.map((a) => normalizar(a.tipo)))
  const pendentes = sugestoes.filter((s) => !jaTem.has(normalizar(s.tipo)))

  function adicionar(tipo = '', papel: Papel = 'cliente') {
    setLista((l) => [...l, { tipo, papel }])
  }

  async function salvar() {
    setSalvando(true)
    try {
      const corpo = lista.filter((a) => a.tipo.trim()).map((a) => ({ tipo: a.tipo, papel: a.papel }))
      const r = await api<{ apelidos: Apelido[] }>('/configuracoes/envolvidos', { metodo: 'PUT', corpo: { apelidos: corpo } })
      setLista(r.apelidos)
      setSalvo(JSON.stringify(r.apelidos))
      toast.sucesso('Tipos de envolvido salvos. Analise a planilha de novo para eles valerem.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Cartao titulo="Tipos de envolvido da sua planilha">
      <p className="text-[12px] leading-relaxed text-[var(--tx2)]">
        A planilha diz quem é cliente, parceiro ou agente pela coluna <strong className="text-[var(--tx)]">TIPO DO ENVOLVIDO</strong>. Os termos do
        mercado o sistema entende sozinho; os nomes próprios do seu escritório (um canal de vendas, um escritório parceiro) você cadastra aqui.
        <button type="button" onClick={() => setVerGenericos(!verGenericos)} className="ml-1 font-semibold text-[var(--color-petrol-cla)] hover:underline">
          {verGenericos ? 'Esconder o que já é entendido' : 'Ver o que já é entendido'}
        </button>
      </p>

      {verGenericos && genericos && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {genericos.map((g) => (
            <Chip key={g.tipo} tom="neutro" titulo={PAPEL_ROTULO[g.papel]}>
              {g.tipo} → {PAPEL_ROTULO[g.papel].split(' ')[0]}
            </Chip>
          ))}
        </div>
      )}

      {pendentes.length > 0 && (
        <div className="mt-3 rounded-lg border border-[rgba(230,138,0,.35)] bg-[rgba(230,138,0,.08)] p-3">
          <p className="text-[12px] text-[var(--tx)]">
            <strong>A última análise encontrou tipos que o sistema não reconheceu.</strong> As linhas entraram, mas sem esses envolvidos:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pendentes.map((s) => (
              <span key={s.tipo} className="inline-flex items-center gap-2 rounded-lg border border-[var(--brd)] bg-[var(--fundo)] px-2.5 py-1 text-[11.5px]">
                <strong className="text-[var(--tx)]">{s.tipo}</strong>
                <span className="text-[var(--tx3)]">
                  {s.linhas} linha{s.linhas === 1 ? '' : 's'}
                </span>
                {ehAdmin && (
                  <button type="button" onClick={() => adicionar(s.tipo)} className="font-semibold text-[var(--color-petrol-cla)] hover:underline">
                    Cadastrar
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        {!genericos ? (
          <div className="space-y-2" role="status" aria-busy="true">
            <span className="sr-only">Carregando…</span>
            <Osso h={36} r={8} />
            <Osso h={36} r={8} />
          </div>
        ) : lista.length === 0 ? (
          <p className="py-2 text-[12px] text-[var(--tx3)]">Nenhum nome próprio cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {lista.map((a, i) => (
              <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_260px_auto]">
                <input
                  value={a.tipo}
                  disabled={!ehAdmin}
                  onChange={(e) => setLista((l) => l.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)))}
                  placeholder="Como está na planilha (ex.: o nome de um parceiro)"
                  aria-label="Tipo do envolvido, como está na planilha"
                  className={CAMPO}
                />
                <select
                  value={a.papel}
                  disabled={!ehAdmin}
                  onChange={(e) => setLista((l) => l.map((x, j) => (j === i ? { ...x, papel: e.target.value as Papel } : x)))}
                  aria-label="Papel"
                  className={CAMPO}
                >
                  {(Object.keys(PAPEL_ROTULO) as Papel[]).map((p) => (
                    <option key={p} value={p}>
                      {PAPEL_ROTULO[p]}
                    </option>
                  ))}
                </select>
                {ehAdmin && (
                  <BotaoIcone rotulo={`Remover “${a.tipo || 'linha vazia'}”`} variante="perigo" onClick={() => setLista((l) => l.filter((_, j) => j !== i))}>
                    <IconeLixeira />
                  </BotaoIcone>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {ehAdmin ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => adicionar()}
            className="rounded-lg border border-[var(--brd)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--tx)] transition hover:border-[var(--color-ciano)]"
          >
            + Adicionar nome
          </button>
          <button
            type="button"
            disabled={!mudou || salvando}
            onClick={() => void salvar()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11.5px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: 'var(--font-titulo)', background: 'linear-gradient(135deg,#2589A8,#1A6581)' }}
          >
            {salvando && <Girando />}
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
          {mudou && !salvando && <span className="text-[11px] text-[var(--tx3)]">Alterações não salvas.</span>}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-[var(--tx3)]">Só o administrador da empresa altera esta lista.</p>
      )}
    </Cartao>
  )
}
