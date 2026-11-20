'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useCliente } from './EstadoCliente'
import { rotuloPapel } from '@/lib/rotulos'

/** Com ~800 pessoas com portal possível, a lista inteira não cabe: busca, recorte e página. */
const POR_PAGINA = 20

type Recorte = 'cliente' | 'parceiro' | 'titular' | 'todos'
const RECORTES: { id: Recorte; rotulo: string }[] = [
  { id: 'cliente', rotulo: 'Clientes' },
  { id: 'parceiro', rotulo: 'Parceiros' },
  { id: 'titular', rotulo: 'Titulares' },
  { id: 'todos', rotulo: 'Todos' },
]

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()

export function SeletorCliente() {
  const { candidatos, escolher } = useCliente()
  const [busca, setBusca] = useState('')
  const [recorte, setRecorte] = useState<Recorte>('cliente')
  const [limite, setLimite] = useState(POR_PAGINA)

  const porRecorte = useMemo(
    (): Record<Recorte, typeof candidatos> => ({
      cliente: candidatos.filter((c) => c.papeis.includes('cliente')),
      parceiro: candidatos.filter((c) => c.papeis.includes('parceiro')),
      titular: candidatos.filter((c) => c.papeis.includes('titular') || c.papeis.includes('cotitular')),
      todos: candidatos,
    }),
    [candidatos],
  )
  const q = normalizar(busca)
  const visiveis = q ? porRecorte[recorte].filter((c) => normalizar(c.nome).includes(q)) : porRecorte[recorte]

  return (
    <div className="mx-auto max-w-3xl py-6">
      <h1
        className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
        style={{ fontFamily: 'var(--font-titulo)' }}
      >
        Portal do cliente
      </h1>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--tx2)]">
        Esta é a tela que o cliente vê ao entrar — só os ativos dele, sem nada do que é interno da
        casa. Escolha de quem você quer pré-visualizar o portal.
      </p>

      {candidatos.length === 0 ? (
        <div className="nota mt-5">
          Nenhuma pessoa tem vínculo publicável na base carregada.{' '}
          <Link href="/import" className="font-semibold text-[var(--color-petrol-cla)]">
            Importe a carteira
          </Link>{' '}
          para ver o portal com dado.
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            {RECORTES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRecorte(r.id)
                  setLimite(POR_PAGINA)
                }}
                className="rounded-lg border px-2.5 py-1 text-[10.5px] font-semibold transition"
                style={{
                  fontFamily: 'var(--font-titulo)',
                  borderColor: recorte === r.id ? 'var(--color-ciano)' : 'var(--brd)',
                  background: recorte === r.id ? 'rgba(0,224,246,.1)' : 'transparent',
                  color: recorte === r.id ? 'var(--tx)' : 'var(--tx2)',
                }}
              >
                {r.rotulo} <span className="num text-[var(--tx3)]">{porRecorte[r.id].length}</span>
              </button>
            ))}
          </div>
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setLimite(POR_PAGINA)
            }}
            placeholder="Buscar pelo nome"
            className="mt-3 w-full rounded-lg border border-[var(--brd)] bg-[var(--sup2)] px-3.5 py-2 text-[12.5px] text-[var(--tx)] placeholder:text-[var(--tx3)]"
          />

          {visiveis.length === 0 ? (
            <p className="mt-6 text-center text-[12.5px] text-[var(--tx2)]">Ninguém com esse nome neste recorte.</p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {visiveis.slice(0, limite).map((c) => (
                <button
                  key={c.pessoa_id}
                  onClick={() => escolher(c.pessoa_id)}
                  className="card card-i flex items-center gap-3 p-3.5 text-left"
                >
                  <span
                    className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg text-[13px] font-bold text-white"
                    style={{
                      background: 'linear-gradient(135deg,#2589A8,#1A6581)',
                      fontFamily: 'var(--font-titulo)',
                    }}
                  >
                    {c.nome.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[12.5px] font-semibold text-[var(--tx)]"
                      style={{ fontFamily: 'var(--font-titulo)' }}
                    >
                      {c.nome}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className="pill pill-neu">{rotuloPapel(c.papel)}</span>
                      <span className="num text-[10.5px] text-[var(--tx3)]">
                        {c.ativos} {c.ativos === 1 ? 'ativo' : 'ativos'}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {limite < visiveis.length && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => setLimite(limite + POR_PAGINA)}
                className="rounded-lg border border-[var(--brd)] px-3.5 py-2 text-[12px] font-semibold text-[var(--tx2)] hover:text-[var(--tx)]"
              >
                Mostrar mais ({visiveis.length - limite} restantes)
              </button>
            </div>
          )}
        </>
      )}

      <div className="nota mt-6">
        <strong className="text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
          Como o cliente entra
        </strong>
        <p className="mt-1.5">
          Com o login dele, criado em <span className="font-semibold">Usuários</span> e ligado à
          pessoa da carteira. Ao entrar, ele cai direto no portal dele — sem esta escolha, e sem
          acesso ao painel do gestor.
        </p>
        <p className="mt-1.5">
          O recorte é projetado no servidor e passa por uma auditoria que{' '}
          <strong className="text-[var(--tx)]">aborta</strong> se algum campo interno escapar. O
          navegador do cliente nunca recebe a carteira inteira.
        </p>
      </div>
    </div>
  )
}
