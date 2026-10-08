/**
 * Dados de EXEMPLO, para o sistema nao abrir vazio e dar para navegar.
 *
 * Os nomes, enderecos e precos sao inventados. Os precos NAO sao pesquisa de
 * mercado: ajuste tudo na tela "Tabela de precos" antes de usar de verdade.
 *
 *   npm run db:seed              insere o exemplo
 *   npm run db:seed -- --limpar  apaga tudo e insere de novo
 */
import { sql } from "drizzle-orm";
import { obterBanco, fecharBanco } from "../src/db/index";
import { aplicarMigracoes } from "../src/db/migrar";
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
} from "../src/db/schema";
import { hoje, somarDias } from "../src/dominio/datas";

const limpar = process.argv.includes("--limpar");

async function principal() {
  const banco = obterBanco();
  await aplicarMigracoes(banco);

  if (limpar) {
    // Ordem importa por causa das chaves estrangeiras.
    await banco.execute(sql`
      TRUNCATE TABLE
        movimentos_calheiro, lancamentos, pagamentos, orcamento_itens,
        orcamentos, compra_itens, compras, lista_compras, historico,
        tipos_calha, clientes, fornecedores, calheiros, configuracoes
      RESTART IDENTITY CASCADE
    `);
    console.log("Dados apagados.");
  }

  const jaTem = await banco.select().from(tiposCalha).limit(1);
  if (jaTem.length > 0) {
    console.log(
      "O banco ja tem dados. Para refazer o exemplo: npm run db:seed -- --limpar",
    );
    await fecharBanco();
    return;
  }

  const d = hoje();

  await banco.insert(configuracoes).values({
    id: 1,
    nomeEmpresa: "Calhas Andrade",
    telefone: "(00) 00000-0000",
    pixChave: "coloque-sua-chave-pix",
    pixFavorecido: "Calhas Andrade",
    percentualNotaBp: 1200, // 12% quando o cliente pede nota
    validadePadraoDias: 15,
    saldoInicialCentavos: 500_000,
    saldoInicialData: somarDias(d, -60),
  });

  // Tabela de precos: material e mao de obra separados, por metro ou por peca.
  const tipos = await banco
    .insert(tiposCalha)
    .values([
      { nome: "Calha americana", unidade: "m", precoMaterialCentavos: 4500, precoMaoObraCentavos: 1500, ordem: 1 },
      { nome: "Calha moldura", unidade: "m", precoMaterialCentavos: 5200, precoMaoObraCentavos: 1800, ordem: 2 },
      { nome: "Calha platibanda", unidade: "m", precoMaterialCentavos: 5800, precoMaoObraCentavos: 2000, ordem: 3 },
      { nome: "Calha quadrada", unidade: "m", precoMaterialCentavos: 4800, precoMaoObraCentavos: 1600, ordem: 4 },
      { nome: "Rufo capa", unidade: "m", precoMaterialCentavos: 3800, precoMaoObraCentavos: 1200, ordem: 5 },
      { nome: "Rufo pingadeira", unidade: "m", precoMaterialCentavos: 3500, precoMaoObraCentavos: 1200, ordem: 6 },
      { nome: "Pingadeira de janela", unidade: "m", precoMaterialCentavos: 3200, precoMaoObraCentavos: 1000, ordem: 7 },
      { nome: "Condutor retangular 70x100", unidade: "m", precoMaterialCentavos: 3600, precoMaoObraCentavos: 1000, ordem: 8 },
      { nome: "Condutor redondo 100mm", unidade: "m", precoMaterialCentavos: 3400, precoMaoObraCentavos: 1000, ordem: 9 },
      { nome: "Bocal", unidade: "un", precoMaterialCentavos: 3500, precoMaoObraCentavos: 1000, ordem: 10 },
      { nome: "Cabeceira", unidade: "un", precoMaterialCentavos: 2800, precoMaoObraCentavos: 800, ordem: 11 },
      { nome: "Bracadeira", unidade: "un", precoMaterialCentavos: 1200, precoMaoObraCentavos: 500, ordem: 12 },
      { nome: "Chapeu chines", unidade: "un", precoMaterialCentavos: 4500, precoMaoObraCentavos: 1200, ordem: 13 },
      { nome: "Tela protetora de calha", unidade: "m", precoMaterialCentavos: 2500, precoMaoObraCentavos: 900, ordem: 14 },
      { nome: "Coifa de churrasqueira", unidade: "un", precoMaterialCentavos: 38_000, precoMaoObraCentavos: 8000, ordem: 15 },
    ])
    .returning();

  const calheirosInseridos = await banco
    .insert(calheiros)
    .values([
      { nome: "Jonas", telefone: "(00) 90000-0001", tipo: "terceiro" },
      { nome: "Marcelo", telefone: "(00) 90000-0002", tipo: "terceiro" },
    ])
    .returning();

  const fornecedoresInseridos = await banco
    .insert(fornecedores)
    .values([
      { nome: "Metalurgica Sul Chapas", nomeFantasia: "Sul Chapas", categoria: "Chapa galvanizada", telefone: "(00) 3000-0001" },
      { nome: "Distribuidora de Tubos Central", nomeFantasia: "Tubos Central", categoria: "Condutor/tubo", telefone: "(00) 3000-0002" },
      { nome: "Casa do Rebite", categoria: "Rebites/parafusos/buchas", telefone: "(00) 3000-0003" },
      { nome: "Vedacoes e Silicones ABC", categoria: "Silicone/vedacao", telefone: "(00) 3000-0004" },
      { nome: "Posto Boa Viagem", categoria: "Combustivel" },
    ])
    .returning();

  const clientesInseridos = await banco
    .insert(clientes)
    .values([
      { nome: "Construtora Horizonte", telefone: "(00) 91111-1111", cidade: "Sao Paulo", bairro: "Vila Industrial", endereco: "Rua das Oficinas, 120" },
      { nome: "Maria Aparecida Lopes", telefone: "(00) 92222-2222", cidade: "Sao Paulo", bairro: "Jardim Sao Luiz", endereco: "Rua Pintassilgo, 45" },
      { nome: "Condominio Res. Pedra Branca", telefone: "(00) 93333-3333", cidade: "Guarulhos", endereco: "Av. Central, 900" },
    ])
    .returning();

  const tipo = (nome: string) => tipos.find((t) => t.nome === nome)!;

  // --- Orcamento 1: aprovado, obra feita, cliente quitou -----------------
  const [orc1] = await banco
    .insert(orcamentos)
    .values({
      clienteId: clientesInseridos[0]!.id,
      dataEmissao: somarDias(d, -20),
      status: "aprovado",
      situacaoObra: "feita",
      calheiroId: calheirosInseridos[0]!.id,
      enderecoObra: "Rua das Oficinas, 120 - galpao 2",
      observacoes: "Troca completa da calha do galpao.",
    })
    .returning();

  await banco.insert(orcamentoItens).values([
    { orcamentoId: orc1!.id, ordem: 1, tipoCalhaId: tipo("Calha americana").id, descricao: "Calha americana", unidade: "m", quantidadeMilesimos: 32_000, precoMaterialCentavos: 4500, precoMaoObraCentavos: 1500 },
    { orcamentoId: orc1!.id, ordem: 2, tipoCalhaId: tipo("Condutor retangular 70x100").id, descricao: "Condutor retangular 70x100", unidade: "m", quantidadeMilesimos: 18_000, precoMaterialCentavos: 3600, precoMaoObraCentavos: 1000 },
    { orcamentoId: orc1!.id, ordem: 3, tipoCalhaId: tipo("Bocal").id, descricao: "Bocal", unidade: "un", quantidadeMilesimos: 4000, precoMaterialCentavos: 3500, precoMaoObraCentavos: 1000 },
  ]);

  // Total: 144000+30000 material... o sistema calcula; aqui so os pagamentos.
  await banco.insert(pagamentos).values([
    { orcamentoId: orc1!.id, valorCentavos: 100_000, data: somarDias(d, -18), forma: "pix", observacao: "Entrada" },
    { orcamentoId: orc1!.id, valorCentavos: 143_800, data: somarDias(d, -5), forma: "pix", observacao: "Quitacao" },
  ]);

  // O cliente pagou tudo, entao a mao de obra foi liberada e parte ja foi
  // acertada com o Jonas.
  await banco.insert(movimentosCalheiro).values([
    { calheiroId: calheirosInseridos[0]!.id, tipo: "vale", valorCentavos: 30_000, data: somarDias(d, -15), descricao: "Vale da semana", forma: "dinheiro" },
    { calheiroId: calheirosInseridos[0]!.id, tipo: "acerto", valorCentavos: 40_000, data: somarDias(d, -4), orcamentoId: orc1!.id, descricao: "Acerto da obra do galpao", forma: "pix" },
  ]);

  // --- Orcamento 2: aprovado, obra agendada, entrada paga ----------------
  const [orc2] = await banco
    .insert(orcamentos)
    .values({
      clienteId: clientesInseridos[1]!.id,
      dataEmissao: somarDias(d, -6),
      status: "aprovado",
      situacaoObra: "agendada",
      dataAgendada: somarDias(d, 2),
      calheiroId: calheirosInseridos[1]!.id,
      enderecoObra: "Rua Pintassilgo, 45",
      observacoes: "Casa de dois pavimentos, fundos.",
    })
    .returning();

  await banco.insert(orcamentoItens).values([
    { orcamentoId: orc2!.id, ordem: 1, tipoCalhaId: tipo("Calha moldura").id, descricao: "Calha moldura", unidade: "m", quantidadeMilesimos: 12_500, precoMaterialCentavos: 5200, precoMaoObraCentavos: 1800 },
    { orcamentoId: orc2!.id, ordem: 2, tipoCalhaId: tipo("Rufo capa").id, descricao: "Rufo capa", unidade: "m", quantidadeMilesimos: 8000, precoMaterialCentavos: 3800, precoMaoObraCentavos: 1200 },
  ]);

  await banco.insert(pagamentos).values({
    orcamentoId: orc2!.id,
    valorCentavos: 50_000,
    data: somarDias(d, -5),
    forma: "pix",
    observacao: "Entrada de 50%",
  });

  // --- Orcamento 3: enviado, aguardando resposta -------------------------
  const [orc3] = await banco
    .insert(orcamentos)
    .values({
      clienteId: clientesInseridos[2]!.id,
      dataEmissao: somarDias(d, -1),
      status: "enviado",
      situacaoObra: "a_fazer",
      enderecoObra: "Av. Central, 900 - bloco B",
      observacoes: "Cliente pediu nota fiscal.",
      acrescimoNotaCentavos: 0,
    })
    .returning();

  await banco.insert(orcamentoItens).values([
    { orcamentoId: orc3!.id, ordem: 1, tipoCalhaId: tipo("Calha platibanda").id, descricao: "Calha platibanda", unidade: "m", quantidadeMilesimos: 46_000, precoMaterialCentavos: 5800, precoMaoObraCentavos: 2000 },
    { orcamentoId: orc3!.id, ordem: 2, tipoCalhaId: tipo("Tela protetora de calha").id, descricao: "Tela protetora de calha", unidade: "m", quantidadeMilesimos: 46_000, precoMaterialCentavos: 2500, precoMaoObraCentavos: 900 },
    { orcamentoId: orc3!.id, ordem: 3, tipoCalhaId: tipo("Chapeu chines").id, descricao: "Chapeu chines", unidade: "un", quantidadeMilesimos: 6000, precoMaterialCentavos: 4500, precoMaoObraCentavos: 1200 },
  ]);

  // --- Compra de materia-prima e conta a pagar ---------------------------
  const [compra1] = await banco
    .insert(compras)
    .values({
      fornecedorId: fornecedoresInseridos[0]!.id,
      data: somarDias(d, -10),
      status: "recebido",
      freteCentavos: 12_000,
      observacao: "Bobina galvanizada 0,50mm",
    })
    .returning();

  await banco.insert(compraItens).values([
    { compraId: compra1!.id, descricao: "Bobina galvanizada 0,50mm x 1000mm", unidade: "un", quantidadeMilesimos: 2000, valorUnitarioCentavos: 189_000 },
    { compraId: compra1!.id, descricao: "Bobina galvanizada 0,43mm x 600mm", unidade: "un", quantidadeMilesimos: 1000, valorUnitarioCentavos: 97_000 },
  ]);

  await banco.insert(lancamentos).values([
    { tipo: "saida", categoria: "Chapa galvanizada", descricao: "Bobinas - Sul Chapas", valorCentavos: 487_000, vencimento: somarDias(d, 5), status: "aberto", fornecedorId: fornecedoresInseridos[0]!.id, compraId: compra1!.id },
    { tipo: "saida", categoria: "Combustivel", descricao: "Diesel da caminhonete", valorCentavos: 32_000, vencimento: somarDias(d, -3), dataPagamento: somarDias(d, -3), forma: "dinheiro", status: "pago", fornecedorId: fornecedoresInseridos[4]!.id },
    { tipo: "saida", categoria: "Rebites/parafusos/buchas", descricao: "Rebites e buchas", valorCentavos: 18_500, vencimento: somarDias(d, -2), status: "aberto", fornecedorId: fornecedoresInseridos[2]!.id },
    { tipo: "saida", categoria: "Aluguel", descricao: "Aluguel do galpao", valorCentavos: 280_000, vencimento: somarDias(d, 8), status: "aberto" },
  ]);

  await banco.insert(listaCompras).values([
    { descricao: "Silicone transparente", quantidade: "12 tubos", fornecedorId: fornecedoresInseridos[3]!.id },
    { descricao: "Estanho em barra", quantidade: "5 kg" },
    { descricao: "Disco de corte 4.1/2", quantidade: "10 un" },
  ]);

  console.log("Exemplo inserido:");
  console.log("  - 15 tipos de calha na tabela de precos");
  console.log("  - 3 clientes, 5 fornecedores, 2 calheiros");
  console.log("  - 3 orcamentos (um quitado, um com entrada, um enviado)");
  console.log("  - 1 compra recebida e 4 contas a pagar");
  console.log("");
  console.log("ATENCAO: nomes e precos sao inventados, so para voce navegar.");
  console.log("Ajuste os precos em Tabela de precos antes de usar de verdade.");
  console.log("Para zerar tudo: npm run db:seed -- --limpar");

  await fecharBanco();
}

principal().catch((erro) => {
  console.error("Falhou ao semear:", erro);
  process.exit(1);
});
