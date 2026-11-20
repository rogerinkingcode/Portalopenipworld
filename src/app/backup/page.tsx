'use client'

/**
 * Backup — o admin da empresa leva para fora o banco de dados e os arquivos dela.
 *
 * Os dois downloads são links diretos para a API (que gera em fluxo): o navegador baixa enquanto
 * o servidor monta, sem o arquivo inteiro passar pela memória de ninguém. Cada download fica no
 * histórico de atividades.
 */

import { useSessao } from '@/componentes/EstadoSessao'
import { Cartao, Vazio } from '@/componentes/ui'
import { toast } from '@/componentes/Toast'
import { BASE_API } from '@/lib/api'

function Download({ href, titulo, detalhe, rotulo }: { href: string; titulo: string; detalhe: React.ReactNode; rotulo: string }) {
  return (
    <Cartao titulo={titulo}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[260px] flex-1 text-[12.5px] leading-relaxed text-[var(--tx2)]">{detalhe}</div>
        <a
          href={href}
          onClick={() => toast.info('O download começou. Arquivos grandes levam alguns minutos.')}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold text-white no-underline transition"
          style={{ fontFamily: 'var(--font-titulo)', background: 'linear-gradient(135deg,#2589A8,#1A6581)', boxShadow: '0 2px 10px rgba(26,101,129,.35)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 4v11M7 10.5l5 5 5-5" />
            <path d="M4.5 19.5h15" />
          </svg>
          {rotulo}
        </a>
      </div>
    </Cartao>
  )
}

export default function Backup() {
  const { usuario } = useSessao()
  if (usuario && usuario.role !== 'admin') return <Vazio titulo="Acesso restrito" detalhe="Só o administrador da empresa baixa o backup." />

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[21px] font-semibold tracking-tight text-[var(--tx)]" style={{ fontFamily: 'var(--font-titulo)' }}>
          Backup
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--tx2)]">Uma cópia completa dos seus dados, para guardar fora do sistema.</p>
      </header>

      <Download
        href={`${BASE_API}/backup/banco`}
        titulo="Banco de dados"
        rotulo="Baixar o banco (.sql.gz)"
        detalhe={
          <>
            Toda a carteira, as pessoas, os prazos, as ameaças, os usuários e o histórico, num arquivo SQL compactado. Para
            restaurar num MySQL: <code className="rounded bg-[var(--sup2)] px-1">gunzip &lt; arquivo.sql.gz | mysql -u usuário -p banco</code>.
          </>
        }
      />
      <Download
        href={`${BASE_API}/backup/arquivos`}
        titulo="Arquivos (Backblaze B2)"
        rotulo="Baixar os arquivos (.zip)"
        detalhe={
          <>
            Todos os documentos e as fotos de perfil guardados no bucket da empresa, nas mesmas pastas. Com muitos arquivos, o
            download pode demorar.
          </>
        }
      />
    </div>
  )
}
