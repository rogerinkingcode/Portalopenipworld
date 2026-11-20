import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Pessoas" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Pessoas' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
