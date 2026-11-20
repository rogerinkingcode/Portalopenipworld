import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Exportar" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Exportar' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
