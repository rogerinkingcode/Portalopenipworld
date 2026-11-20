'use client'

/**
 * Importar — as três formas de trazer dado para a carteira, uma por aba.
 *
 * ⚠️ As abas só ESCONDEM as outras seções (atributo `hidden`), não as desmontam: uma importação
 *    em andamento, ou uma planilha já analisada esperando confirmação, continua viva enquanto a
 *    pessoa olha outra aba.
 */

import { useState } from 'react'
import { Cartao } from '@/componentes/ui'
import { BuscaOpenip } from '@/componentes/BuscaOpenip'
import { ImportarPlanilha } from '@/componentes/ImportarPlanilha'
import { ComplementoInpi } from '@/componentes/ComplementoInpi'

type Aba = 'inpi' | 'planilha' | 'completar'

const ABAS: { id: Aba; rotulo: string; descricao: string }[] = [
  {
    id: 'inpi',
    rotulo: 'Busca no INPI',
    descricao: 'Traz a carteira do procurador direto da base do INPI.',
  },
  {
    id: 'planilha',
    rotulo: 'Planilha',
    descricao: 'Carga inicial ou o que o INPI não traz (Madri, exterior, outro procurador).',
  },
  {
    id: 'completar',
    rotulo: 'Completar pelo INPI',
    descricao: 'Busca a situação e os despachos das marcas que vieram só da planilha.',
  },
]

export default function Importar() {
  const [aba, setAba] = useState<Aba>('inpi')
  const atual = ABAS.find((a) => a.id === aba)!

  return (
    <div className="space-y-4">
      <header>
        <h1
          className="text-[21px] font-semibold tracking-tight text-[var(--tx)]"
          style={{ fontFamily: 'var(--font-titulo)' }}
        >
          Importar
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">{atual.descricao}</p>
      </header>

      <div className="overflow-x-auto">
        <div className="seg w-max" role="tablist" aria-label="Formas de importar">
          {ABAS.map((a) => (
            <button
              key={a.id}
              role="tab"
              aria-selected={aba === a.id}
              data-on={aba === a.id ? 'sim' : 'nao'}
              onClick={() => setAba(a.id)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div hidden={aba !== 'inpi'} role="tabpanel" className="space-y-4">
        <BuscaOpenip />
      </div>

      <div hidden={aba !== 'planilha'} role="tabpanel" className="space-y-4">
        <ImportarPlanilha />

        <Cartao titulo="Como a planilha é lida">
          <ul className="space-y-1.5 text-[12.5px] text-tx2">
            <li>
              <strong className="text-tinta">Nada é descartado em silêncio.</strong> Linha recusada
              aparece acima com o número da linha, a coluna, o valor e o motivo.
            </li>
            <li>
              <strong className="text-tinta">O bruto é preservado.</strong> Todo valor normalizado
              guarda o original ao lado — inclusive o dígito verificador de{' '}
              <span className="tabular">BR 10 2022 000101-0</span>.
            </li>
            <li>
              <strong className="text-tinta">Multiclasse vira uma relação por classe</strong>,
              mantendo a linha original.
            </li>
            <li>
              <strong className="text-tinta">Identificador interno (ND) fica separado</strong> e
              nunca é comparado como número do INPI.
            </li>
            <li>
              <strong className="text-tinta">Titular ≠ cliente.</strong> São vínculos diferentes;
              ativo sem titular vira pendência, não some.
            </li>
            <li>
              <strong className="text-tinta">Soma, não substitui.</strong> O que veio do INPI ganha
              no que o INPI publica (situação, datas, classes, titular); a planilha acrescenta o que
              é da casa.
            </li>
            <li>
              <strong className="text-tinta">Datas pelo valor da célula.</strong> Texto ambíguo como
              <span className="tabular"> 5/10/36</span> é recusado, nunca adivinhado.
            </li>
            <li>
              <strong className="text-tinta">Vigilância nasce desligada</strong> enquanto a leitura
              semanal da RPI não estiver ligada.
            </li>
          </ul>
          <p className="mt-3 text-[10.5px] text-tx2">
            Colunas reconhecidas: PROCESSO · ND · MARCA · ESPECIE/MATERIA · JURISDICAO/PAIS ·
            TITULAR · TITULAR DOCUMENTO · CLIENTE · PARCEIRO · AGENTE · PROCURADOR · CLASSE · EDICAO
            NCL · ESPECIFICACAO · CFE · DATA DEPOSITO · DATA CONCESSAO · DATA VIGENCIA · SITUACAO ·
            ULTIMO DESPACHO · VIGILANCIA ATIVA. A base-mestra é reconhecida pelos nomes que ela já
            usa.
          </p>
        </Cartao>
      </div>

      <div hidden={aba !== 'completar'} role="tabpanel" className="space-y-4">
        <ComplementoInpi />
      </div>
    </div>
  )
}
