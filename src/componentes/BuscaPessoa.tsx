'use client'

import { useState } from 'react'

/** Upper, sem acento — a mesma forma do `nome_normalizado` do contrato. */
export const normalizarBusca = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()

/**
 * Escolha de pessoa por busca: ~900 pessoas não cabem num select (e um select por linha
 * montava centenas de milhares de opções). Mostra as 8 que casam, as mais usadas primeiro.
 */
export function BuscaPessoa({
  pessoas,
  comoCliente,
  valor,
  onEscolher,
  rotulo = 'Outra pessoa',
  obrigatorio,
}: {
  pessoas: { pessoa_id: string; nome: string; nome_normalizado: string }[]
  /** Quantos ativos a pessoa tem como cliente: ordena a lista e aparece como dica. */
  comoCliente?: Map<string, number>
  valor: string
  onEscolher: (pessoaId: string) => void
  rotulo?: string
  obrigatorio?: boolean
}) {
  const [texto, setTexto] = useState('')
  const [aberta, setAberta] = useState(false)
  const escolhida = pessoas.find((p) => p.pessoa_id === valor)
  const t = normalizarBusca(texto)
  const achadas =
    t.length < 2
      ? []
      : pessoas
          .filter((p) => p.nome_normalizado.includes(t) || normalizarBusca(p.nome).includes(t))
          .sort((a, b) => (comoCliente?.get(b.pessoa_id) ?? 0) - (comoCliente?.get(a.pessoa_id) ?? 0))
          .slice(0, 8)

  return (
    <label className="relative min-w-[260px] flex-1">
      <span className="mb-1 block text-[10.5px] text-tx2">{rotulo}</span>
      <input
        value={escolhida && !aberta ? escolhida.nome : texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAberta(true)
          if (valor) onEscolher('')
        }}
        onFocus={() => setAberta(true)}
        onBlur={() => setTimeout(() => setAberta(false), 150)}
        placeholder="Digite ao menos 2 letras…"
        required={obrigatorio && !valor}
        className="w-full rounded border border-borda bg-transparent px-2 py-1.5 text-[12.5px] outline-none focus:border-petrol"
      />
      {aberta && achadas.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded border border-borda bg-[var(--fundo)] shadow-lg">
          {achadas.map((p) => (
            <li key={p.pessoa_id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onEscolher(p.pessoa_id)
                  setTexto(p.nome)
                  setAberta(false)
                }}
                className="flex w-full items-baseline justify-between gap-2 px-2 py-1.5 text-left text-[12px] hover:bg-[var(--sup2)]"
              >
                <span>{p.nome}</span>
                {comoCliente?.get(p.pessoa_id) ? (
                  <span className="text-[10px] text-tx2">cliente em {comoCliente.get(p.pessoa_id)}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}
