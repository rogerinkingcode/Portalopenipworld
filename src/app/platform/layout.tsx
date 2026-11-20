import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Empresas" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Empresas' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
