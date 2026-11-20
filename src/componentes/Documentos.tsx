'use client'

/**
 * Enviar, baixar, liberar ao cliente e apagar documentos — usado na tela Documentos e na aba
 * Documentos do ativo.
 *
 * O arquivo vai em bytes para a API, que confere o tipo pelo CONTEÚDO (PDF, imagem, Word, Excel)
 * e guarda pelo hash. O download é sempre pela API autenticada (`/api/backend/documentos/:id/
 * arquivo`): nunca há link público. Para o cliente, só sai o que for publicável e dele.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { Pacote } from '@/contrato/tipos'
import { usePortfolio } from './EstadoPortfolio'
import { normalizarBusca } from './BuscaPessoa'
import { Botao, LinkIcone, IconeOlho, IconeBaixar } from './ui'
import { Confirmacao } from './Confirmacao'
import { api, BASE_API } from '@/lib/api'
import { rotuloDocumento } from '@/lib/rotulos'
import { nomeAtivo } from '@/lib/visao'
import { useMensagem, toast } from './Toast'

type Documento = Pacote['documentos'][number]

export const TIPOS_DOCUMENTO = [
  'certificado',
  'procuracao',
  'peticao',
  'comprovante_gru',
  'recibo_protocolo',
  'relatorio_colidencia',
  'carta_agente',
  'contrato',
  'comunicado',
  'imagem_marca',
  'outro',
] as const

/** O mesmo teto da API (backend/src/modules/core/documentos/DocumentosRouter.ts). */
const LIMITE_BYTES = 20 * 1024 * 1024

export const linkDoArquivo = (id: string, ver = false) => `${BASE_API}/documentos/${id}/arquivo${ver ? '?ver=1' : ''}`

export function EnviarDocumento({ ativoFixo }: { ativoFixo?: string }) {
  const { pacote, recarregar } = usePortfolio()
  const [ativoId, setAtivoId] = useState(ativoFixo ?? '')
  const [tipo, setTipo] = useState<string>('certificado')
  const [publicavel, setPublicavel] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useMensagem('erro')
  const [aviso, setAviso] = useMensagem('sucesso')
  const entrada = useRef<HTMLInputElement | null>(null)
  const [arrastando, setArrastando] = useState(false)

  async function enviar() {
    if (!arquivo || !ativoId) return
    setErro(null)
    setAviso(null)
    if (arquivo.size > LIMITE_BYTES) {
      setErro(`O arquivo tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB; o limite é 20 MB.`)
      return
    }
    setOcupado(true)
    try {
      const q = new URLSearchParams({ ativo_id: ativoId, tipo, publicavel: publicavel ? '1' : '0' })
      await api(`/documentos?${q}`, { metodo: 'POST', arquivo })
      await recarregar()
      setAviso(`${arquivo.name} enviado${publicavel ? ' — o cliente já vê no portal' : ''}.`)
      setArquivo(null)
      if (entrada.current) entrada.current.value = ''
      if (!ativoFixo) setAtivoId('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  function escolher(f: File | null) {
    setErro(null)
    setAviso(null)
    if (f && !ACEITOS.test(f.name)) {
      setErro('Tipo de arquivo não aceito: envie PDF, imagem (PNG, JPG, WEBP), Word ou Excel.')
      return
    }
    if (f && f.size > LIMITE_BYTES) {
      setErro(`O arquivo tem ${(f.size / 1024 / 1024).toFixed(1)} MB; o limite é 20 MB.`)
      return
    }
    setArquivo(f)
  }

  function tirarArquivo() {
    setArquivo(null)
    if (entrada.current) entrada.current.value = ''
  }

  const falta = !arquivo ? 'Escolha o arquivo' : !ativoId ? 'Escolha o ativo' : null

  return (
    <div className="flex flex-col gap-3">
      {/* ── 1. O arquivo: a área inteira é clicável e aceita arrastar e soltar ── */}
      <input
        ref={entrada}
        type="file"
        accept={ACEITOS_INPUT}
        onChange={(e) => escolher(e.target.files?.[0] ?? null)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      {!arquivo ? (
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastando(false)
            escolher(e.dataTransfer.files?.[0] ?? null)
          }}
          className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition"
          style={{
            borderColor: arrastando ? 'var(--color-ciano)' : 'var(--brd-forte)',
            background: arrastando ? 'rgba(0,224,246,.08)' : 'var(--sup2)',
          }}
        >
          <span
            className="grid h-11 w-11 place-items-center rounded-full transition group-hover:scale-105"
            style={{ background: 'rgba(0,224,246,.12)', color: 'var(--color-petrol-cla)' }}
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
            </svg>
          </span>
          <span className="text-[13px] font-semibold text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
            {arrastando ? 'Solte o arquivo aqui' : 'Clique para escolher o arquivo'}
          </span>
          <span className="text-[11.5px] text-[var(--tx2)]">
            ou arraste e solte aqui · PDF, imagem (PNG, JPG, WEBP), Word ou Excel · até 20 MB
          </span>
        </button>
      ) : (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
          style={{ borderColor: 'var(--color-ciano)', background: 'rgba(0,224,246,.06)' }}
        >
          <span
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg text-[10px] font-bold uppercase"
            style={{ background: 'rgba(0,224,246,.14)', color: 'var(--color-petrol-cla)', fontFamily: 'var(--font-titulo)' }}
            aria-hidden
          >
            {extensao(arquivo.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold text-[var(--tx)]" title={arquivo.name}>
              {arquivo.name}
            </span>
            <span className="num block text-[11px] text-[var(--tx2)]">{tamanho(arquivo.size)}</span>
          </span>
          <Botao variante="secundaria" onClick={() => entrada.current?.click()} disabled={ocupado}>
            Trocar
          </Botao>
          <Botao variante="secundaria" onClick={tirarArquivo} disabled={ocupado}>
            Remover
          </Botao>
        </div>
      )}

      {/* ── 2. Os dados do documento e o envio ── */}
      <div className="flex flex-wrap items-end gap-3">
        {!ativoFixo && <BuscaAtivo ativos={pacote.ativos} valor={ativoId} onEscolher={setAtivoId} />}
        <label>
          <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Categoria</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="h-9 rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-2.5 text-[12.5px] text-[var(--tx)]"
          >
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t} value={t}>
                {rotuloDocumento(t)}
              </option>
            ))}
          </select>
        </label>
        {/* Mesma estrutura dos outros campos (rótulo em cima, caixa de 36 px embaixo): assim a
            chave e o texto ficam centralizados na altura dos campos vizinhos. */}
        <label className="cursor-pointer">
          <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">O cliente pode ver?</span>
          <span className="flex h-9 items-center gap-2.5 rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3 text-[12px] text-[var(--tx)]">
            <input type="checkbox" checked={publicavel} onChange={(e) => setPublicavel(e.target.checked)} />
            {publicavel ? 'Sim, aparece no portal' : 'Não, só a equipe'}
          </span>
        </label>
        <span className="ml-auto flex h-9 items-center gap-2">
          {falta && !ocupado && <span className="text-[11px] text-[var(--tx3)]">{falta}</span>}
          <Botao disabled={!!falta} carregando={ocupado} onClick={() => void enviar()}>
            {ocupado ? 'Enviando…' : 'Enviar documento'}
          </Botao>
        </span>
      </div>
      {erro && <p className="text-[12px] text-[var(--color-erro)]">{erro}</p>}
      {aviso && <p className="text-[12px] text-[var(--tx)]">✓ {aviso}</p>}
    </div>
  )
}

/** Os mesmos tipos que a API aceita (ela confere de novo pelo conteúdo). */
const ACEITOS_INPUT = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx'
const ACEITOS = /\.(pdf|png|jpe?g|webp|docx?|xlsx?)$/i

const extensao = (nome: string) => (nome.split('.').pop() ?? '').slice(0, 4)

function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

/** Baixar · liberar/recolher do cliente · apagar. */
export function AcoesDocumento({ d }: { d: Documento }) {
  const { recarregar } = usePortfolio()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useMensagem('erro')
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)
  const [apagando, setApagando] = useState(false)
  const cancelarApagar = useCallback(() => setConfirmandoApagar(false), [])

  async function fazer(fn: () => Promise<unknown>, ok: string) {
    setOcupado(true)
    setErro(null)
    try {
      await fn()
      await recarregar()
      toast.sucesso(ok)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <LinkIcone href={linkDoArquivo(d.documento_id, true)} rotulo={`Abrir ${d.nome} numa nova aba`} novaAba>
        <IconeOlho />
      </LinkIcone>
      <LinkIcone href={linkDoArquivo(d.documento_id)} rotulo={`Baixar ${d.nome}`} baixar>
        <IconeBaixar />
      </LinkIcone>
      <Botao
        variante="secundaria"
        disabled={ocupado}
        titulo={d.publicavel ? 'Tira do portal do cliente' : 'Passa a aparecer no portal do cliente, com o seu nome como quem liberou'}
        onClick={() =>
          void fazer(
            () => api(`/documentos/${d.documento_id}`, { metodo: 'PUT', corpo: { publicavel: !d.publicavel } }),
            d.publicavel ? `${d.nome} saiu do portal do cliente.` : `${d.nome} liberado: o cliente já vê no portal.`,
          )
        }
      >
        {d.publicavel ? 'Recolher do cliente' : 'Liberar ao cliente'}
      </Botao>
      <Botao variante="secundaria" disabled={ocupado} carregando={apagando} onClick={() => setConfirmandoApagar(true)}>
        Apagar
      </Botao>
      <Confirmacao
        aberto={confirmandoApagar}
        titulo="Apagar este documento?"
        rotuloConfirmar="Apagar"
        perigo
        aoCancelar={cancelarApagar}
        aoConfirmar={async () => {
          setConfirmandoApagar(false)
          setApagando(true)
          try {
            await fazer(() => api(`/documentos/${d.documento_id}`, { metodo: 'DELETE' }), `${d.nome} apagado.`)
          } finally {
            setApagando(false)
          }
        }}
      >
        <strong className="text-[var(--tx)]">{d.nome}</strong> sai da carteira
        {d.publicavel ? ' e do portal do cliente' : ''}. Se ninguém mais usar o mesmo arquivo, ele é
        apagado do servidor de vez.
      </Confirmacao>
      {erro && <span className="text-[11px] text-[var(--color-erro)]">{erro}</span>}
    </span>
  )
}

function BuscaAtivo({
  ativos,
  valor,
  onEscolher,
}: {
  ativos: Pacote['ativos']
  valor: string
  onEscolher: (id: string) => void
}) {
  const [texto, setTexto] = useState('')
  const [aberta, setAberta] = useState(false)
  const escolhido = ativos.find((a) => a.ativo_id === valor)
  const indice = useMemo(
    () => ativos.map((a) => ({ a, chave: normalizarBusca(`${nomeAtivo(a)} ${a.identificadores.map((i) => i.valor_normalizado).join(' ')}`) })),
    [ativos],
  )
  const t = normalizarBusca(texto)
  const achados = t.length < 2 ? [] : indice.filter((x) => x.chave.includes(t)).slice(0, 8)

  return (
    <label className="relative min-w-[280px] flex-1">
      <span className="mb-1 block text-[10.5px] text-[var(--tx2)]">Ativo (marca ou número)</span>
      <input
        value={escolhido && !aberta ? `${nomeAtivo(escolhido)} · ${escolhido.identificadores[0]?.valor_normalizado ?? ''}` : texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAberta(true)
          if (valor) onEscolher('')
        }}
        onFocus={() => setAberta(true)}
        onBlur={() => setTimeout(() => setAberta(false), 150)}
        placeholder="Digite ao menos 2 letras…"
        className="h-9 w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-2.5 text-[12.5px] text-[var(--tx)] outline-none focus:border-[var(--color-ciano)]"
      />
      {aberta && achados.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded border border-borda bg-[var(--fundo)] shadow-lg">
          {achados.map(({ a }) => (
            <li key={a.ativo_id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onEscolher(a.ativo_id)
                  setTexto('')
                  setAberta(false)
                }}
                className="flex w-full items-baseline justify-between gap-2 px-2 py-1.5 text-left text-[12px] hover:bg-[var(--sup2)]"
              >
                <span>{nomeAtivo(a)}</span>
                <span className="num text-[10px] text-tx2">{a.identificadores[0]?.valor_normalizado}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}
