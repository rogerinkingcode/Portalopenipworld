import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Ameaças" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Ameaças' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
