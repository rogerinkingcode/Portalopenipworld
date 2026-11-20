/** Rótulos de tela. Vocabulário do `CLAUDE.md` §6 — a palavra na tela é a palavra da casa. */

import type { Especie, Papel } from '../contrato/tipos.ts'

const ESPECIES: Record<Especie, string> = {
  marca: 'Marca',
  patente_invencao: 'Patente de invenção',
  modelo_utilidade: 'Modelo de utilidade',
  certificado_adicao: 'Certificado de adição',
  desenho_industrial: 'Desenho industrial',
  programa_computador: 'Programa de computador',
  indicacao_geografica: 'Indicação geográfica',
  dominio: 'Domínio',
  direito_autoral: 'Direito autoral',
}

export function rotuloEspecie(e: string): string {
  return ESPECIES[e as Especie] ?? e
}

/** Vigências, para a tela não fingir que "patente" é uma coisa só. */
export const VIGENCIA_POR_ESPECIE: Partial<Record<Especie, string>> = {
  marca: '10 anos da concessão, renovável',
  patente_invencao: '20 anos do depósito',
  modelo_utilidade: '15 anos do depósito',
  desenho_industrial: '10 anos do depósito, prorrogável por 3 × 5 anos',
}

const JURISDICOES: Record<string, string> = {
  BR: 'Brasil',
  US: 'Estados Unidos',
  EM: 'União Europeia (EUIPO)',
  WO: 'Registro internacional (Madri / PCT)',
  EP: 'Europa (EPO)',
  CN: 'China',
  AR: 'Argentina',
  MX: 'México',
  CL: 'Chile',
  CO: 'Colômbia',
  PE: 'Peru',
  UY: 'Uruguai',
  PY: 'Paraguai',
  BO: 'Bolívia',
  EC: 'Equador',
  CA: 'Canadá',
  JP: 'Japão',
  KR: 'Coreia do Sul',
  IN: 'Índia',
  GB: 'Reino Unido',
  DE: 'Alemanha',
  FR: 'França',
  IT: 'Itália',
  ES: 'Espanha',
  NL: 'Holanda',
  CH: 'Suíça',
  AU: 'Austrália',
  PT: 'Portugal',
  BE: 'Bélgica',
  AT: 'Áustria',
  SE: 'Suécia',
  DK: 'Dinamarca',
  NO: 'Noruega',
  FI: 'Finlândia',
  IE: 'Irlanda',
  PL: 'Polônia',
  RU: 'Rússia',
  TR: 'Turquia',
  IL: 'Israel',
  AE: 'Emirados Árabes',
  SA: 'Arábia Saudita',
  ZA: 'África do Sul',
  EG: 'Egito',
  NG: 'Nigéria',
  SG: 'Singapura',
  MY: 'Malásia',
  TH: 'Tailândia',
  VN: 'Vietnã',
  ID: 'Indonésia',
  PH: 'Filipinas',
  TW: 'Taiwan',
  HK: 'Hong Kong',
  NZ: 'Nova Zelândia',
  ND: 'Não determinada',
}

export function rotuloJurisdicao(j: string): string {
  const n = JURISDICOES[j]
  if (!n) return j
  // WO e ND já se explicam pelo nome; repetir a sigla vira "…(WIPO) (WO)".
  return j === 'WO' || j === 'ND' ? n : `${n} (${j})`
}

const PAPEIS: Record<Papel, string> = {
  titular: 'Titular',
  contato: 'Contato',
  cotitular: 'Co-titular',
  cliente: 'Cliente',
  parceiro: 'Parceiro',
  agente: 'Agente correspondente',
  procurador: 'Procurador',
  licenciado: 'Licenciado',
  cedente: 'Cedente',
  cessionario: 'Cessionário',
}

export function rotuloPapel(p: string): string {
  return PAPEIS[p as Papel] ?? p
}

/** O que cada papel significa — o hover explica sem precisar abrir o CLAUDE.md. */
export const EXPLICA_PAPEL: Record<Papel, string> = {
  contato: 'A quem a comunicacao vai — em regra quem fechou o negocio daquela etapa. E rastreabilidade de autorizacao, NAO escopo de visao: o responsavel ve a carteira inteira.',
  titular: 'Dono do direito. Nem sempre é quem paga: titular ≠ cliente em 16% dos serviços nacionais.',
  cotitular: 'Co-proprietário do mesmo ativo. Existem casos com até 4 titulares.',
  cliente: 'Quem contratou e paga. Pode não ser o dono do ativo.',
  parceiro: 'IPartner que revende. Vê os ativos dos clientes dele.',
  agente: 'Escritório correspondente no exterior. ⛔ Nunca é publicável ao cliente — desintermediação.',
  procurador: 'Quem consta no INPI. É o escritório — é a chave da consulta ao registro.',
  licenciado: 'Autorizado a usar, sem ser dono.',
  cedente: 'Quem transferiu a titularidade.',
  cessionario: 'Quem recebeu a titularidade.',
}

const FONTES: Record<string, string> = {
  inpi_consulta: 'Consulta ao registro do INPI',
  rpi_xml: 'XML da RPI',
  rpi_pdf: 'PDF da RPI (degradação declarada)',
  api_oficial: 'API oficial do escritório',
  upload_manual: 'Planilha enviada à mão',
  certificado_agente: 'Certificado do agente',
  declarado_cliente: 'Declarado pelo cliente',
  ploomes: 'Ploomes (histórico de contratação)',
  decisao_humana: 'Decisão humana registrada',
}

export function rotuloFonte(f: string): string {
  return FONTES[f] ?? f
}

/*
 * Categoria de documento.
 *
 * ⚠️ Estas chaves são o enum `Documento.tipo` do contrato — as onze, sem inventar nem faltar.
 *    A tabela nasceu duplicada em duas telas e as duas cópias erraram igual: traziam `proposta`,
 *    `comprovante` e `publicacao`, que NÃO existem no enum, e não traziam `comprovante_gru`,
 *    `recibo_protocolo`, `comunicado` nem `imagem_marca`, que existem. O efeito era mudo: a tela
 *    caía no `?? tipo` e mostrava o identificador cru (`comprovante_gru`) ao cliente, como se
 *    fosse nome de categoria.
 */
const DOCUMENTOS: Record<string, string> = {
  certificado: 'Certificado de registro',
  procuracao: 'Procuração',
  peticao: 'Petição',
  comprovante_gru: 'Comprovante de GRU',
  recibo_protocolo: 'Recibo de protocolo',
  carta_agente: 'Carta do correspondente',
  relatorio_colidencia: 'Parecer de colidência',
  comunicado: 'Comunicado',
  contrato: 'Contrato',
  imagem_marca: 'Imagem da marca',
  outro: 'Documento',
}

export function rotuloDocumento(t: string): string {
  return DOCUMENTOS[t] ?? t
}

/** Firmeza da régua, como aparece sozinha num selo: "Legal", "Estimado"… */
export function rotuloFirmeza(f: string): string {
  return f ? f[0].toUpperCase() + f.slice(1) : f
}
