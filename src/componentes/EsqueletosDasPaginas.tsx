/**
 * O esqueleto de cada página — espelho da estrutura real dela, montado com as peças de
 * Esqueleto.tsx. Mesmas grades, mesmos cartões, mesmas colunas de tabela, mesmas abas: quando o
 * dado chega, o conteúdo ocupa o lugar dos ossos sem nada pular.
 *
 * ⚠️ Mudou o desenho de uma página? Ajuste o esqueleto dela aqui também.
 */

import {
  Esqueleto,
  Osso,
  OssoAbas,
  OssoCabecalho,
  OssoCampos,
  OssoCartao,
  OssoChips,
  OssoCirculo,
  OssoGradeCartoes,
  OssoIndicadores,
  OssoLinhas,
  OssoListaCartoes,
  OssoPaginacao,
  OssoTabela,
  OssoTexto,
} from './Esqueleto'

// ── Peças repetidas entre páginas ────────────────────────────────────────────────────────

/** "← Voltar para …" das páginas de detalhe. */
const OssoVoltar = () => <Osso w={150} h={30} r={8} />

/** Cabeçalho das páginas de detalhe: voltar, bandeira + nome grande, linha de dados, selos. */
function OssoCabecalhoDetalhe({ selos = 2 }: { selos?: number }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2.5">
        <OssoVoltar />
        <div className="flex items-center gap-2.5">
          <Osso w={24} h={18} r={2} />
          <Osso w={240} h={22} r={7} />
        </div>
        <Osso w={340} h={11} />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: selos }, (_, i) => (
          <Osso key={i} w={i === 0 ? 120 : 80} h={22} r={999} />
        ))}
      </div>
    </div>
  )
}

/** Um cartão de seção (`section.card p-4`) com título pequeno e linhas de "rótulo: valor". */
function OssoSecao({ linhas = 4, tituloW = 110 }: { linhas?: number; tituloW?: number }) {
  return (
    <section className="card space-y-3 p-4">
      <Osso w={tituloW} h={10} />
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <Osso w={90} h={10} />
          <Osso w={`${40 - (i % 3) * 7}%`} h={11} />
        </div>
      ))}
    </section>
  )
}

/** O card do calendário mensal: título, setas e a grade 7 × 5. */
function OssoCalendario() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Osso w={130} h={14} />
        <Osso w={70} h={24} r={8} />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }, (_, i) => (
          <Osso key={i} h={34} r={6} />
        ))}
      </div>
    </div>
  )
}

/** O mapa de jurisdições. */
const OssoMapa = () => <Osso h={260} r={12} />

/** O cartão "Por matéria" + "Por jurisdição" ao lado do mapa. */
function OssoPorMateriaEJurisdicao() {
  return (
    <section className="card flex flex-col gap-4 p-4">
      <Osso w={90} h={10} />
      <OssoLinhas n={3} barra />
      <Osso w={100} h={10} className="mt-2" />
      <OssoLinhas n={6} bandeira />
    </section>
  )
}

/** As linhas de um formulário de perfil/senha: campos em duas ou três colunas. */
function OssoGradeCampos({ n, colunas }: { n: number; colunas: string }) {
  return (
    <div className={`grid gap-3 ${colunas}`}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <Osso w={70} h={9} />
          <Osso h={36} r={8} />
        </div>
      ))}
    </div>
  )
}

// ── Gestor ───────────────────────────────────────────────────────────────────────────────

/** `/` — Painel do gestor. */
export function EsqPainel() {
  return (
    <Esqueleto>
      <OssoCabecalho titulo={200} />
      <div className="mt-5">
        <OssoIndicadores n={4} colunas="sm:grid-cols-2 xl:grid-cols-4" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <section className="card space-y-3 p-4">
          <Osso w={160} h={10} />
          <OssoMapa />
        </section>
        <OssoPorMateriaEJurisdicao />
      </div>
      <section className="card mt-4 space-y-3 p-4">
        <div className="flex items-center justify-between">
          <Osso w={120} h={10} />
          <Osso w={150} h={10} />
        </div>
        <OssoTabela colunas={[110, 24, 220, 200, 70]} linhas={6} avatar={-1} />
      </section>
    </Esqueleto>
  )
}

/** `/assets` — filtros + tabela da carteira. */
export function EsqAtivos() {
  return (
    <Esqueleto>
      <OssoCartao titulo={false}>
        <div className="space-y-3">
          <OssoCampos larguras={['100%']} />
          <OssoCampos larguras={[150, 150, 150, 170, 170]} />
          <div className="flex flex-wrap items-center gap-4">
            <Osso w={170} h={18} r={999} />
            <Osso w={190} h={18} r={999} />
            <span className="ml-auto">
              <OssoAbas larguras={[60, 90, 110]} />
            </span>
          </div>
        </div>
      </OssoCartao>
      <OssoCartao tituloW={110}>
        <OssoTabela colunas={[170, 110, 90, 110, 160, 150, 150, 80, 90, 120]} linhas={10} minW={1100} />
        <OssoPaginacao />
      </OssoCartao>
    </Esqueleto>
  )
}

/** `/assets/[id]` e `/portal/assets/[id]` — ficha do ativo. */
export function EsqAtivo() {
  return (
    <Esqueleto>
      <OssoCabecalhoDetalhe />
      <section className="card space-y-2 px-4 py-3">
        <Osso w={60} h={9} />
        <Osso w={260} h={15} />
        <Osso w={140} h={9} />
      </section>
      <OssoAbas larguras={[90, 80, 96, 104]} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <section key={i} className="card space-y-2.5 p-4">
            <Osso w={90} h={10} />
            <Osso w={130} h={16} />
            <Osso w="70%" h={10} />
          </section>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card space-y-3 p-4 lg:col-span-2">
          <Osso w={120} h={10} />
          <OssoTabela colunas={[140, 90, 80, 90, 90]} linhas={3} />
        </section>
        <OssoSecao linhas={5} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <OssoSecao linhas={4} />
        <OssoSecao linhas={4} />
      </div>
    </Esqueleto>
  )
}

/** `/deadlines` e `/portal/deadlines` — chips de estado + lista de cartões de prazo. */
export function EsqPrazos() {
  return (
    <Esqueleto>
      <OssoCabecalho acao={150} />
      <OssoChips larguras={[64, 96, 120, 80, 90]} />
      <OssoListaCartoes n={10} />
      <OssoPaginacao />
    </Esqueleto>
  )
}

/** `/threats` — vigilância, abas, filtros e a lista de ameaças. */
export function EsqAmeacas() {
  return (
    <Esqueleto>
      <OssoCabecalho titulo={220} />
      <section className="card flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-[240px] flex-1 space-y-2">
          <Osso w={180} h={12} />
          <Osso w="75%" h={10} />
        </div>
        <div className="flex gap-2">
          <Osso w={130} h={34} r={8} />
          <Osso w={150} h={34} r={8} />
        </div>
      </section>
      <OssoAbas larguras={[120, 104, 112]} />
      <OssoChips larguras={[70, 110, 96, 120]} />
      <OssoListaCartoes n={6} alto />
    </Esqueleto>
  )
}

/** `/threats/[id]` e `/portal/threats/[id]` — o caso: confronto lado a lado + dimensões. */
export function EsqAmeaca() {
  return (
    <Esqueleto>
      <div className="space-y-2.5">
        <OssoVoltar />
        <Osso w={300} h={22} r={7} />
        <div className="flex gap-2">
          <Osso w={96} h={22} r={999} />
          <Osso w={120} h={22} r={999} />
        </div>
      </div>
      <section className="card p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Osso w={80} h={9} />
              <Osso w={`${70 - (i % 3) * 12}%`} h={13} />
            </div>
          ))}
        </div>
      </section>
      <OssoCartao tituloW={160}>
        <OssoTabela colunas={[150, 120, 320]} linhas={4} />
      </OssoCartao>
      <OssoSecao linhas={4} tituloW={150} />
    </Esqueleto>
  )
}

/** `/documents` — envio + filtro + tabela do acervo. */
export function EsqDocumentos() {
  return (
    <Esqueleto>
      <OssoCabecalho titulo={160} />
      <OssoCartao tituloW={130}>
        <div className="space-y-3">
          <Osso h={130} r={12} />
          <OssoCampos larguras={[280, 160, 190]} />
        </div>
      </OssoCartao>
      <OssoChips larguras={[64, 92, 110, 84]} />
      <section className="card p-4">
        <OssoTabela colunas={[220, 110, 170, 70, 50, 60, 200]} linhas={8} minW={820} />
      </section>
    </Esqueleto>
  )
}

/** `/clients` — abas + busca + grade de cartões de cliente. */
export function EsqClientes() {
  return (
    <Esqueleto>
      <OssoCabecalho acao={190} />
      <Osso h={38} r={8} />
      <OssoGradeCartoes n={9} colunas="md:grid-cols-2 xl:grid-cols-3" />
    </Esqueleto>
  )
}

/** `/clients/[id]` — ficha do cliente. */
export function EsqCliente() {
  return (
    <Esqueleto>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2.5">
          <OssoVoltar />
          <Osso w={280} h={22} r={7} />
          <Osso w={220} h={11} />
        </div>
        <div className="flex gap-2">
          <Osso w={160} h={34} r={8} />
          <Osso w={170} h={34} r={8} />
        </div>
      </div>
      <div className="mt-5">
        <OssoIndicadores n={4} colunas="sm:grid-cols-2 xl:grid-cols-4" />
      </div>
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="card space-y-3 p-4">
          <Osso w={120} h={10} />
          <OssoLinhas n={7} bandeira />
        </section>
        <div className="space-y-4">
          <OssoSecao linhas={3} />
          <OssoSecao linhas={3} />
          <OssoSecao linhas={2} />
        </div>
      </div>
    </Esqueleto>
  )
}

/** `/people` — abas + busca + grupos de duplicadas (a aba que abre primeiro). */
export function EsqPessoas() {
  return (
    <Esqueleto>
      <OssoCabecalho acao={220} />
      <Osso h={38} r={8} />
      <OssoTexto linhas={2} />
      {Array.from({ length: 4 }, (_, g) => (
        <section key={g} className="card space-y-2.5 p-3">
          <OssoTabela colunas={[70, 90, 200, 70, 140, 90, 60]} linhas={g % 2 ? 3 : 2} />
          <Osso w={150} h={32} r={8} />
        </section>
      ))}
    </Esqueleto>
  )
}

/** `/reconciliation` — abas + busca + grupos de ativos sem cliente. */
export function EsqConciliacao() {
  return (
    <Esqueleto>
      <OssoCabecalho acao={330} />
      <Osso h={38} r={8} />
      {Array.from({ length: 5 }, (_, g) => (
        <section key={g} className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <Osso w={`${40 - (g % 3) * 6}%`} h={14} />
            <Osso w={140} h={11} />
          </div>
          <Osso w="85%" h={10} />
          <div className="flex flex-wrap gap-2">
            <Osso w={210} h={34} r={8} />
            <Osso w={190} h={34} r={8} />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[280px] space-y-1.5">
              <Osso w={70} h={9} />
              <Osso h={34} r={8} />
            </div>
            <Osso w={170} h={34} r={8} />
          </div>
        </section>
      ))}
    </Esqueleto>
  )
}

/** `/export` — três cartões de exportação. */
export function EsqExportar() {
  return (
    <Esqueleto>
      {[
        { t: 190, botao: 200 },
        { t: 140, botao: 0 },
        { t: 160, botao: 210 },
      ].map((c, i) => (
        <OssoCartao key={i} tituloW={c.t} acessorio={i === 2 ? 130 : false}>
          <div className="space-y-3">
            <OssoTexto linhas={2} />
            {c.botao ? (
              <Osso w={c.botao} h={34} r={8} />
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-[280px] space-y-1.5">
                  <Osso w={60} h={9} />
                  <Osso h={34} r={8} />
                </div>
                <Osso w={80} h={34} r={8} />
              </div>
            )}
          </div>
        </OssoCartao>
      ))}
    </Esqueleto>
  )
}

/** `/users` — abas + busca + tabela de logins (com foto). Só o miolo da tabela, para dentro do cartão. */
export function OssoTabelaUsuarios() {
  return <OssoTabela colunas={[150, 170, 100, 140, 110, 110, 80, 120]} linhas={8} avatar={0} duasLinhas={[4, 5]} minW={980} />
}

export function EsqUsuarios() {
  return (
    <Esqueleto>
      <OssoCartao tituloW={80} acessorio={110}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <OssoAbas larguras={[84, 76, 70]} />
          <Osso w={300} h={34} r={8} />
        </div>
        <OssoTabelaUsuarios />
      </OssoCartao>
    </Esqueleto>
  )
}

/** `/activity` — a tabela do histórico (miolo, para dentro do cartão "Registros"). */
export function OssoTabelaAtividades() {
  return (
    <>
      <OssoTabela colunas={[90, 170, 90, 360, 140]} linhas={10} avatar={1} duasLinhas={[0, 1]} minW={900} />
      <OssoPaginacao />
    </>
  )
}

/** `/profile` e `/portal/profile` — foto à esquerda, dados e senha à direita. */
export function EsqPerfil() {
  return (
    <Esqueleto>
      <OssoCabecalho titulo={150} />
      <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
        <OssoCartao tituloW={40}>
          <div className="flex flex-col items-center gap-3 py-2">
            <OssoCirculo d={112} />
            <Osso w={150} h={14} />
            <Osso w={90} h={10} />
            <div className="flex gap-2">
              <Osso w={110} h={34} r={8} />
              <Osso w={80} h={34} r={8} />
            </div>
            <Osso w={220} h={9} />
          </div>
        </OssoCartao>
        <div className="space-y-4">
          <OssoCartao tituloW={120}>
            <div className="space-y-3">
              <OssoGradeCampos n={2} colunas="sm:grid-cols-2" />
              <OssoGradeCampos n={1} colunas="" />
              <OssoGradeCampos n={2} colunas="sm:grid-cols-2" />
              <Osso w={120} h={34} r={8} />
            </div>
          </OssoCartao>
          <OssoCartao tituloW={60}>
            <div className="space-y-3">
              <OssoGradeCampos n={3} colunas="sm:grid-cols-3" />
              <Osso w={120} h={34} r={8} />
            </div>
          </OssoCartao>
        </div>
      </div>
    </Esqueleto>
  )
}

/** As telas beta (comunicados, inteligência, investimentos): cabeçalho, tarja e o rascunho. */
export function EsqBeta() {
  return (
    <Esqueleto>
      <OssoCabecalho titulo={190} />
      <Osso h={74} r={12} />
      <OssoIndicadores n={3} colunas="sm:grid-cols-3" />
      <OssoCartao tituloW={180}>
        <OssoTexto linhas={4} />
      </OssoCartao>
    </Esqueleto>
  )
}

// ── Portal do cliente ────────────────────────────────────────────────────────────────────

/** `/portal` — Meu portfólio. */
export function EsqPortalInicio() {
  return (
    <Esqueleto>
      <OssoCabecalho titulo={210} />
      <div className="mt-5">
        <OssoIndicadores n={4} colunas="sm:grid-cols-2 xl:grid-cols-4" />
      </div>
      <section className="card mt-6 space-y-3 p-4">
        <div className="flex items-center justify-between">
          <Osso w={130} h={10} />
          <Osso w={150} h={10} />
        </div>
        <OssoTabela colunas={[110, 24, 220, 200, 70]} linhas={5} />
      </section>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <section className="card p-4">
          <OssoCalendario />
        </section>
        <section className="card space-y-3 p-4">
          <Osso w={130} h={10} />
          <OssoListaCartoes n={3} />
        </section>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <section className="card space-y-3 p-4">
          <Osso w={160} h={10} />
          <OssoMapa />
        </section>
        <OssoPorMateriaEJurisdicao />
      </div>
    </Esqueleto>
  )
}

/** `/portal/assets` — abas de matéria + busca + grade de cartões dos ativos. */
export function EsqPortalAtivos() {
  return (
    <Esqueleto>
      <OssoCabecalho titulo={160} />
      <div className="flex flex-wrap items-center gap-2">
        <OssoAbas larguras={[60, 70, 80, 110]} />
        <span className="min-w-[190px] flex-1">
          <Osso h={32} r={8} />
        </span>
      </div>
      <OssoGradeCartoes n={6} colunas="md:grid-cols-2 xl:grid-cols-3" />
    </Esqueleto>
  )
}

/** `/portal/threats` — filtros + lista de ameaças com parecer. */
export function EsqPortalAmeacas() {
  return (
    <Esqueleto>
      <OssoCabecalho titulo={200} />
      <OssoChips larguras={[70, 110, 96]} />
      <OssoListaCartoes n={5} alto />
    </Esqueleto>
  )
}

/** `/portal/documents` — filtros + lista de documentos (ícone, nome, botão de baixar). */
export function EsqPortalDocumentos() {
  return (
    <Esqueleto>
      <OssoCabecalho titulo={170} />
      <OssoChips larguras={[64, 92, 110]} />
      <OssoChips larguras={[70, 100, 120]} />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="card flex items-center gap-3 p-3">
            <Osso w={32} h={32} r={8} className="flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Osso w={`${50 - (i % 3) * 8}%`} h={12} />
              <Osso w="35%" h={9} />
            </div>
            <Osso w={32} h={32} r={8} />
          </div>
        ))}
      </div>
    </Esqueleto>
  )
}

/** `/portal/history` — abas + linha do tempo. */
export function EsqPortalHistorico() {
  return (
    <Esqueleto>
      <OssoCabecalho titulo={150} />
      <OssoAbas larguras={[110, 96]} />
      <OssoListaCartoes n={8} />
    </Esqueleto>
  )
}

/**
 * O esqueleto do portal pela rota aberta: a moldura do portal espera a visão do cliente chegar
 * antes de mostrar qualquer página, então ela escolhe o desenho certo pelo endereço.
 */
export function EsqPortalPorRota({ caminho }: { caminho: string }) {
  const r = caminho.replace(/\/+$/, '')
  if (/^\/portal\/assets\/[^/]+$/.test(r)) return <EsqAtivo />
  if (r === '/portal/assets') return <EsqPortalAtivos />
  if (r === '/portal/deadlines') return <EsqPrazos />
  if (/^\/portal\/threats\/[^/]+$/.test(r)) return <EsqAmeaca />
  if (r === '/portal/threats') return <EsqPortalAmeacas />
  if (r === '/portal/documents') return <EsqPortalDocumentos />
  if (r === '/portal/history') return <EsqPortalHistorico />
  if (r === '/portal/profile') return <EsqPerfil />
  if (r.startsWith('/portal/intelligence') || r.startsWith('/portal/investments')) return <EsqBeta />
  return <EsqPortalInicio />
}
