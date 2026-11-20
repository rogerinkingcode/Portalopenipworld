/**
 * As credenciais do último login bem-sucedido, guardadas NESTE navegador para preencher o
 * próximo login (tela de login). A troca de senha no perfil atualiza a senha guardada, senão o
 * próximo login viria preenchido com a senha antiga.
 *
 * ⚠️ Fica em texto puro no localStorage, por decisão do usuário (ver a tela de login).
 */

/** Nome técnico mantido de propósito (a troca para OpenIpWorld apagaria o login lembrado de todos). */
const CHAVE_CREDENCIAIS = 'apexwallet:credenciais'

export function lerCredenciais(): { email: string; senha: string } | null {
  try {
    const bruto = localStorage.getItem(CHAVE_CREDENCIAIS)
    if (!bruto) return null
    const c = JSON.parse(bruto)
    return typeof c?.email === 'string' && typeof c?.senha === 'string' ? c : null
  } catch {
    return null
  }
}

export function salvarCredenciais(email: string, senha: string) {
  try {
    localStorage.setItem(CHAVE_CREDENCIAIS, JSON.stringify({ email, senha }))
  } catch {
    // localStorage indisponível (modo privado, cota): o login segue sem lembrar.
  }
}

/** Depois de trocar a senha: se este navegador lembra o login DESTE e-mail, guarda a senha nova. */
export function atualizarSenhaLembrada(email: string, senhaNova: string) {
  const c = lerCredenciais()
  if (c && c.email.toLowerCase() === email.toLowerCase()) salvarCredenciais(c.email, senhaNova)
}
