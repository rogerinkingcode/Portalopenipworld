import type { Metadata } from 'next'

/** Só o título da aba do navegador: "OpenIpWorld — Meu perfil" (o modelo está no layout raiz). */
export const metadata: Metadata = { title: 'Meu perfil' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
