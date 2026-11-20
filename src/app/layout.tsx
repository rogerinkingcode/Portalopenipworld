import type { Metadata, Viewport } from 'next'
import { Poppins, Raleway, DM_Sans } from 'next/font/google'
import 'flag-icons/css/flag-icons.min.css'
import './globals.css'
import { Casca } from '@/componentes/Casca'
import { ProvedorPortfolio } from '@/componentes/EstadoPortfolio'
import { ProvedorSessao } from '@/componentes/EstadoSessao'
import { Toasts } from '@/componentes/Toast'

/*
 * As três fontes da casa, auto-hospedadas pelo Next — sem CDN, sem FOUT, funciona offline.
 *   Poppins  → título, label, nav, pill        (manual de marca p.30: "Documentos")
 *   Raleway  → corpo                           (manual p.30: "Texto (corpo)")
 *   DM Sans  → TODO número                     (`feedback_fontes_proibidas.md`)
 * ⛔ Nenhum monospace: JetBrains Mono é a fonte que o Gui rejeita como "cara de IA".
 */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--fonte-poppins',
  display: 'swap',
})
const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--fonte-raleway',
  display: 'swap',
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--fonte-dmsans',
  display: 'swap',
})

export const metadata: Metadata = {
  // Cada rota declara só o próprio nome (no layout.tsx dela); o modelo monta o resto. O
  // `default` vale para quem não declara — o Painel, que é a página inicial.
  title: { template: 'OpenIpWorld — %s', default: 'OpenIpWorld — Painel' },
  description:
    'Gestão de carteiras de propriedade intelectual: ciclo de vida dos ativos, prazos, ameaças, documentos e histórico.',
}

/**
 * Sem esta meta o navegador do telefone assume uma largura de layout de ~980px e encolhe
 * a página inteira. Medido: 910px de largura de layout num aparelho de 390px.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#10171C' },
    { media: '(prefers-color-scheme: light)', color: '#F5F7F8' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-tema="escuro"
      className={`${poppins.variable} ${raleway.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
         * Aplica o tema salvo ANTES da primeira pintura. Sem isto a tela pisca no
         * tema errado a cada navegação. Bloqueante de propósito e minúsculo.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('apex-tema');if(t)document.documentElement.dataset.tema=t;}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <ProvedorSessao>
          <ProvedorPortfolio>
            <Casca>{children}</Casca>
          </ProvedorPortfolio>
        </ProvedorSessao>
        {/* Os avisos do canto superior direito, para o sistema inteiro (ver Toast.tsx). */}
        <Toasts />
      </body>
    </html>
  )
}
