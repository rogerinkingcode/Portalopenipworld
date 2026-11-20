import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Ficha do cliente" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Ficha do cliente' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
