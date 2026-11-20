'use client'

/**
 * Exportar — tirar a carteira do sistema.
 *
 *   Planilha (Excel)   o que o escritório usa: a carteira e os prazos, uma linha por ativo/prazo,
 *                      com titular, cliente, situação e o que vence. Gerada no navegador a partir
 *                      da carteira já carregada — nada novo sai do servidor.
 *   Visão do cliente   o recorte EXATO que um cliente recebe no portal, pedido ao SERVIDOR (a mesma
 *                      projeção + auditoria do portal). Serve para conferir o que ele vê.
 *   Pacote técnico     o JSON do contrato de dados, para integração e depuração.
 *
 * ⚠️ Nenhum dos três é BACKUP. O pacote não leva logins, arquivos dos documentos, apelidos de
 *    pessoas juntadas nem vigilâncias desligadas. Backup é o do banco + o do bucket (Backblaze B2).
 */

import { useMemo, useState } from 'react'
import { usePortfolio } from '@/componentes/EstadoPortfolio'
import { BuscaPessoa } from '@/componentes/BuscaPessoa'
import { Botao, Cartao, Chip, Vazio } from '@/componentes/ui'
import { CONTRATO_VERSAO, zPacote } from '@/contrato/tipos'
import { repositorio } from '@/repositorio/api'
import { rotuloEspecie, rotuloJurisdicao } from '@/lib/rotulos'
import { ESTADO_PRAZO_ROTULO, estadoDoPrazo, nomeAtivo, prazoATratar, processoEncerrado } from '@/lib/visao'
import { useMensagem, toast } from '@/componentes/Toast'
import { EsqExportar } from '@/componentes/EsqueletosDasPaginas'

const dataPlanilha = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '')

function baixarArquivo(nome: string, conteudo: BlobPart, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
  toast.sucesso(`Arquivo baixado: ${nome}`)
}

export default function Exportar() {
  const { pacote, carregando, hoje } = usePortfolio()
  const [gerando, setGerando] = useState(false)
  const [pessoaId, setPessoaId] = useState('')
  const [previa, setPrevia] = useState<{ nome: string; json: string; ativos: number; prazos: number; documentos: number; ameacas: number } | null>(null)
  const [erro, setErro] = useMensagem('erro')
  const [mostrarJson, setMostrarJson] = useState(false)
  const [gerandoPrevia, setGerandoPrevia] = useState(false)

  // Quem tem portal possível: vínculo publicável de titular, cliente ou parceiro.
  const candidatos = useMemo(() => {
    const ids = new Set(
      pacote.vinculos.filter((v) => v.publicavel && ['titular', 'cotitular', 'cliente', 'parceiro'].includes(v.papel)).map((v) => v.pessoa_id),
    )
    return pacote.pessoas.filter((p) => ids.has(p.pessoa_id))
  }, [pacote])

  const validacao = useMemo(() => {
    const r = zPacote.safeParse(pacote)
    return r.success ? { ok: true as const, problemas: [] as string[] } : { ok: false as const, problemas: r.error.issues.slice(0, 20).map((i) => `${i.path.join('.')}: ${i.message}`) }
  }, [pacote])

  async function baixarPlanilha() {
    setGerando(true)
    setErro(null)
    try {
      const XLSX = await import('xlsx')
      const nomes = new Map(pacote.pessoas.map((p) => [p.pessoa_id, p.nome]))
      const porPapel = (ativoId: string, papeis: string[]) =>
        pacote.vinculos
          .filter((v) => v.ativo_id === ativoId && papeis.includes(v.papel))
          .map((v) => nomes.get(v.pessoa_id) ?? '')
          .filter(Boolean)
          .join(' · ')
      const vinculosPorAtivo = new Map<string, true>()
      for (const v of pacote.vinculos) vinculosPorAtivo.set(v.ativo_id, true)
      const ativoPorId = new Map(pacote.ativos.map((a) => [a.ativo_id, a]))
      const prazosPorAtivo = new Map<string, typeof pacote.prazos>()
      for (const z of pacote.prazos) prazosPorAtivo.set(z.ativo_id, [...(prazosPorAtivo.get(z.ativo_id) ?? []), z])

      const carteira = [...pacote.ativos]
        .sort((a, b) => nomeAtivo(a).localeCompare(nomeAtivo(b), 'pt-BR'))
        .map((a) => {
          const aTratar = (prazosPorAtivo.get(a.ativo_id) ?? []).filter((z) => prazoATratar(z, hoje)).sort((x, y) => x.vence_em.localeCompare(y.vence_em))
          return {
            Ativo: nomeAtivo(a),
            Processo: a.identificadores.map((i) => i.valor_normalizado).join(' · '),
            Espécie: rotuloEspecie(a.especie),
            Jurisdição: rotuloJurisdicao(a.jurisdicao),
            Classes: [...new Set((a.marca?.classes ?? []).map((c) => c.codigo))].join(', '),
            Titular: porPapel(a.ativo_id, ['titular', 'cotitular']),
            Cliente: porPapel(a.ativo_id, ['cliente']),
            Parceiro: porPapel(a.ativo_id, ['parceiro']),
            Situação: a.situacao.texto,
            Encerrado: processoEncerrado(a.situacao.texto) ? 'sim' : '',
            Depósito: dataPlanilha(a.datas.deposito),
            Concessão: dataPlanilha(a.datas.concessao),
            'Vigência até': dataPlanilha(a.datas.vigencia_ate),
            Vigiada: a.vigilancia.ativa ? 'sim' : 'não',
            'Prazos a tratar': aTratar.length || '',
            'Próximo vencimento': dataPlanilha(aTratar[0]?.vence_em),
            'Próximo prazo': aTratar[0]?.regua.nome ?? '',
            Origem: a.fonte === 'inpi_consulta' ? 'INPI' : a.fonte === 'upload_manual' ? 'planilha' : a.fonte,
          }
        })

      const prazos = [...pacote.prazos]
        .sort((a, b) => a.vence_em.localeCompare(b.vence_em))
        .map((z) => {
          const a = ativoPorId.get(z.ativo_id)
          return {
            'Vence em': dataPlanilha(z.vence_em),
            Situação: ESTADO_PRAZO_ROTULO[estadoDoPrazo(z, hoje)],
            Prazo: z.regua.nome,
            Firmeza: z.firmeza,
            Ativo: a ? nomeAtivo(a) : '',
            Processo: a?.identificadores[0]?.valor_normalizado ?? '',
            Cliente: porPapel(z.ativo_id, ['cliente']),
            Titular: porPapel(z.ativo_id, ['titular', 'cotitular']),
            'Abre em': dataPlanilha(z.abre_em),
            'Prazo interno': dataPlanilha(z.prazo_interno_em),
            'Extraordinário até': dataPlanilha(z.vence_extraordinario_em),
            'Cumprido em': dataPlanilha(z.cumprido?.em),
            Fundamento: z.regua.fundamento,
          }
        })

      const wb = XLSX.utils.book_new()
      for (const [nome, linhas] of [
        ['Carteira', carteira],
        ['Prazos', prazos],
      ] as const) {
        const ws = XLSX.utils.json_to_sheet(linhas as object[])
        // Largura das colunas pelo conteúdo (com teto), para abrir legível.
        const colunas = Object.keys(linhas[0] ?? {})
        ws['!cols'] = colunas.map((c) => ({
          wch: Math.min(60, Math.max(c.length, ...(linhas as Record<string, unknown>[]).slice(0, 500).map((l) => String(l[c] ?? '').length)) + 2),
        }))
        ws['!autofilter'] = { ref: ws['!ref'] ?? 'A1' }
        XLSX.utils.book_append_sheet(wb, ws, nome)
      }
      XLSX.writeFile(wb, `carteira-${hoje}.xlsx`)
      toast.sucesso(`Planilha baixada: carteira-${hoje}.xlsx`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setGerando(false)
    }
  }

  async function verPrevia() {
    setErro(null)
    setPrevia(null)
    setGerandoPrevia(true)
    try {
      // O SERVIDOR projeta e audita — exatamente o que o portal daquela pessoa recebe.
      const r = await repositorio().portal(pessoaId)
      setPrevia({
        nome: r.pessoa.nome,
        json: JSON.stringify(r.visao, null, 2),
        ativos: r.visao.ativos.length,
        prazos: r.visao.prazos.length,
        documentos: r.visao.documentos.length,
        ameacas: r.visao.colidencias.length,
      })
      toast.info(`Recorte de ${r.pessoa.nome} gerado.`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setGerandoPrevia(false)
    }
  }

  if (carregando) return <EsqExportar />
  if (pacote.ativos.length === 0) return <Vazio titulo="Nada a exportar" detalhe="O portfólio está vazio." />

  return (
    <div className="space-y-4">
      <Cartao titulo="Planilha da carteira (Excel)">
        <p className="mb-3 text-[12.5px] text-tx2">
          Duas abas: <strong>Carteira</strong> (<span className="num">{pacote.ativos.length}</span> ativos, com titular,
          cliente, situação, vigência e o próximo prazo) e <strong>Prazos</strong> (
          <span className="num">{pacote.prazos.length}</span>, com a situação calculada para hoje). Com filtro em cada coluna.
        </p>
        <Botao carregando={gerando} onClick={() => void baixarPlanilha()}>
          {gerando ? 'Gerando…' : `Baixar carteira-${hoje}.xlsx`}
        </Botao>
      </Cartao>

      <Cartao titulo="O que um cliente vê">
        <p className="mb-3 text-[12.5px] text-tx2">
          O recorte que o <strong>servidor</strong> entrega ao portal dessa pessoa — a mesma projeção e a mesma auditoria. O
          que ela não pode ver não está no arquivo.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <BuscaPessoa rotulo="Ver como" pessoas={candidatos} valor={pessoaId} onEscolher={setPessoaId} />
          <Botao disabled={!pessoaId} carregando={gerandoPrevia} onClick={() => void verPrevia()}>
            {gerandoPrevia ? 'Gerando…' : 'Gerar'}
          </Botao>
        </div>
        {previa && (
          <div className="mt-3 text-[12px] text-tx2">
            <p>
              <strong className="text-[var(--tx)]">{previa.nome}</strong> recebe <span className="num">{previa.ativos}</span>{' '}
              ativos, <span className="num">{previa.prazos}</span> prazos, <span className="num">{previa.documentos}</span>{' '}
              documentos liberados e <span className="num">{previa.ameacas}</span> ameaças com parecer. Não há contato,
              CPF/CNPJ de outras pessoas, valor não conferido, pontuação de colidência, agente nem prazo interno.
            </p>
            <div className="mt-2 flex gap-2">
              <Botao variante="secundaria" onClick={() => setMostrarJson(!mostrarJson)}>
                {mostrarJson ? 'Esconder o arquivo' : 'Ver o arquivo'}
              </Botao>
              <Botao
                variante="secundaria"
                onClick={() => baixarArquivo(`portal-${previa.nome.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.json`, previa.json, 'application/json')}
              >
                Baixar JSON
              </Botao>
            </div>
            {mostrarJson && (
              <pre className="tabular mt-2 max-h-96 overflow-auto rounded border border-[var(--linha)] bg-neutro p-3 text-[10.5px]">
                {previa.json}
              </pre>
            )}
          </div>
        )}
      </Cartao>

      <Cartao
        titulo="Pacote técnico (JSON)"
        acessorio={validacao.ok ? (
            <Chip tom="ok" titulo="O pacote passou na validação do contrato de dados: todo campo obrigatório existe e tem o formato combinado">
              Válido no contrato v{CONTRATO_VERSAO}
            </Chip>
          ) : (
            <Chip tom="erro">Inválido</Chip>
          )}
      >
        <p className="mb-3 text-[12.5px] text-tx2">
          A carteira inteira no formato do contrato de dados — para integração com outro sistema ou para conferir um problema.
          ⚠️ <strong>Não é backup</strong>: não leva logins, os arquivos dos documentos, os apelidos de pessoas juntadas nem as
          vigilâncias desligadas. O backup é o do servidor: banco + arquivos no Backblaze B2.
        </p>
        {!validacao.ok && (
          <div className="mb-3 rounded border border-[#f0c8c3] bg-[#fbeae8] p-3">
            <p className="text-[12.5px] font-medium text-erro">O pacote não passa na validação do contrato:</p>
            <ul className="mt-1 space-y-0.5 text-[10.5px] text-erro">
              {validacao.problemas.map((p, i) => (
                <li key={i} className="tabular">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Botao variante="secundaria" onClick={() => baixarArquivo(`portfolio-${hoje}.json`, JSON.stringify(pacote, null, 2), 'application/json')}>
          Baixar portfolio-{hoje}.json
        </Botao>
      </Cartao>

      {erro && <p className="rounded border border-[#f0c8c3] bg-[#fbeae8] px-3 py-2 text-[12.5px] text-erro">{erro}</p>}
    </div>
  )
}
