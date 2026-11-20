import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Caso de ameaça" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Caso de ameaça' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
