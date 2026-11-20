import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Integrações" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Integrações' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
