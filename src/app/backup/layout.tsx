import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Backup" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Backup' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
