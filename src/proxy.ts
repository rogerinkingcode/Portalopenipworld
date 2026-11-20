/**
 * Proxy (Next 16 — o antigo `middleware.ts`): a checagem OTIMISTA de sessão, antes de a rota
 * renderizar.
 *
 * Lê o cookie de sessão que o backend emitiu no login, confere a assinatura e a validade com o
 * mesmo `JWT_SECRET`, e decide para onde a pessoa vai:
 *   sem sessão válida         → /login (guardando para onde ela queria ir)
 *   cliente fora de /portal   → /portal   (o painel do gestor não é dele)
 *   logado abrindo /login     → a casa do papel dele
 *
 * ⚠️ Isto é ROTEAMENTO, não autorização. Seguindo o guia do Next, o proxy só lê o cookie — nunca
 *    o banco —, e o papel dentro do token é uma dica de rota. Quem autoriza é a API, que relê o
 *    usuário do banco a cada requisição: um papel velho no cookie abre a TELA, mas a tela vem
 *    vazia, porque o dado é negado lá. A fronteira é o servidor, como manda o CLAUDE.md §5.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_SESSAO = 'token'

type Sessao = { id: string; role: string }

async function lerSessao(req: NextRequest): Promise<Sessao | null> {
  const token = req.cookies.get(COOKIE_SESSAO)?.value
  const segredo = process.env.JWT_SECRET
  if (!token || !segredo) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(segredo), {
      algorithms: ['HS256'],
    })
    if (payload.typ !== 'session' || typeof payload.id !== 'string' || typeof payload.role !== 'string') {
      return null
    }
    // Multi-tenant: sessão de empresa traz a empresa (`emp`); a do operador traz `op`. Um cookie
    // sem nenhum dos dois (de antes do multi-tenant) a API recusa — tratá-lo como válido aqui
    // fazia o painel abrir, a API responder 401 e o login mandar de volta ao painel, em ciclo.
    const operador = payload.op === true && payload.role === 'operador'
    if (!operador && typeof payload.emp !== 'string') return null
    return { id: payload.id, role: payload.role }
  } catch {
    // Expirada, adulterada ou de outro segredo: tanto faz — sem sessão.
    return null
  }
}

/**
 * Telas beta trancadas para todos por enquanto. O menu (Casca.tsx) já as mostra sem link;
 * isto barra quem digita a URL direto. Para liberar uma, tire-a daqui e o `beta: true` do menu.
 */
const ROTAS_BETA = ['/communications', '/intelligence', '/investments', '/portal/intelligence', '/portal/investments']

function ehRotaBeta(pathname: string): boolean {
  return ROTAS_BETA.some((r) => pathname === r || pathname.startsWith(r + '/'))
}

function casaDoPapel(role: string): string {
  if (role === 'operador') return '/platform'
  return role === 'cliente' ? '/portal' : '/'
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const sessao = await lerSessao(req)
  const naTelaDeLogin = pathname === '/login'

  if (!sessao) {
    if (naTelaDeLogin) return NextResponse.next()
    const destino = new URL('/login', req.nextUrl)
    if (pathname !== '/') destino.searchParams.set('de', pathname + search)
    const resposta = NextResponse.redirect(destino)
    // Cookie expirado ou inválido sai junto, para o navegador não reapresentá-lo.
    if (req.cookies.has(COOKIE_SESSAO)) resposta.cookies.delete(COOKIE_SESSAO)
    return resposta
  }

  if (naTelaDeLogin) return NextResponse.redirect(new URL(casaDoPapel(sessao.role), req.nextUrl))

  // O operador da plataforma só vê o painel das empresas; ninguém de empresa entra nele.
  const naPlataforma = pathname === '/platform' || pathname.startsWith('/platform/')
  if (sessao.role === 'operador') {
    return naPlataforma ? NextResponse.next() : NextResponse.redirect(new URL('/platform', req.nextUrl))
  }
  if (naPlataforma) return NextResponse.redirect(new URL(casaDoPapel(sessao.role), req.nextUrl))

  if (sessao.role === 'cliente' && !pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL('/portal', req.nextUrl))
  }

  if (ehRotaBeta(pathname)) {
    return NextResponse.redirect(new URL(pathname.startsWith('/portal') ? '/portal' : '/', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  /*
   * Tudo, menos: a ponte para a API (`/api`, que se autentica sozinha lá), os arquivos do Next e
   * os estáticos de `public/`. Sem esta exclusão, o redirecionamento para /login bloquearia o
   * próprio CSS e JS da tela de login.
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
