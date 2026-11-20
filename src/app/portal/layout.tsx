import type { Metadata } from 'next'
import LayoutPortal from './LayoutPortal'

/*
 * Invólucro de servidor do portal: existe só para declarar o título da aba ("OpenIpWorld —
 * Meu portfólio"). A moldura de verdade é de cliente ('use client', em LayoutPortal.tsx), e
 * componente de cliente não pode exportar `metadata`. As sub-rotas declaram o próprio nome.
 */
export const metadata: Metadata = { title: 'Meu portfólio' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LayoutPortal>{children}</LayoutPortal>
}
