/**
 * O repositório da API do backend. É a única implementação: o banco no navegador (IndexedDB) do
 * MVP local saiu quando a API passou a existir — mesma interface, nenhuma tela mudou por isso.
 */

import type { Pacote, Papel } from '@/contrato/tipos'
import { api } from '@/lib/api'
import type { Portal, PortfolioRepository, ResultadoAtribuicao } from './tipos'

class RepositorioApi implements PortfolioRepository {
  readonly origem = 'API (MySQL)'

  async carregar(): Promise<Pacote> {
    const r = await api<{ pacote: Pacote }>('/portfolio')
    return r.pacote
  }


  async atribuirPapel(dados: { ativo_ids: string[]; pessoa_id: string; papel: Papel }): Promise<ResultadoAtribuicao> {
    const r = await api<ResultadoAtribuicao>('/conciliacao/vinculos', { metodo: 'POST', corpo: dados })
    return { criados: r.criados, ja_existiam: r.ja_existiam }
  }

  async removerVinculo(vinculoId: string): Promise<void> {
    await api(`/conciliacao/vinculos/${encodeURIComponent(vinculoId)}`, { metodo: 'DELETE' })
  }

  async portal(pessoaId?: string): Promise<Portal> {
    const consulta = pessoaId ? `?pessoa_id=${encodeURIComponent(pessoaId)}` : ''
    return await api<Portal>(`/portal${consulta}`)
  }
}

const instancia = new RepositorioApi()

export function repositorio(): PortfolioRepository {
  return instancia
}
