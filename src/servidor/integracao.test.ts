import { describe, it, expect, beforeAll, vi } from "vitest";

/**
 * Teste de ponta a ponta sobre um Postgres de verdade (PGlite na memoria):
 * migracoes, acoes de escrita, consultas e as contas.
 *
 * O que ele prova, no fundo, e a regra que o dono descreveu: o pagamento do
 * cliente e o que libera a mao de obra para acerto com o calheiro, e o vale
 * que ele pega sai do caixa.
 */

// Banco novo na memoria a cada rodada, sem sujar a pasta .pglite do dev.
process.env.PGLITE_DIR = "memory://";
process.env.NODE_ENV = "test";
delete process.env.DATABASE_URL;

// O Next nao esta rodando aqui: cookies e revalidacao viram memoria e no-op.
const cookiesFalsos = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) =>
      cookiesFalsos.has(nome) ? { name: nome, value: cookiesFalsos.get(nome)! } : undefined,
    set: (nome: string, valor: string) => cookiesFalsos.set(nome, valor),
    delete: (nome: string) => cookiesFalsos.delete(nome),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { obterBanco } = await import("@/db");
const { aplicarMigracoes } = await import("@/db/migrar");
const acoes = await import("./acoes");
const consultas = await import("./consultas");
const { hoje, somarDias } = await import("@/dominio/datas");

let clienteId: number;
let calheiroId: number;

beforeAll(async () => {
  await aplicarMigracoes(obterBanco());

  const senha = await acoes.definirSenhaInicial("senha-de-teste");
  expect(senha.ok).toBe(true);

  const cliente = await acoes.salvarCliente({ nome: "Construtora Teste" });
  if (!cliente.ok) throw new Error(cliente.erro);
  clienteId = cliente.dados.id;

  const calheiro = await acoes.salvarCalheiro({ nome: "Jonas", tipo: "terceiro" });
  if (!calheiro.ok) throw new Error(calheiro.erro);
  calheiroId = calheiro.dados.id;
});

/** Cria um orcamento de 20 m: R$ 900 de material + R$ 300 de mao de obra. */
async function criarObra(): Promise<number> {
  const r = await acoes.criarOrcamento({
    clienteId,
    calheiroId,
    enderecoObra: "Rua de Teste, 100",
    itens: [
      {
        descricao: "Calha americana",
        unidade: "m",
        quantidade: "20",
        precoMaterial: "45,00",
        precoMaoObra: "15,00",
      },
    ],
  });
  if (!r.ok) throw new Error(r.erro);
  return r.dados.id;
}

describe("primeiro acesso", () => {
  it("depois de definir a senha, nao pede de novo", async () => {
    expect(await acoes.precisaDefinirSenha()).toBe(false);
  });

  it("recusa senha errada e aceita a certa", async () => {
    expect((await acoes.entrar("errada")).ok).toBe(false);
    expect((await acoes.entrar("senha-de-teste")).ok).toBe(true);
  });
});

describe("orcamento", () => {
  it("grava os itens e calcula material e mao de obra separados", async () => {
    const id = await criarObra();
    const orc = await consultas.obterOrcamento(id);

    expect(orc).not.toBeNull();
    expect(orc!.itens).toHaveLength(1);
    expect(orc!.totais.totalMaterial).toBe(90_000);
    expect(orc!.totais.totalMaoObra).toBe(30_000);
    expect(orc!.totais.total).toBe(120_000);
    expect(orc!.totais.statusFinanceiro).toBe("aberto");
    expect(orc!.clienteNome).toBe("Construtora Teste");
  });

  it("exige cliente", async () => {
    const r = await acoes.criarOrcamento({ itens: [] });
    expect(r.ok).toBe(false);
  });

  it("aceita nome avulso, para o uso rapido no celular", async () => {
    const r = await acoes.criarOrcamento({ clienteNomeAvulso: "Seu Joao da esquina" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const orc = await consultas.obterOrcamento(r.dados.id);
    expect(orc!.clienteNome).toBe("Seu Joao da esquina");
  });

  it("troca a lista de itens inteira ao salvar", async () => {
    const id = await criarObra();
    const r = await acoes.salvarItens(id, [
      { descricao: "Rufo capa", unidade: "m", quantidade: "10", precoMaterial: "38,00", precoMaoObra: "12,00" },
      { descricao: "Bocal", unidade: "un", quantidade: "2", precoMaterial: "35,00", precoMaoObra: "10,00" },
    ]);
    expect(r.ok).toBe(true);

    const orc = await consultas.obterOrcamento(id);
    expect(orc!.itens).toHaveLength(2);
    expect(orc!.totais.totalMaterial).toBe(38_000 + 7000);
    expect(orc!.totais.totalMaoObra).toBe(12_000 + 2000);
  });

  it("nao deixa agendar obra sem data", async () => {
    const id = await criarObra();
    const r = await acoes.atualizarOrcamento({ id, situacaoObra: "agendada" });
    expect(r.ok).toBe(false);
  });

  it("agenda com data e depois marca como feita", async () => {
    const id = await criarObra();
    const agendou = await acoes.atualizarOrcamento({
      id,
      situacaoObra: "agendada",
      dataAgendada: somarDias(hoje(), 3),
    });
    expect(agendou.ok).toBe(true);

    const feita = await acoes.atualizarOrcamento({ id, situacaoObra: "feita" });
    expect(feita.ok).toBe(true);

    const orc = await consultas.obterOrcamento(id);
    expect(orc!.situacaoObra).toBe("feita");
  });
});

describe("pagamento do cliente", () => {
  it("entrada parcial deixa o orcamento parcial", async () => {
    const id = await criarObra();
    const r = await acoes.registrarPagamento({ orcamentoId: id, valor: "600,00" });
    expect(r.ok).toBe(true);

    const orc = await consultas.obterOrcamento(id);
    expect(orc!.totais.pago).toBe(60_000);
    expect(orc!.totais.saldo).toBe(60_000);
    expect(orc!.totais.statusFinanceiro).toBe("parcial");
  });

  it("receber pagamento aprova o orcamento automaticamente", async () => {
    const id = await criarObra();
    expect((await consultas.obterOrcamento(id))!.status).toBe("rascunho");
    await acoes.registrarPagamento({ orcamentoId: id, valor: "100,00" });
    expect((await consultas.obterOrcamento(id))!.status).toBe("aprovado");
  });

  it("recusa valor zero ou negativo", async () => {
    const id = await criarObra();
    expect((await acoes.registrarPagamento({ orcamentoId: id, valor: "0" })).ok).toBe(false);
    expect((await acoes.registrarPagamento({ orcamentoId: id, valor: "-50" })).ok).toBe(false);
  });

  it("estorno tira o valor da conta sem apagar o registro", async () => {
    const id = await criarObra();
    const p = await acoes.registrarPagamento({ orcamentoId: id, valor: "600,00" });
    if (!p.ok) throw new Error(p.erro);

    expect((await acoes.estornarPagamento(p.dados.id)).ok).toBe(true);

    const orc = await consultas.obterOrcamento(id);
    expect(orc!.totais.pago).toBe(0);
    expect(orc!.pagamentos).toHaveLength(1); // o registro continua la
    expect(orc!.pagamentos[0]!.estornadoEm).not.toBeNull();
  });

  it("nao estorna duas vezes", async () => {
    const id = await criarObra();
    const p = await acoes.registrarPagamento({ orcamentoId: id, valor: "100,00" });
    if (!p.ok) throw new Error(p.erro);
    await acoes.estornarPagamento(p.dados.id);
    expect((await acoes.estornarPagamento(p.dados.id)).ok).toBe(false);
  });
});

describe("a regra do calheiro, de ponta a ponta", () => {
  it("sem o cliente pagar, o calheiro nao tem nada a receber", async () => {
    const calheiro = await acoes.salvarCalheiro({ nome: "Sem obra paga" });
    if (!calheiro.ok) throw new Error(calheiro.erro);

    const orc = await acoes.criarOrcamento({
      clienteId,
      calheiroId: calheiro.dados.id,
      itens: [{ descricao: "Calha", unidade: "m", quantidade: "10", precoMaterial: "45,00", precoMaoObra: "15,00" }],
    });
    if (!orc.ok) throw new Error(orc.erro);

    const extrato = await consultas.extratoCalheiro(calheiro.dados.id);
    expect(extrato.saldo.liberado).toBe(0);
    expect(extrato.saldo.aLiberar).toBe(15_000);
    expect(extrato.saldo.saldo).toBe(0);
  });

  it("cliente paga metade, metade da mao de obra fica a acertar", async () => {
    const calheiro = await acoes.salvarCalheiro({ nome: "Metade" });
    if (!calheiro.ok) throw new Error(calheiro.erro);

    const orc = await acoes.criarOrcamento({
      clienteId,
      calheiroId: calheiro.dados.id,
      itens: [{ descricao: "Calha", unidade: "m", quantidade: "20", precoMaterial: "45,00", precoMaoObra: "15,00" }],
    });
    if (!orc.ok) throw new Error(orc.erro);

    await acoes.registrarPagamento({ orcamentoId: orc.dados.id, valor: "600,00" });

    const extrato = await consultas.extratoCalheiro(calheiro.dados.id);
    expect(extrato.saldo.liberado).toBe(15_000);
    expect(extrato.saldo.saldo).toBe(15_000);
  });

  it("cliente quita, vale e acerto fecham a conta e o caixa registra a saida", async () => {
    const calheiro = await acoes.salvarCalheiro({ nome: "Conta fechada" });
    if (!calheiro.ok) throw new Error(calheiro.erro);

    const orc = await acoes.criarOrcamento({
      clienteId,
      calheiroId: calheiro.dados.id,
      itens: [{ descricao: "Calha", unidade: "m", quantidade: "20", precoMaterial: "45,00", precoMaoObra: "15,00" }],
    });
    if (!orc.ok) throw new Error(orc.erro);

    await acoes.registrarPagamento({ orcamentoId: orc.dados.id, valor: "1.200,00" });

    let extrato = await consultas.extratoCalheiro(calheiro.dados.id);
    expect(extrato.saldo.liberado).toBe(30_000);
    expect(extrato.saldo.saldo).toBe(30_000);

    // Vale de R$ 100 no meio da semana.
    const vale = await acoes.lancarMovimentoCalheiro({
      calheiroId: calheiro.dados.id,
      tipo: "vale",
      valor: "100,00",
    });
    expect(vale.ok).toBe(true);

    extrato = await consultas.extratoCalheiro(calheiro.dados.id);
    expect(extrato.saldo.vales).toBe(10_000);
    expect(extrato.saldo.saldo).toBe(20_000);

    // Acerto do restante.
    await acoes.lancarMovimentoCalheiro({
      calheiroId: calheiro.dados.id,
      tipo: "acerto",
      valor: "200,00",
      orcamentoId: orc.dados.id,
    });

    extrato = await consultas.extratoCalheiro(calheiro.dados.id);
    expect(extrato.saldo.saldo).toBe(0);

    // O dinheiro que saiu para ele tem que aparecer no financeiro.
    const saidas = await consultas.listarLancamentos({ tipo: "saida", status: "pago" });
    const dele = saidas.filter((l) => l.calheiroId === calheiro.dados.id);
    expect(dele).toHaveLength(2);
    expect(dele.reduce((s, l) => s + l.valorCentavos, 0)).toBe(30_000);
    expect(dele.every((l) => l.categoria === "Mao de obra")).toBe(true);
  });

  it("cancelar o vale devolve o dinheiro ao caixa e volta o saldo dele", async () => {
    const calheiro = await acoes.salvarCalheiro({ nome: "Vale cancelado" });
    if (!calheiro.ok) throw new Error(calheiro.erro);

    const vale = await acoes.lancarMovimentoCalheiro({
      calheiroId: calheiro.dados.id,
      tipo: "vale",
      valor: "80,00",
    });
    if (!vale.ok) throw new Error(vale.erro);

    let extrato = await consultas.extratoCalheiro(calheiro.dados.id);
    expect(extrato.saldo.saldo).toBe(-8000); // adiantado

    expect((await acoes.cancelarMovimentoCalheiro(vale.dados.id)).ok).toBe(true);

    extrato = await consultas.extratoCalheiro(calheiro.dados.id);
    expect(extrato.saldo.saldo).toBe(0);

    const pagas = await consultas.listarLancamentos({ tipo: "saida", status: "pago" });
    expect(pagas.some((l) => l.calheiroId === calheiro.dados.id)).toBe(false);
  });

  it("nao cancela o mesmo movimento duas vezes", async () => {
    const calheiro = await acoes.salvarCalheiro({ nome: "Cancela duas" });
    if (!calheiro.ok) throw new Error(calheiro.erro);
    const vale = await acoes.lancarMovimentoCalheiro({
      calheiroId: calheiro.dados.id,
      tipo: "vale",
      valor: "10,00",
    });
    if (!vale.ok) throw new Error(vale.erro);
    await acoes.cancelarMovimentoCalheiro(vale.dados.id);
    expect((await acoes.cancelarMovimentoCalheiro(vale.dados.id)).ok).toBe(false);
  });
});

describe("financeiro", () => {
  it("conta a pagar entra em aberto e some depois de paga", async () => {
    const r = await acoes.salvarLancamento({
      tipo: "saida",
      categoria: "Aluguel",
      descricao: "Aluguel do galpao",
      valor: "2.800,00",
      vencimento: somarDias(hoje(), 5),
    });
    if (!r.ok) throw new Error(r.erro);

    let contas = await consultas.contasAPagar();
    expect(contas.aVencer.some((c) => c.id === r.dados.id)).toBe(true);

    expect((await acoes.pagarConta({ id: r.dados.id, forma: "pix" })).ok).toBe(true);

    contas = await consultas.contasAPagar();
    expect(
      [...contas.aVencer, ...contas.vencidas, ...contas.vencemHoje].some(
        (c) => c.id === r.dados.id,
      ),
    ).toBe(false);
  });

  it("separa vencidas de a vencer", async () => {
    const atrasada = await acoes.salvarLancamento({
      tipo: "saida",
      categoria: "Outros",
      descricao: "Conta atrasada",
      valor: "100,00",
      vencimento: somarDias(hoje(), -7),
    });
    if (!atrasada.ok) throw new Error(atrasada.erro);

    const contas = await consultas.contasAPagar();
    expect(contas.vencidas.some((c) => c.id === atrasada.dados.id)).toBe(true);
  });

  it("nao paga a mesma conta duas vezes", async () => {
    const r = await acoes.salvarLancamento({
      tipo: "saida",
      categoria: "Outros",
      descricao: "Conta unica",
      valor: "50,00",
    });
    if (!r.ok) throw new Error(r.erro);
    await acoes.pagarConta({ id: r.dados.id });
    expect((await acoes.pagarConta({ id: r.dados.id })).ok).toBe(false);
  });

  it("caixa fica indefinido ate o dono informar o saldo inicial", async () => {
    const antes = await consultas.resumoFinanceiro();
    expect(antes.caixa).toBeNull();

    expect(
      (await acoes.definirSaldoInicial({ valor: "5.000,00", data: somarDias(hoje(), -90) })).ok,
    ).toBe(true);

    const depois = await consultas.resumoFinanceiro();
    expect(depois.caixa).not.toBeNull();
    expect(typeof depois.caixa).toBe("number");
  });

  it("o resumo soma o que entrou e o que saiu", async () => {
    const resumo = await consultas.resumoFinanceiro();
    expect(resumo.recebido).toBeGreaterThan(0);
    expect(resumo.saidasPagas).toBeGreaterThan(0);
    expect(resumo.resultado).toBe(
      resumo.recebido + resumo.entradasAvulsas - resumo.saidasPagas,
    );
    expect(resumo.aReceber).toBeGreaterThanOrEqual(0);
  });
});

describe("compras", () => {
  it("receber a compra abre a conta a pagar com o total certo", async () => {
    const fornecedor = await acoes.salvarFornecedor({
      nome: "Sul Chapas",
      categoria: "Chapa galvanizada",
    });
    if (!fornecedor.ok) throw new Error(fornecedor.erro);

    const compra = await acoes.salvarCompra({
      fornecedorId: fornecedor.dados.id,
      status: "pedido",
      frete: "120,00",
      itens: [
        { descricao: "Bobina 0,50mm", unidade: "un", quantidade: "2", valorUnitario: "1.890,00" },
      ],
    });
    if (!compra.ok) throw new Error(compra.erro);

    const detalhe = await consultas.obterCompra(compra.dados.id);
    expect(detalhe!.total).toBe(378_000 + 12_000);

    expect(
      (await acoes.receberCompra({
        compraId: compra.dados.id,
        vencimento: somarDias(hoje(), 30),
      })).ok,
    ).toBe(true);

    const contas = await consultas.listarLancamentos({ tipo: "saida", status: "aberto" });
    const daCompra = contas.find((c) => c.compraId === compra.dados.id);
    expect(daCompra).toBeDefined();
    expect(daCompra!.valorCentavos).toBe(390_000);
    expect(daCompra!.categoria).toBe("Chapa galvanizada");
  });

  it("nao recebe a mesma compra duas vezes", async () => {
    const fornecedor = await acoes.salvarFornecedor({ nome: "Fornecedor unico" });
    if (!fornecedor.ok) throw new Error(fornecedor.erro);
    const compra = await acoes.salvarCompra({
      fornecedorId: fornecedor.dados.id,
      itens: [{ descricao: "Item", quantidade: "1", valorUnitario: "10,00" }],
    });
    if (!compra.ok) throw new Error(compra.erro);
    await acoes.receberCompra({ compraId: compra.dados.id });
    expect((await acoes.receberCompra({ compraId: compra.dados.id })).ok).toBe(false);
  });

  it("lista de compras anota e marca como comprado", async () => {
    const item = await acoes.adicionarItemLista({
      descricao: "Silicone transparente",
      quantidade: "12 tubos",
    });
    if (!item.ok) throw new Error(item.erro);

    let lista = await consultas.listarListaCompras();
    expect(lista.some((i) => i.id === item.dados.id)).toBe(true);

    await acoes.marcarItemComprado(item.dados.id);
    lista = await consultas.listarListaCompras();
    expect(lista.some((i) => i.id === item.dados.id)).toBe(false);
  });
});

describe("filtros de listagem", () => {
  it("filtra por situacao da obra e por status financeiro", async () => {
    const aReceber = await consultas.listarOrcamentos({ statusFinanceiro: "aberto" });
    expect(aReceber.every((o) => o.totais.saldo === o.totais.total)).toBe(true);

    const pagos = await consultas.listarOrcamentos({ statusFinanceiro: "pago" });
    expect(pagos.every((o) => o.totais.saldo === 0)).toBe(true);
  });

  it("busca pelo nome do cliente", async () => {
    const achados = await consultas.listarOrcamentos({ busca: "Construtora Teste" });
    expect(achados.length).toBeGreaterThan(0);
    expect(achados.every((o) => o.clienteNome.includes("Construtora"))).toBe(true);
  });

  it("orcamento arquivado sai da lista", async () => {
    const id = await criarObra();
    expect((await consultas.listarOrcamentos()).some((o) => o.id === id)).toBe(true);
    await acoes.arquivarOrcamento(id);
    expect((await consultas.listarOrcamentos()).some((o) => o.id === id)).toBe(false);
    expect(
      (await consultas.listarOrcamentos({ incluirArquivados: true })).some((o) => o.id === id),
    ).toBe(true);
  });

  it("cliente mostra quanto ainda deve", async () => {
    const lista = await consultas.listarClientes();
    const construtora = lista.find((c) => c.nome === "Construtora Teste");
    expect(construtora).toBeDefined();
    expect(construtora!.qtdOrcamentos).toBeGreaterThan(0);
    expect(construtora!.saldoDevedor).toBeGreaterThan(0);
  });
});
