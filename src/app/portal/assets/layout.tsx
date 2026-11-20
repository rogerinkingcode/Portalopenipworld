import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Meus ativos" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Meus ativos' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
