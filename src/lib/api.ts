/**
 * A única porta do navegador para a API.
 *
 * PRODUÇÃO (front na Vercel): o navegador fala DIRETO com a API, em `NEXT_PUBLIC_API_URL`
 * (ex.: https://api.seudominio.com). A Vercel só serve as telas — nada de dado, upload ou
 * backup passa por ela (lá o repasse tem limite de 4,5 MB, corta em 120 s e pode guardar
 * respostas no cache da CDN). O cookie de sessão nasce no domínio-pai (COOKIE_DOMINIO no
 * backend), e por isso vale para a API e para o proxy.ts do front.
 *
 * DESENVOLVIMENTO: sem a variável, vai para `/api/backend/*`, que o `next.config.ts` repassa.
 *
 * O cookie de sessão (httpOnly) viaja sozinho; o JavaScript da página nunca o vê.
 *
 * ⛔ Zero silêncio (regra 8): resposta que não é 2xx vira `ErroApi` com o status e a mensagem do
 *    servidor — e, quando ele manda, a lista de recusas (`detalhes`). Nunca um `false` engolido.
 */

export const BASE_API = (process.env.NEXT_PUBLIC_API_URL || '/api/backend').replace(/\/$/, '')

export class ErroApi extends Error {
  readonly status: number
  readonly detalhes: string[]

  constructor(status: number, mensagem: string, detalhes: string[] = []) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.detalhes = detalhes
  }
}

/**
 * Sessão caiu (expirou, foi bloqueada, o admin apagou a conta): volta ao login, guardando onde
 * a pessoa estava. Recarregar a página inteira descarta o estado em memória do usuário anterior.
 */
function voltarAoLogin() {
  if (typeof window === 'undefined' || window.location.pathname === '/login') return
  const de = window.location.pathname + window.location.search
  // Recarga completa, e não router.push: o estado em memória da sessão que caiu não sobrevive.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?de=${encodeURIComponent(de)}`)
}

export async function api<T = unknown>(
  caminho: string,
  opcoes: {
    metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    corpo?: unknown
    /** Envia o arquivo como está, em bytes (a planilha é lida no servidor). */
    arquivo?: File
    semRedirecionar?: boolean
  } = {},
): Promise<T> {
  let resposta: Response
  const { arquivo } = opcoes
  try {
    resposta = await fetch(`${BASE_API}${caminho}`, {
      method: opcoes.metodo ?? 'GET',
      // `include`: com a API em outro subdomínio, o cookie de sessão só vai junto assim.
      credentials: 'include',
      headers: arquivo
        ? { 'Content-Type': 'application/octet-stream', 'X-Nome-Arquivo': encodeURIComponent(arquivo.name) }
        : opcoes.corpo === undefined
          ? undefined
          : { 'Content-Type': 'application/json' },
      body: arquivo ?? (opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo)),
      cache: 'no-store',
    })
  } catch (e) {
    throw new ErroApi(0, `A API não respondeu (${e instanceof Error ? e.message : String(e)}).`)
  }

  const corpo = await resposta.json().catch(() => null)

  if (!resposta.ok) {
    if (resposta.status === 401 && !opcoes.semRedirecionar) voltarAoLogin()
    const mensagem = traduzir(resposta.status, corpo?.message)
    const detalhes = Array.isArray(corpo?.details) ? corpo.details.map(String) : []
    throw new ErroApi(resposta.status, mensagem, detalhes)
  }

  return corpo as T
}

/**
 * A API responde em inglês, por convenção dela (é consumida por sistemas). A tela fala
 * português: as mensagens que chegam ao usuário são traduzidas aqui; as outras passam como vieram.
 */
const TRADUCOES: Record<string, string> = {
  'Invalid email or password': 'E-mail ou senha incorretos.',
  'Account is blocked': 'Esta conta está bloqueada. Fale com o administrador.',
  'Email and password are required': 'Informe o e-mail e a senha.',
  'Too many login attempts. Try again later': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'Not authenticated': 'Sua sessão terminou. Entre de novo.',
  'Invalid or expired session': 'Sua sessão terminou. Entre de novo.',
  'Insufficient permissions': 'Seu perfil não tem acesso a isto.',
  'This account is not linked to a person in the portfolio':
    'Esta conta ainda não está ligada a um titular, cliente ou parceiro da carteira. Fale com o escritório.',
  'Email already registered in the system': 'Já existe um usuário com este e-mail.',
  'Person not found': 'Pessoa não encontrada na carteira.',
  'User not found': 'Usuário não encontrado.',
  'You cannot delete your own account': 'Você não pode excluir a própria conta.',
  'You cannot block your own account': 'Você não pode bloquear a própria conta.',
  'You cannot change your own role': 'Você não pode mudar o próprio papel.',
  "Users with the role 'cliente' must be linked to a person (pessoaId)":
    'Usuário cliente precisa estar ligado a uma pessoa da carteira.',
  'Password must have at least 8 characters': 'A senha precisa ter pelo menos 8 caracteres.',
  'Invalid email address': 'E-mail inválido.',
  'Asset or person not found': 'O ativo ou a pessoa não existe mais na carteira. Recarregue a página.',
  'Link not found': 'Esse vínculo não existe mais. Recarregue a página.',
  'Only links assigned by hand can be undone here; fix the spreadsheet or the INPI source instead':
    'Só dá para desfazer aqui o que foi atribuído à mão. O resto se corrige na planilha ou no INPI.',
  'At most 2000 assets per request': 'No máximo 2.000 ativos de uma vez.',
  'Choose the person that stays': 'Escolha a pessoa que fica.',
  'Choose between 1 and 50 other people to merge': 'Escolha de 1 a 50 pessoas para juntar.',
  'These people have different documents (CNPJ/CPF): they are not the same':
    'Essas pessoas têm CPF/CNPJ diferentes: não são a mesma.',
  'There is no mark without an INPI number': 'Nenhuma marca está sem número do INPI.',
  'The INPI mark number must have 9 digits': 'O número de marca no INPI tem 9 dígitos.',
  'This asset already has an INPI number': 'Este ativo já tem número do INPI. Recarregue a página.',
  'This INPI number already belongs to another asset in the portfolio': 'Esse número já é de outro ativo da carteira.',
  'There is no spreadsheet-only mark to complete': 'Nenhuma marca depende só da planilha: nada a completar.',
  'There is no RPI with the opposition period still open': 'Nenhuma RPI está mais no prazo de oposição.',
  'There is no new RPI to read': 'Não há RPI nova para ler: as edições abertas para oposição já foram lidas.',
  'Say why the watch is being turned off': 'Diga por que a vigilância está sendo desligada.',
  'The justification is required': 'Escreva a justificativa do parecer.',
  'Send between 1 and 500 case ids': 'Escolha de 1 a 500 casos.',
  'Invalid decision': 'Decisão inválida.',
  'Invalid risk level': 'Grau de risco inválido.',
  'Case not found': 'Um dos casos não existe mais. Recarregue a página.',
  'Another search or import is already running. Wait for it to finish':
    'Já há uma busca ou importação em andamento. Aguarde terminar.',
  'Inform the attorney CNPJ/CPF or name': 'Informe o CNPJ/CPF ou o nome do procurador.',
  'The attorney document must be a CNPJ (14 digits) or CPF (11 digits)':
    'O documento do procurador deve ser um CNPJ (14 dígitos) ou CPF (11 dígitos).',
  'The attorney name must have at least 3 characters': 'O nome do procurador precisa ter pelo menos 3 letras.',
  'Choose at least one status to import': 'Escolha ao menos uma situação para importar.',
  'Choose at least one category to import': 'Escolha ao menos uma categoria para importar.',
  'Send the spreadsheet file in the request body': 'Escolha um arquivo de planilha.',
  'The file is not a spreadsheet (XLSX, XLSM, XLS or CSV)': 'O arquivo não é uma planilha (XLSX, XLSM, XLS ou CSV).',
  'The CSV file must be saved as UTF-8': 'O CSV precisa estar salvo em UTF-8.',
  'The spreadsheet could not be read: the file is damaged or password protected':
    'Não foi possível ler a planilha: o arquivo está corrompido ou protegido por senha.',
  'The spreadsheet has no sheets with data': 'A planilha não tem nenhuma aba com dados.',
  'The spreadsheet has no data rows': 'A planilha não tem linhas de dados.',
  'This file is not the one that was analyzed. Analyze it again before importing':
    'Este não é o arquivo que foi analisado. Analise de novo antes de importar.',
  'No row of the spreadsheet was accepted: nothing to import':
    'Nenhuma linha da planilha foi aceita: não há o que importar.',
  'The file upload was interrupted. Send it again': 'O envio do arquivo foi interrompido. Envie de novo.',
  'Paste the refresh token generated in the OpenIP World panel': 'Cole o refresh token gerado no painel do OpenIP World.',
  'The OpenIP World integration is not configured. An administrator must paste an API token on the Integrations screen':
    'A integração com o OpenIP World não está configurada. O administrador deve colar o token em Integrações.',
  'The OpenIP World API token is invalid, expired or revoked. An administrator must generate a new token (scope read) in the OpenIP World panel and paste it on the Integrations screen':
    'A API do OpenIP World recusou o token (inválido, vencido ou revogado). Gere um novo no painel do OpenIP World (escopo read) e cole em Integrações.',
  // Plataforma (multi-tenant)
  "This company's access is suspended": 'O acesso desta empresa está suspenso. Fale com o suporte da plataforma.',
  'The platform database is unavailable': 'A plataforma está indisponível no momento. Tente de novo em instantes.',
  'Inform the database host': 'Informe o host do banco de dados.',
  'Inform the database user': 'Informe o usuário do banco de dados.',
  'Inform the database password': 'Informe a senha do banco de dados.',
  'Invalid database port': 'Porta do banco inválida.',
  'Invalid database name: use letters, numbers and underscore': 'Nome de banco inválido: use letras, números e _ (sublinhado).',
  'Fill in all the B2 fields (endpoint, region, bucket, keyID and applicationKey), or leave them all blank':
    'Preencha todos os campos do B2 (endpoint, região, bucket, keyID e applicationKey), ou deixe todos em branco.',
  'The B2 endpoint must start with https://': 'O endpoint do B2 precisa começar com https://.',
  'Fill in the B2 credentials to test': 'Preencha as credenciais do B2 para testar.',
  'Invalid slug: use 3 to 40 lowercase letters, numbers and hyphens': 'Identificador inválido: use de 3 a 40 letras minúsculas, números e hífen.',
  'This slug is already in use': 'Esse identificador já é de outra empresa.',
  'Slug is required': 'Preencha o identificador da empresa.',
  'Company name is required': 'Preencha o nome da empresa.',
  'Database host is required': 'Informe o host do banco de dados.',
  'Database user is required': 'Informe o usuário do banco de dados.',
  'Database name is required': 'Informe o nome do banco de dados.',
  'Admin first name is required': 'Preencha o nome do administrador.',
  'Admin last name is required': 'Preencha o sobrenome do administrador.',
  'Admin e-mail is required': 'Preencha o e-mail do administrador.',
  'Invalid admin e-mail': 'E-mail do administrador inválido.',
  'The admin password must have at least 8 characters': 'A senha do administrador precisa ter pelo menos 8 caracteres.',
  'This e-mail is already in use on the platform': 'Esse e-mail já é usado na plataforma (em outra empresa ou por um operador).',
  'Company not found': 'Empresa não encontrada. Recarregue a página.',
  'Invalid status': 'Situação inválida.',
  // Tipos de envolvido da planilha
  'Send the list of aliases': 'Envie a lista de nomes.',
  'At most 200 aliases': 'No máximo 200 nomes.',
  'Every alias needs the type as written in the spreadsheet': 'Preencha cada nome como ele está na planilha.',
  'Alias type is too long': 'Nome grande demais.',
  'Invalid role for an alias': 'Papel inválido para um nome.',
  // Perfil
  'The e-mail is the login and cannot be changed': 'O e-mail é o seu login e não pode ser alterado.',
  'firstName is required': 'Preencha o nome.',
  'lastName is required': 'Preencha o sobrenome.',
  'Type your current password': 'Digite a sua senha atual.',
  'The new password must have at least 8 characters': 'A senha nova precisa ter pelo menos 8 caracteres.',
  'The current password is not correct': 'A senha atual não confere.',
  'The new password must be different from the current one': 'A senha nova precisa ser diferente da atual.',
  'Send the image in the request body': 'Escolha uma imagem.',
  'Unsupported image: send PNG, JPG or WEBP': 'Imagem não aceita: envie PNG, JPG ou WEBP.',
  'Photo not found': 'Foto não encontrada.',
  'The photo is missing from storage': 'A foto não está mais no armazenamento.',
}

function traduzir(status: number, mensagem: unknown): string {
  if (typeof mensagem === 'string') {
    if (TRADUCOES[mensagem]) return TRADUCOES[mensagem]
    if (mensagem.startsWith('The package does not match data contract'))
      return 'O pacote não confere com o contrato de dados — nada foi gravado.'
    if (mensagem.startsWith('Header not recognized'))
      return 'Cabeçalho não reconhecido: a planilha precisa de uma coluna PROCESSO, MARCA ou ND. ' +
        mensagem.replace(/^.*Columns found:/, 'Colunas encontradas:')
    if (/^The spreadsheet has more than \d+ (rows|columns)$/.test(mensagem))
      return mensagem.replace(/^The spreadsheet has more than (\d+) rows$/, 'A planilha tem mais de $1 linhas.')
        .replace(/^The spreadsheet has more than (\d+) columns$/, 'A planilha tem mais de $1 colunas.')
    if (/^The file is larger than \d+ MB$/.test(mensagem))
      return mensagem.replace(/^The file is larger than (\d+) MB$/, 'O arquivo passa de $1 MB.')
    if (mensagem.startsWith('Document storage (Backblaze B2) is not configured'))
      return 'O armazenamento de arquivos (Backblaze B2) desta empresa ainda não está configurado: as credenciais são cadastradas no painel da plataforma.'
    if (mensagem.startsWith('Could not connect to the database server:'))
      return mensagem.replace('Could not connect to the database server:', 'Não foi possível conectar ao servidor do banco:')
    if (mensagem.startsWith('The database server refused to create the database:'))
      return mensagem.replace('The database server refused to create the database:', 'O servidor do banco recusou criar o banco:')
    if (mensagem.startsWith('The migrations failed on this database:'))
      return mensagem.replace('The migrations failed on this database:', 'As migrações falharam neste banco:')
    if (mensagem.startsWith('This database is already used by the company'))
      return mensagem.replace('This database is already used by the company', 'Esse banco já é usado pela empresa')
    if (/^".+" is already understood by the system$/.test(mensagem))
      return mensagem.replace(/^"(.+)" is already understood by the system$/, '“$1” o sistema já entende sozinho: não precisa cadastrar.')
    if (mensagem.startsWith('The B2 refused the access:')) {
      // O código que o Backblaze devolveu → o que corrigir no cadastro.
      const DICAS: Record<string, string> = {
        InvalidAccessKeyId: 'o keyID não existe. Confira se copiou o keyID (e não o nome da chave).',
        SignatureDoesNotMatch: 'a applicationKey não confere com o keyID. Copie de novo a applicationKey (ela só aparece na criação da chave).',
        AccessDenied:
          'a chave não tem acesso a este bucket. Use uma Application Key comum (a Master Key não funciona), com acesso a ESTE bucket e permissão de leitura e escrita.',
        NoSuchBucket: 'esse bucket não existe nesse endpoint. Confira o nome do bucket e se o endpoint/região são os da página dele.',
        PermanentRedirect: 'o bucket é de outra região. Use o endpoint e a região mostrados na página do bucket.',
        AuthorizationHeaderMalformed: 'a região não confere com o endpoint. A região é o pedaço do meio do endpoint (ex.: us-east-005).',
      }
      const codigo = /access: (\w+)/.exec(mensagem)?.[1] ?? ''
      const etapa = /when trying to (.+?)\./.exec(mensagem)?.[1]
      const dica = DICAS[codigo] ?? `código ${codigo || 'desconhecido'}.`
      return `O B2 recusou o acesso${etapa ? ` ao ${etapa}` : ''}: ${dica}`
    }
    if (mensagem.includes('reference(s) that point to nothing'))
      return 'O pacote tem referências que não apontam para nada dentro dele — nada foi gravado.'
    return mensagem
  }
  if (status === 0) return 'A API não respondeu.'
  return `A API respondeu ${status}.`
}
