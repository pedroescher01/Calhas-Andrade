import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { obterBanco } from "@/db";
import {
  calheiros,
  clientes,
  compraItens,
  compras,
  configuracoes,
  fornecedores,
  lancamentos,
  listaCompras,
  movimentosCalheiro,
  orcamentoItens,
  orcamentos,
  pagamentos,
  tiposCalha,
  usuario,
  type Calheiro,
  type Cliente,
  type Configuracoes,
  type Fornecedor,
  type Orcamento,
  type OrcamentoItem,
  type Pagamento,
  type CompraItem,
} from "@/db/schema";
import { calcularTotais, type TotaisOrcamento } from "@/dominio/orcamento";
import { calcularSaldoCalheiro, type SaldoCalheiro } from "@/dominio/calheiro";
import { hoje, primeiroDiaDoMes, ultimoDiaDoMes } from "@/dominio/datas";

/**
 * Tudo que o sistema LE fica aqui. As escritas ficam em acoes.ts.
 *
 * Os totais do orcamento nao sao guardados em coluna: sao sempre
 * recalculados dos itens e dos pagamentos. Em uma fabrica com algumas
 * centenas de orcamentos por ano isso custa quase nada, e em troca nunca
 * acontece o pior problema desse tipo de sistema, que e a tela mostrar um
 * total e o banco guardar outro.
 */

// ---------------------------------------------------------------------------
// Configuracoes
// ---------------------------------------------------------------------------

export async function obterConfiguracoes(): Promise<Configuracoes> {
  const banco = obterBanco();
  const linhas = await banco.select().from(configuracoes).limit(1);
  if (linhas[0]) return linhas[0];

  const [criada] = await banco.insert(configuracoes).values({ id: 1 }).returning();
  return criada!;
}

/** Nome do dono, para a saudacao do painel. */
export async function obterNomeDono(): Promise<string | null> {
  const banco = obterBanco();
  const linhas = await banco.select({ nome: usuario.nome }).from(usuario).limit(1);
  const nome = linhas[0]?.nome?.trim();
  // "Dono" e o nome generico do primeiro acesso: nao vale como saudacao.
  return !nome || nome === "Dono" ? null : nome;
}

// ---------------------------------------------------------------------------
// Orcamentos
// ---------------------------------------------------------------------------

export type OrcamentoResumo = {
  id: number;
  clienteId: number | null;
  clienteNome: string;
  clienteTelefone: string | null;
  dataEmissao: string;
  status: Orcamento["status"];
  situacaoObra: Orcamento["situacaoObra"];
  dataAgendada: string | null;
  calheiroId: number | null;
  calheiroNome: string | null;
  enderecoObra: string | null;
  totais: TotaisOrcamento;
};

export type OrcamentoCompleto = OrcamentoResumo & {
  validadeDias: number;
  observacoes: string | null;
  descontoCentavos: number;
  acrescimoNotaCentavos: number;
  criadoEm: Date;
  arquivadoEm: Date | null;
  itens: OrcamentoItem[];
  pagamentos: Pagamento[];
  cliente: Cliente | null;
};

export type FiltrosOrcamento = {
  status?: Orcamento["status"];
  statusFinanceiro?: TotaisOrcamento["statusFinanceiro"];
  situacaoObra?: Orcamento["situacaoObra"];
  clienteId?: number;
  busca?: string;
  inicio?: string;
  fim?: string;
  incluirArquivados?: boolean;
  limite?: number;
};

export async function listarOrcamentos(
  filtros: FiltrosOrcamento = {},
): Promise<OrcamentoResumo[]> {
  const banco = obterBanco();

  const condicoes = [];
  if (!filtros.incluirArquivados) condicoes.push(isNull(orcamentos.arquivadoEm));
  if (filtros.status) condicoes.push(eq(orcamentos.status, filtros.status));
  if (filtros.situacaoObra) {
    condicoes.push(eq(orcamentos.situacaoObra, filtros.situacaoObra));
  }
  if (filtros.clienteId) condicoes.push(eq(orcamentos.clienteId, filtros.clienteId));
  if (filtros.inicio) condicoes.push(gte(orcamentos.dataEmissao, filtros.inicio));
  if (filtros.fim) condicoes.push(lte(orcamentos.dataEmissao, filtros.fim));

  const linhas = await banco
    .select({
      orcamento: orcamentos,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      calheiroNome: calheiros.nome,
    })
    .from(orcamentos)
    .leftJoin(clientes, eq(clientes.id, orcamentos.clienteId))
    .leftJoin(calheiros, eq(calheiros.id, orcamentos.calheiroId))
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(desc(orcamentos.dataEmissao), desc(orcamentos.id));

  if (linhas.length === 0) return [];

  const ids = linhas.map((l) => l.orcamento.id);
  const [itens, pagos] = await Promise.all([
    banco.select().from(orcamentoItens).where(inArray(orcamentoItens.orcamentoId, ids)),
    banco.select().from(pagamentos).where(inArray(pagamentos.orcamentoId, ids)),
  ]);

  const itensPorOrcamento = agrupar(itens, (i) => i.orcamentoId);
  const pagosPorOrcamento = agrupar(pagos, (p) => p.orcamentoId);

  let resultado: OrcamentoResumo[] = linhas.map((l) => {
    const o = l.orcamento;
    return {
      id: o.id,
      clienteId: o.clienteId,
      clienteNome: l.clienteNome ?? o.clienteNomeAvulso ?? "Sem cliente",
      clienteTelefone: l.clienteTelefone ?? null,
      dataEmissao: o.dataEmissao,
      status: o.status,
      situacaoObra: o.situacaoObra,
      dataAgendada: o.dataAgendada,
      calheiroId: o.calheiroId,
      calheiroNome: l.calheiroNome ?? null,
      enderecoObra: o.enderecoObra,
      totais: calcularTotais({
        itens: itensPorOrcamento.get(o.id) ?? [],
        pagamentos: pagosPorOrcamento.get(o.id) ?? [],
        descontoCentavos: o.descontoCentavos,
        acrescimoNotaCentavos: o.acrescimoNotaCentavos,
      }),
    };
  });

  // Status financeiro e busca por nome sao filtrados depois: um vem de
  // conta, o outro precisa olhar tanto o cliente cadastrado quanto o
  // nome avulso anotado no celular.
  if (filtros.statusFinanceiro) {
    resultado = resultado.filter(
      (o) => o.totais.statusFinanceiro === filtros.statusFinanceiro,
    );
  }
  if (filtros.busca) {
    const termo = filtros.busca.toLowerCase().trim();
    resultado = resultado.filter(
      (o) =>
        o.clienteNome.toLowerCase().includes(termo) ||
        String(o.id) === termo.replace("#", "") ||
        (o.enderecoObra ?? "").toLowerCase().includes(termo),
    );
  }
  if (filtros.limite) resultado = resultado.slice(0, filtros.limite);

  return resultado;
}

export async function obterOrcamento(id: number): Promise<OrcamentoCompleto | null> {
  const banco = obterBanco();

  const linhas = await banco
    .select({
      orcamento: orcamentos,
      cliente: clientes,
      calheiroNome: calheiros.nome,
    })
    .from(orcamentos)
    .leftJoin(clientes, eq(clientes.id, orcamentos.clienteId))
    .leftJoin(calheiros, eq(calheiros.id, orcamentos.calheiroId))
    .where(eq(orcamentos.id, id))
    .limit(1);

  const linha = linhas[0];
  if (!linha) return null;

  const [itens, pagos] = await Promise.all([
    banco
      .select()
      .from(orcamentoItens)
      .where(eq(orcamentoItens.orcamentoId, id))
      .orderBy(asc(orcamentoItens.ordem), asc(orcamentoItens.id)),
    banco
      .select()
      .from(pagamentos)
      .where(eq(pagamentos.orcamentoId, id))
      .orderBy(desc(pagamentos.data), desc(pagamentos.id)),
  ]);

  const o = linha.orcamento;
  return {
    id: o.id,
    clienteId: o.clienteId,
    clienteNome: linha.cliente?.nome ?? o.clienteNomeAvulso ?? "Sem cliente",
    clienteTelefone: linha.cliente?.telefone ?? null,
    dataEmissao: o.dataEmissao,
    status: o.status,
    situacaoObra: o.situacaoObra,
    dataAgendada: o.dataAgendada,
    calheiroId: o.calheiroId,
    calheiroNome: linha.calheiroNome ?? null,
    enderecoObra: o.enderecoObra,
    validadeDias: o.validadeDias,
    observacoes: o.observacoes,
    descontoCentavos: o.descontoCentavos,
    acrescimoNotaCentavos: o.acrescimoNotaCentavos,
    criadoEm: o.criadoEm,
    arquivadoEm: o.arquivadoEm,
    itens,
    pagamentos: pagos,
    cliente: linha.cliente,
    totais: calcularTotais({
      itens,
      pagamentos: pagos,
      descontoCentavos: o.descontoCentavos,
      acrescimoNotaCentavos: o.acrescimoNotaCentavos,
    }),
  };
}

// ---------------------------------------------------------------------------
// Cadastros
// ---------------------------------------------------------------------------

export async function listarTiposCalha(incluirInativos = false): Promise<
  (typeof tiposCalha.$inferSelect)[]
> {
  const banco = obterBanco();
  return banco
    .select()
    .from(tiposCalha)
    .where(incluirInativos ? undefined : eq(tiposCalha.ativo, true))
    .orderBy(asc(tiposCalha.ordem), asc(tiposCalha.nome));
}

export type ClienteComMetricas = Cliente & {
  qtdOrcamentos: number;
  totalFaturado: number;
  saldoDevedor: number;
};

export async function listarClientes(opcoes: {
  busca?: string;
  incluirArquivados?: boolean;
} = {}): Promise<ClienteComMetricas[]> {
  const banco = obterBanco();

  const condicoes = [];
  if (!opcoes.incluirArquivados) condicoes.push(isNull(clientes.arquivadoEm));
  if (opcoes.busca) {
    const termo = `%${opcoes.busca.trim()}%`;
    condicoes.push(
      or(
        sql`${clientes.nome} ILIKE ${termo}`,
        sql`coalesce(${clientes.telefone}, '') ILIKE ${termo}`,
      )!,
    );
  }

  const lista = await banco
    .select()
    .from(clientes)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(asc(clientes.nome));

  if (lista.length === 0) return [];

  const todos = await listarOrcamentos({ incluirArquivados: false });
  return lista.map((c) => {
    const meus = todos.filter((o) => o.clienteId === c.id && o.status !== "cancelado");
    return {
      ...c,
      qtdOrcamentos: meus.length,
      totalFaturado: meus.reduce((s, o) => s + o.totais.total, 0),
      saldoDevedor: meus.reduce((s, o) => s + o.totais.saldo, 0),
    };
  });
}

export async function obterCliente(id: number): Promise<Cliente | null> {
  const banco = obterBanco();
  const linhas = await banco.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  return linhas[0] ?? null;
}

export async function listarFornecedores(opcoes: {
  busca?: string;
  categoria?: Fornecedor["categoria"];
  incluirInativos?: boolean;
} = {}): Promise<Fornecedor[]> {
  const banco = obterBanco();
  const condicoes = [];
  if (!opcoes.incluirInativos) condicoes.push(eq(fornecedores.ativo, true));
  if (opcoes.categoria) condicoes.push(eq(fornecedores.categoria, opcoes.categoria));
  if (opcoes.busca) {
    const termo = `%${opcoes.busca.trim()}%`;
    condicoes.push(
      or(
        sql`${fornecedores.nome} ILIKE ${termo}`,
        sql`coalesce(${fornecedores.nomeFantasia}, '') ILIKE ${termo}`,
        sql`coalesce(${fornecedores.telefone}, '') ILIKE ${termo}`,
      )!,
    );
  }
  return banco
    .select()
    .from(fornecedores)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(asc(fornecedores.nome));
}

// ---------------------------------------------------------------------------
// Calheiros
// ---------------------------------------------------------------------------

export type CalheiroComSaldo = Calheiro & { saldo: SaldoCalheiro };

export async function listarCalheirosComSaldo(
  incluirInativos = false,
): Promise<CalheiroComSaldo[]> {
  const banco = obterBanco();

  const lista = await banco
    .select()
    .from(calheiros)
    .where(incluirInativos ? undefined : eq(calheiros.ativo, true))
    .orderBy(asc(calheiros.nome));

  if (lista.length === 0) return [];

  const [obras, movimentos] = await Promise.all([
    listarOrcamentos({ incluirArquivados: false }),
    banco.select().from(movimentosCalheiro),
  ]);

  return lista.map((c) => {
    const minhasObras = obras
      .filter((o) => o.calheiroId === c.id && o.status !== "cancelado" && o.status !== "recusado")
      .map((o) => ({
        orcamentoId: o.id,
        totalMaoObra: o.totais.totalMaoObra,
        maoObraLiberada: o.totais.maoObraLiberada,
      }));

    return {
      ...c,
      saldo: calcularSaldoCalheiro({
        obras: minhasObras,
        movimentos: movimentos.filter((m) => m.calheiroId === c.id),
      }),
    };
  });
}

export type LinhaExtrato = {
  data: string;
  tipo: "mao_de_obra" | "vale" | "acerto" | "ajuste";
  descricao: string;
  orcamentoId: number | null;
  /** Positivo: a fabrica passou a dever. Negativo: saiu dinheiro para ele. */
  valorCentavos: number;
  movimentoId: number | null;
  cancelado: boolean;
};

export async function extratoCalheiro(calheiroId: number): Promise<{
  calheiro: Calheiro | null;
  saldo: SaldoCalheiro;
  linhas: LinhaExtrato[];
}> {
  const banco = obterBanco();
  const achados = await banco
    .select()
    .from(calheiros)
    .where(eq(calheiros.id, calheiroId))
    .limit(1);

  const calheiro = achados[0] ?? null;
  const vazio: SaldoCalheiro = {
    liberado: 0, aLiberar: 0, vales: 0, acertos: 0, ajustes: 0, pago: 0, saldo: 0,
  };
  if (!calheiro) return { calheiro: null, saldo: vazio, linhas: [] };

  const [obras, movimentos] = await Promise.all([
    listarOrcamentos({ incluirArquivados: false }),
    banco
      .select()
      .from(movimentosCalheiro)
      .where(eq(movimentosCalheiro.calheiroId, calheiroId))
      .orderBy(desc(movimentosCalheiro.data), desc(movimentosCalheiro.id)),
  ]);

  const minhasObras = obras.filter(
    (o) => o.calheiroId === calheiroId && o.status !== "cancelado" && o.status !== "recusado",
  );

  const linhas: LinhaExtrato[] = [];

  for (const obra of minhasObras) {
    if (obra.totais.maoObraLiberada > 0) {
      linhas.push({
        data: obra.dataEmissao,
        tipo: "mao_de_obra",
        descricao: `Mão de obra liberada - ${obra.clienteNome}`,
        orcamentoId: obra.id,
        valorCentavos: obra.totais.maoObraLiberada,
        movimentoId: null,
        cancelado: false,
      });
    }
  }

  for (const m of movimentos) {
    linhas.push({
      data: m.data,
      tipo: m.tipo,
      descricao: m.descricao ?? rotuloMovimento(m.tipo),
      orcamentoId: m.orcamentoId,
      valorCentavos: -m.valorCentavos,
      movimentoId: m.id,
      cancelado: m.canceladoEm != null,
    });
  }

  linhas.sort((a, b) => (a.data === b.data ? 0 : a.data < b.data ? 1 : -1));

  return {
    calheiro,
    saldo: calcularSaldoCalheiro({
      obras: minhasObras.map((o) => ({
        orcamentoId: o.id,
        totalMaoObra: o.totais.totalMaoObra,
        maoObraLiberada: o.totais.maoObraLiberada,
      })),
      movimentos,
    }),
    linhas,
  };
}

function rotuloMovimento(tipo: "vale" | "acerto" | "ajuste"): string {
  if (tipo === "vale") return "Vale";
  if (tipo === "acerto") return "Acerto";
  return "Ajuste";
}

function agrupar<T, K>(lista: T[], chave: (item: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>();
  for (const item of lista) {
    const k = chave(item);
    const atual = mapa.get(k);
    if (atual) atual.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export type ResumoFinanceiro = {
  inicio: string;
  fim: string;
  /** Pagamentos de clientes recebidos no periodo. */
  recebido: number;
  /** Entradas que nao vem de orcamento (venda de sucata, etc). */
  entradasAvulsas: number;
  /** Saidas efetivamente pagas no periodo. */
  saidasPagas: number;
  /** Entrou menos saiu, no periodo. */
  resultado: number;
  /** Soma do saldo de todos os orcamentos nao quitados (fora do periodo). */
  aReceber: number;
  /** Contas em aberto (fora do periodo). */
  aPagar: number;
  /** Contas em aberto que ja venceram. */
  vencidas: number;
  /** Saldo atual do caixa. Null enquanto o saldo inicial nao for definido. */
  caixa: number | null;
  saidasPorCategoria: { categoria: string; total: number }[];
  obrasAFazer: number;
  obrasAgendadas: number;
  /** Total que a fabrica deve aos calheiros agora. */
  devidoCalheiros: number;
};

export async function resumoFinanceiro(opcoes: {
  inicio?: string;
  fim?: string;
} = {}): Promise<ResumoFinanceiro> {
  const banco = obterBanco();
  const hojeTexto = hoje();
  const inicio = opcoes.inicio ?? primeiroDiaDoMes(hojeTexto);
  const fim = opcoes.fim ?? ultimoDiaDoMes(hojeTexto);

  const config = await obterConfiguracoes();

  const [pagosNoPeriodo, lancamentosTodos, todosOrcamentos, calheirosSaldo] =
    await Promise.all([
      banco
        .select()
        .from(pagamentos)
        .where(
          and(
            isNull(pagamentos.estornadoEm),
            gte(pagamentos.data, inicio),
            lte(pagamentos.data, fim),
          ),
        ),
      banco.select().from(lancamentos).where(ne(lancamentos.status, "cancelado")),
      listarOrcamentos({ incluirArquivados: false }),
      listarCalheirosComSaldo(true),
    ]);

  const recebido = pagosNoPeriodo.reduce((s, p) => s + p.valorCentavos, 0);

  const pagosDoPeriodo = lancamentosTodos.filter(
    (l) =>
      l.status === "pago" &&
      l.dataPagamento != null &&
      l.dataPagamento >= inicio &&
      l.dataPagamento <= fim,
  );
  const saidasPagas = pagosDoPeriodo
    .filter((l) => l.tipo === "saida")
    .reduce((s, l) => s + l.valorCentavos, 0);
  const entradasAvulsas = pagosDoPeriodo
    .filter((l) => l.tipo === "entrada")
    .reduce((s, l) => s + l.valorCentavos, 0);

  const abertos = lancamentosTodos.filter((l) => l.status === "aberto" && l.tipo === "saida");
  const aPagar = abertos.reduce((s, l) => s + l.valorCentavos, 0);
  const vencidas = abertos
    .filter((l) => l.vencimento < hojeTexto)
    .reduce((s, l) => s + l.valorCentavos, 0);

  const porCategoria = new Map<string, number>();
  for (const l of pagosDoPeriodo) {
    if (l.tipo !== "saida") continue;
    porCategoria.set(l.categoria, (porCategoria.get(l.categoria) ?? 0) + l.valorCentavos);
  }

  const vivos = todosOrcamentos.filter(
    (o) => o.status !== "cancelado" && o.status !== "recusado" && o.status !== "rascunho",
  );

  return {
    inicio,
    fim,
    recebido,
    entradasAvulsas,
    saidasPagas,
    resultado: recebido + entradasAvulsas - saidasPagas,
    aReceber: vivos.reduce((s, o) => s + o.totais.saldo, 0),
    aPagar,
    vencidas,
    caixa: await calcularCaixa(config),
    saidasPorCategoria: [...porCategoria.entries()]
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total),
    obrasAFazer: vivos.filter((o) => o.situacaoObra === "a_fazer").length,
    obrasAgendadas: vivos.filter((o) => o.situacaoObra === "agendada").length,
    devidoCalheiros: calheirosSaldo.reduce(
      (s, c) => s + Math.max(0, c.saldo.saldo),
      0,
    ),
  };
}

/**
 * Saldo do caixa hoje.
 *
 * Conta a partir do saldo inicial informado pelo dono: tudo que entrou e
 * saiu desde aquela data. Sem saldo inicial nao da para saber quanto tem em
 * caixa, so quanto girou -- por isso devolve null em vez de inventar zero.
 */
async function calcularCaixa(config: Configuracoes): Promise<number | null> {
  if (config.saldoInicialCentavos == null || config.saldoInicialData == null) {
    return null;
  }

  const banco = obterBanco();
  const desde = config.saldoInicialData;
  const ate = hoje();

  const [entradasCliente, movimentos] = await Promise.all([
    banco
      .select({ total: sql<number>`coalesce(sum(${pagamentos.valorCentavos}), 0)::int` })
      .from(pagamentos)
      .where(
        and(
          isNull(pagamentos.estornadoEm),
          gte(pagamentos.data, desde),
          lte(pagamentos.data, ate),
        ),
      ),
    banco
      .select({
        tipo: lancamentos.tipo,
        total: sql<number>`coalesce(sum(${lancamentos.valorCentavos}), 0)::int`,
      })
      .from(lancamentos)
      .where(
        and(
          eq(lancamentos.status, "pago"),
          gte(lancamentos.dataPagamento, desde),
          lte(lancamentos.dataPagamento, ate),
        ),
      )
      .groupBy(lancamentos.tipo),
  ]);

  const entradas = Number(entradasCliente[0]?.total ?? 0);
  const entradasAvulsas = Number(
    movimentos.find((m) => m.tipo === "entrada")?.total ?? 0,
  );
  const saidas = Number(movimentos.find((m) => m.tipo === "saida")?.total ?? 0);

  return config.saldoInicialCentavos + entradas + entradasAvulsas - saidas;
}

export type LancamentoComFornecedor = typeof lancamentos.$inferSelect & {
  fornecedorNome: string | null;
  calheiroNome: string | null;
};

export async function listarLancamentos(filtros: {
  tipo?: "entrada" | "saida";
  status?: "aberto" | "pago" | "cancelado";
  inicio?: string;
  fim?: string;
  /** "vencimento" para contas a pagar, "pagamento" para o que saiu. */
  porData?: "vencimento" | "pagamento";
  limite?: number;
} = {}): Promise<LancamentoComFornecedor[]> {
  const banco = obterBanco();
  const coluna =
    filtros.porData === "pagamento" ? lancamentos.dataPagamento : lancamentos.vencimento;

  const condicoes = [];
  if (filtros.tipo) condicoes.push(eq(lancamentos.tipo, filtros.tipo));
  if (filtros.status) condicoes.push(eq(lancamentos.status, filtros.status));
  if (filtros.inicio) condicoes.push(gte(coluna, filtros.inicio));
  if (filtros.fim) condicoes.push(lte(coluna, filtros.fim));

  const consulta = banco
    .select({
      lancamento: lancamentos,
      fornecedorNome: fornecedores.nome,
      calheiroNome: calheiros.nome,
    })
    .from(lancamentos)
    .leftJoin(fornecedores, eq(fornecedores.id, lancamentos.fornecedorId))
    .leftJoin(calheiros, eq(calheiros.id, lancamentos.calheiroId))
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(desc(coluna), desc(lancamentos.id));

  const linhas = filtros.limite
    ? await consulta.limit(filtros.limite)
    : await consulta;

  return linhas.map((l) => ({
    ...l.lancamento,
    fornecedorNome: l.fornecedorNome ?? null,
    calheiroNome: l.calheiroNome ?? null,
  }));
}

export async function contasAPagar(): Promise<{
  vencidas: LancamentoComFornecedor[];
  vencemHoje: LancamentoComFornecedor[];
  aVencer: LancamentoComFornecedor[];
}> {
  const abertas = await listarLancamentos({ tipo: "saida", status: "aberto" });
  const hojeTexto = hoje();
  const porVencimento = [...abertas].sort((a, b) =>
    a.vencimento === b.vencimento ? 0 : a.vencimento < b.vencimento ? -1 : 1,
  );
  return {
    vencidas: porVencimento.filter((l) => l.vencimento < hojeTexto),
    vencemHoje: porVencimento.filter((l) => l.vencimento === hojeTexto),
    aVencer: porVencimento.filter((l) => l.vencimento > hojeTexto),
  };
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------

export type CompraResumo = {
  id: number;
  fornecedorId: number;
  fornecedorNome: string;
  data: string;
  status: (typeof compras.$inferSelect)["status"];
  previsaoEntrega: string | null;
  freteCentavos: number;
  observacao: string | null;
  total: number;
  qtdItens: number;
};

export async function listarCompras(filtros: {
  fornecedorId?: number;
  status?: CompraResumo["status"];
  limite?: number;
} = {}): Promise<CompraResumo[]> {
  const banco = obterBanco();

  const condicoes = [];
  if (filtros.fornecedorId) condicoes.push(eq(compras.fornecedorId, filtros.fornecedorId));
  if (filtros.status) condicoes.push(eq(compras.status, filtros.status));

  const linhas = await banco
    .select({ compra: compras, fornecedorNome: fornecedores.nome })
    .from(compras)
    .innerJoin(fornecedores, eq(fornecedores.id, compras.fornecedorId))
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(desc(compras.data), desc(compras.id));

  if (linhas.length === 0) return [];

  const itens = await banco
    .select()
    .from(compraItens)
    .where(inArray(compraItens.compraId, linhas.map((l) => l.compra.id)));

  const porCompra = agrupar(itens, (i) => i.compraId);

  return linhas.slice(0, filtros.limite ?? linhas.length).map((l) => {
    const meus = porCompra.get(l.compra.id) ?? [];
    const soma = meus.reduce(
      (s, i) =>
        s + Math.round((i.valorUnitarioCentavos * i.quantidadeMilesimos) / 1000),
      0,
    );
    return {
      id: l.compra.id,
      fornecedorId: l.compra.fornecedorId,
      fornecedorNome: l.fornecedorNome,
      data: l.compra.data,
      status: l.compra.status,
      previsaoEntrega: l.compra.previsaoEntrega,
      freteCentavos: l.compra.freteCentavos,
      observacao: l.compra.observacao,
      total: soma + l.compra.freteCentavos,
      qtdItens: meus.length,
    };
  });
}

export async function obterCompra(id: number): Promise<
  (CompraResumo & { itens: CompraItemLinha[] }) | null
> {
  const banco = obterBanco();
  const linhas = await banco
    .select({ compra: compras, fornecedorNome: fornecedores.nome })
    .from(compras)
    .innerJoin(fornecedores, eq(fornecedores.id, compras.fornecedorId))
    .where(eq(compras.id, id))
    .limit(1);

  const linha = linhas[0];
  if (!linha) return null;

  const itens = await banco
    .select()
    .from(compraItens)
    .where(eq(compraItens.compraId, id))
    .orderBy(asc(compraItens.id));

  const comTotal: CompraItemLinha[] = itens.map((i) => ({
    ...i,
    total: Math.round((i.valorUnitarioCentavos * i.quantidadeMilesimos) / 1000),
  }));

  return {
    id: linha.compra.id,
    fornecedorId: linha.compra.fornecedorId,
    fornecedorNome: linha.fornecedorNome,
    data: linha.compra.data,
    status: linha.compra.status,
    previsaoEntrega: linha.compra.previsaoEntrega,
    freteCentavos: linha.compra.freteCentavos,
    observacao: linha.compra.observacao,
    total: comTotal.reduce((s, i) => s + i.total, 0) + linha.compra.freteCentavos,
    qtdItens: comTotal.length,
    itens: comTotal,
  };
}

export type CompraItemLinha = CompraItem & { total: number };

export async function comprasPorFornecedor(): Promise<
  { fornecedorId: number; fornecedorNome: string; total: number; qtd: number }[]
> {
  const todas = await listarCompras({});
  const mapa = new Map<number, { nome: string; total: number; qtd: number }>();
  for (const c of todas) {
    if (c.status === "cancelado") continue;
    const atual = mapa.get(c.fornecedorId) ?? { nome: c.fornecedorNome, total: 0, qtd: 0 };
    atual.total += c.total;
    atual.qtd += 1;
    mapa.set(c.fornecedorId, atual);
  }
  return [...mapa.entries()]
    .map(([fornecedorId, v]) => ({
      fornecedorId,
      fornecedorNome: v.nome,
      total: v.total,
      qtd: v.qtd,
    }))
    .sort((a, b) => b.total - a.total);
}

export async function listarListaCompras(incluirComprados = false): Promise<
  ((typeof listaCompras.$inferSelect) & { fornecedorNome: string | null })[]
> {
  const banco = obterBanco();
  const linhas = await banco
    .select({ item: listaCompras, fornecedorNome: fornecedores.nome })
    .from(listaCompras)
    .leftJoin(fornecedores, eq(fornecedores.id, listaCompras.fornecedorId))
    .where(incluirComprados ? undefined : isNull(listaCompras.compradoEm))
    .orderBy(desc(listaCompras.criadoEm));
  return linhas.map((l) => ({ ...l.item, fornecedorNome: l.fornecedorNome ?? null }));
}

