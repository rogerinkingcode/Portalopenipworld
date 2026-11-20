import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Histórico" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Histórico' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
