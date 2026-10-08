"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterBanco } from "@/db";
import {
  calheiros,
  clientes,
  compraItens,
  compras,
  configuracoes,
  fornecedores,
  historico,
  lancamentos,
  listaCompras,
  movimentosCalheiro,
  orcamentoItens,
  orcamentos,
  pagamentos,
  tiposCalha,
  usuario,
} from "@/db/schema";
import { parsearReais, parsearQuantidade, aplicarBp } from "@/dominio/dinheiro";
import { hoje, somarDias } from "@/dominio/datas";
import { calcularTotais } from "@/dominio/orcamento";
import { gerarHashSenha, conferirSenha } from "./senha";
import {
  abrirSessao,
  encerrarSessao,
  lerSessao,
  sessaoConfigurada,
  AVISO_SESSION_SECRET,
} from "./sessao";
import { certo, errado, type Resultado } from "./tipos";

/**
 * Tudo que o sistema ESCREVE fica aqui.
 *
 * Toda acao confere a sessao antes de mexer em dado, menos as de login.
 * Valores de dinheiro chegam como texto da tela e sao convertidos para
 * centavos em um lugar so, aqui, para nao existirem duas interpretacoes
 * de "1.500" no sistema.
 */

async function exigirSessao(): Promise<number> {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Sessão expirada. Entre de novo.");
  return sessao.uid;
}

async function anotar(
  tipo: string,
  registroId: number | null,
  acao: string,
  dados?: unknown,
): Promise<void> {
  const banco = obterBanco();
  await banco.insert(historico).values({
    tipo,
    registroId,
    acao,
    dados: dados === undefined ? null : (dados as object),
  });
}

function atualizarTelas() {
  revalidatePath("/", "layout");
}

const textoOpcional = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const dataTexto = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)");

// ---------------------------------------------------------------------------
// Acesso
// ---------------------------------------------------------------------------

/** Primeiro acesso: ninguem definiu senha ainda. */
export async function precisaDefinirSenha(): Promise<boolean> {
  const banco = obterBanco();
  const linhas = await banco.select({ id: usuario.id }).from(usuario).limit(1);
  return linhas.length === 0;
}

export async function definirSenhaInicial(senha: string): Promise<Resultado> {
  if (!sessaoConfigurada()) return errado(AVISO_SESSION_SECRET);

  const banco = obterBanco();
  const existentes = await banco.select({ id: usuario.id }).from(usuario).limit(1);
  if (existentes.length > 0) {
    return errado("Já existe uma senha definida.");
  }
  if (senha.length < 6) {
    return errado("A senha precisa ter pelo menos 6 caracteres.");
  }

  const [criado] = await banco
    .insert(usuario)
    .values({ nome: "Dono", senhaHash: gerarHashSenha(senha) })
    .returning();

  await abrirSessao(criado!.id);
  atualizarTelas();
  return certo();
}

export async function entrar(senha: string): Promise<Resultado> {
  if (!sessaoConfigurada()) return errado(AVISO_SESSION_SECRET);

  const banco = obterBanco();
  const linhas = await banco.select().from(usuario).limit(1);
  const dono = linhas[0];

  if (!dono) return errado("Nenhuma senha definida ainda.");
  if (!conferirSenha(senha, dono.senhaHash)) return errado("Senha incorreta.");

  await banco
    .update(usuario)
    .set({ ultimoAcesso: new Date() })
    .where(eq(usuario.id, dono.id));

  await abrirSessao(dono.id);
  atualizarTelas();
  return certo();
}

export async function trocarSenha(
  atual: string,
  nova: string,
): Promise<Resultado> {
  await exigirSessao();
  if (nova.length < 6) return errado("A nova senha precisa ter 6 caracteres ou mais.");

  const banco = obterBanco();
  const linhas = await banco.select().from(usuario).limit(1);
  const dono = linhas[0];
  if (!dono) return errado("Usuário não encontrado.");
  if (!conferirSenha(atual, dono.senhaHash)) return errado("A senha atual está errada.");

  await banco
    .update(usuario)
    .set({ senhaHash: gerarHashSenha(nova) })
    .where(eq(usuario.id, dono.id));
  return certo();
}

export async function sair(): Promise<void> {
  await encerrarSessao();
  atualizarTelas();
}

// ---------------------------------------------------------------------------
// Orcamentos
// ---------------------------------------------------------------------------

const itemEntrada = z.object({
  tipoCalhaId: z.coerce.number().int().positive().nullish(),
  descricao: z.string().trim().min(1, "Descreva o item").max(200),
  unidade: z.enum(["m", "un", "vb"]).default("m"),
  quantidade: z.string().trim().min(1, "Informe a quantidade"),
  precoMaterial: z.string().trim().default("0"),
  precoMaoObra: z.string().trim().default("0"),
});

export type ItemEntrada = z.input<typeof itemEntrada>;

const novoOrcamento = z.object({
  clienteId: z.coerce.number().int().positive().nullish(),
  clienteNomeAvulso: textoOpcional,
  dataEmissao: dataTexto.optional(),
  enderecoObra: textoOpcional,
  observacoes: textoOpcional,
  calheiroId: z.coerce.number().int().positive().nullish(),
  comNota: z.boolean().optional(),
  itens: z.array(itemEntrada).default([]),
});

export async function criarOrcamento(
  entrada: z.input<typeof novoOrcamento>,
): Promise<Resultado<{ id: number }>> {
  await exigirSessao();

  const analise = novoOrcamento.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const dados = analise.data;

  if (!dados.clienteId && !dados.clienteNomeAvulso) {
    return errado("Escolha um cliente ou escreva o nome dele.");
  }

  const banco = obterBanco();
  const config = await banco.select().from(configuracoes).limit(1);
  const validadeDias = config[0]?.validadePadraoDias ?? 15;
  const percentualNotaBp = config[0]?.percentualNotaBp ?? 0;

  const id = await banco.transaction(async (tx) => {
    const [orc] = await tx
      .insert(orcamentos)
      .values({
        clienteId: dados.clienteId ?? null,
        clienteNomeAvulso: dados.clienteNomeAvulso ?? null,
        dataEmissao: dados.dataEmissao ?? hoje(),
        validadeDias,
        enderecoObra: dados.enderecoObra ?? null,
        observacoes: dados.observacoes ?? null,
        calheiroId: dados.calheiroId ?? null,
      })
      .returning();

    if (dados.itens.length > 0) {
      await tx.insert(orcamentoItens).values(
        dados.itens.map((item, indice) => ({
          orcamentoId: orc!.id,
          ordem: indice + 1,
          tipoCalhaId: item.tipoCalhaId ?? null,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidadeMilesimos: parsearQuantidade(item.quantidade),
          precoMaterialCentavos: parsearReais(item.precoMaterial),
          precoMaoObraCentavos: parsearReais(item.precoMaoObra),
        })),
      );
    }

    // O acrescimo de nota e congelado em valor, nao em percentual: se a
    // configuracao mudar amanha, o orcamento de hoje continua o mesmo.
    if (dados.comNota && percentualNotaBp > 0 && dados.itens.length > 0) {
      const totais = calcularTotais({
        itens: dados.itens.map((item) => ({
          quantidadeMilesimos: parsearQuantidade(item.quantidade),
          precoMaterialCentavos: parsearReais(item.precoMaterial),
          precoMaoObraCentavos: parsearReais(item.precoMaoObra),
        })),
      });
      await tx
        .update(orcamentos)
        .set({ acrescimoNotaCentavos: aplicarBp(totais.subtotal, percentualNotaBp) })
        .where(eq(orcamentos.id, orc!.id));
    }

    return orc!.id;
  });

  await anotar("orcamento", id, "criado");
  atualizarTelas();
  return certo({ id });
}

const edicaoOrcamento = z.object({
  id: z.coerce.number().int().positive(),
  clienteId: z.coerce.number().int().positive().nullish(),
  clienteNomeAvulso: textoOpcional,
  dataEmissao: dataTexto.optional(),
  validadeDias: z.coerce.number().int().min(0).max(365).optional(),
  status: z.enum(["rascunho", "enviado", "aprovado", "recusado", "cancelado"]).optional(),
  situacaoObra: z.enum(["a_fazer", "agendada", "feita"]).optional(),
  dataAgendada: dataTexto.nullish(),
  calheiroId: z.coerce.number().int().positive().nullish(),
  enderecoObra: textoOpcional,
  observacoes: textoOpcional,
  desconto: z.string().optional(),
  acrescimoNota: z.string().optional(),
});

export async function atualizarOrcamento(
  entrada: z.input<typeof edicaoOrcamento>,
): Promise<Resultado> {
  await exigirSessao();

  const analise = edicaoOrcamento.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { id, desconto, acrescimoNota, ...campos } = analise.data;

  const mudancas: Record<string, unknown> = { atualizadoEm: new Date() };
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor !== undefined) mudancas[chave] = valor;
  }
  if (desconto !== undefined) mudancas.descontoCentavos = parsearReais(desconto);
  if (acrescimoNota !== undefined) {
    mudancas.acrescimoNotaCentavos = parsearReais(acrescimoNota);
  }

  // Agendar sem data nao faz sentido; marcar como feita limpa o agendamento.
  if (mudancas.situacaoObra === "agendada" && !mudancas.dataAgendada) {
    const banco = obterBanco();
    const atual = await banco
      .select({ dataAgendada: orcamentos.dataAgendada })
      .from(orcamentos)
      .where(eq(orcamentos.id, id))
      .limit(1);
    if (!atual[0]?.dataAgendada) {
      return errado("Para agendar a obra, informe a data.");
    }
  }

  const banco = obterBanco();
  await banco.update(orcamentos).set(mudancas).where(eq(orcamentos.id, id));

  await anotar("orcamento", id, "alterado", mudancas);
  atualizarTelas();
  return certo();
}

/** Troca a lista de itens inteira. E como o editor da tela funciona. */
export async function salvarItens(
  orcamentoId: number,
  itens: ItemEntrada[],
): Promise<Resultado> {
  await exigirSessao();

  const analise = z.array(itemEntrada).safeParse(itens);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Item inválido.");
  }

  const banco = obterBanco();
  await banco.transaction(async (tx) => {
    await tx.delete(orcamentoItens).where(eq(orcamentoItens.orcamentoId, orcamentoId));
    if (analise.data.length > 0) {
      await tx.insert(orcamentoItens).values(
        analise.data.map((item, indice) => ({
          orcamentoId,
          ordem: indice + 1,
          tipoCalhaId: item.tipoCalhaId ?? null,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidadeMilesimos: parsearQuantidade(item.quantidade),
          precoMaterialCentavos: parsearReais(item.precoMaterial),
          precoMaoObraCentavos: parsearReais(item.precoMaoObra),
        })),
      );
    }
    await tx
      .update(orcamentos)
      .set({ atualizadoEm: new Date() })
      .where(eq(orcamentos.id, orcamentoId));
  });

  await anotar("orcamento", orcamentoId, "itens_salvos", { quantidade: itens.length });
  atualizarTelas();
  return certo();
}

export async function arquivarOrcamento(id: number): Promise<Resultado> {
  await exigirSessao();
  const banco = obterBanco();
  await banco
    .update(orcamentos)
    .set({ arquivadoEm: new Date() })
    .where(eq(orcamentos.id, id));
  await anotar("orcamento", id, "arquivado");
  atualizarTelas();
  return certo();
}

export async function desarquivarOrcamento(id: number): Promise<Resultado> {
  await exigirSessao();
  const banco = obterBanco();
  await banco.update(orcamentos).set({ arquivadoEm: null }).where(eq(orcamentos.id, id));
  await anotar("orcamento", id, "desarquivado");
  atualizarTelas();
  return certo();
}

// ---------------------------------------------------------------------------
// Pagamentos de cliente
// ---------------------------------------------------------------------------

const novoPagamento = z.object({
  orcamentoId: z.coerce.number().int().positive(),
  valor: z.string().trim().min(1, "Informe o valor"),
  data: dataTexto.optional(),
  forma: z
    .enum(["pix", "dinheiro", "transferencia", "cartao", "boleto", "cheque", "outro"])
    .default("pix"),
  observacao: textoOpcional,
});

/**
 * Registra o pagamento do cliente.
 *
 * Este e o ponto que move o sistema inteiro: ao entrar dinheiro do cliente,
 * a mao de obra proporcional passa a estar liberada para acerto com o
 * calheiro, e o caixa sobe. Nenhuma das duas coisas precisa ser escrita:
 * as duas sao calculadas a partir deste registro.
 */
export async function registrarPagamento(
  entrada: z.input<typeof novoPagamento>,
): Promise<Resultado<{ id: number }>> {
  await exigirSessao();

  const analise = novoPagamento.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const dados = analise.data;
  const valorCentavos = parsearReais(dados.valor);

  if (valorCentavos <= 0) return errado("O valor do pagamento precisa ser maior que zero.");

  const banco = obterBanco();
  const existe = await banco
    .select({ id: orcamentos.id })
    .from(orcamentos)
    .where(eq(orcamentos.id, dados.orcamentoId))
    .limit(1);
  if (!existe[0]) return errado("Orçamento não encontrado.");

  const [criado] = await banco
    .insert(pagamentos)
    .values({
      orcamentoId: dados.orcamentoId,
      valorCentavos,
      data: dados.data ?? hoje(),
      forma: dados.forma,
      observacao: dados.observacao ?? null,
    })
    .returning();

  // Receber pagamento normalmente quer dizer que o orcamento foi aprovado.
  await banco
    .update(orcamentos)
    .set({ status: "aprovado", atualizadoEm: new Date() })
    .where(and(eq(orcamentos.id, dados.orcamentoId), eq(orcamentos.status, "rascunho")));
  await banco
    .update(orcamentos)
    .set({ status: "aprovado", atualizadoEm: new Date() })
    .where(and(eq(orcamentos.id, dados.orcamentoId), eq(orcamentos.status, "enviado")));

  await anotar("pagamento", criado!.id, "registrado", {
    orcamentoId: dados.orcamentoId,
    valorCentavos,
  });
  atualizarTelas();
  return certo({ id: criado!.id });
}

export async function estornarPagamento(id: number): Promise<Resultado> {
  await exigirSessao();
  const banco = obterBanco();

  const linhas = await banco.select().from(pagamentos).where(eq(pagamentos.id, id)).limit(1);
  const pagamento = linhas[0];
  if (!pagamento) return errado("Pagamento não encontrado.");
  if (pagamento.estornadoEm) return errado("Este pagamento já foi estornado.");

  await banco
    .update(pagamentos)
    .set({ estornadoEm: new Date() })
    .where(eq(pagamentos.id, id));

  await anotar("pagamento", id, "estornado", {
    valorCentavos: pagamento.valorCentavos,
  });
  atualizarTelas();
  return certo();
}

// ---------------------------------------------------------------------------
// Cadastros
// ---------------------------------------------------------------------------

const dadosCliente = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(2, "Escreva o nome do cliente").max(200),
  telefone: textoOpcional,
  documento: textoOpcional,
  email: textoOpcional,
  endereco: textoOpcional,
  bairro: textoOpcional,
  cidade: textoOpcional,
  cep: textoOpcional,
  observacao: textoOpcional,
});

export async function salvarCliente(
  entrada: z.input<typeof dadosCliente>,
): Promise<Resultado<{ id: number }>> {
  await exigirSessao();
  const analise = dadosCliente.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { id, ...campos } = analise.data;
  const banco = obterBanco();

  if (id) {
    await banco.update(clientes).set(campos).where(eq(clientes.id, id));
    await anotar("cliente", id, "alterado");
    atualizarTelas();
    return certo({ id });
  }

  const [criado] = await banco.insert(clientes).values(campos).returning();
  await anotar("cliente", criado!.id, "criado");
  atualizarTelas();
  return certo({ id: criado!.id });
}

export async function arquivarCliente(id: number): Promise<Resultado> {
  await exigirSessao();
  const banco = obterBanco();
  await banco
    .update(clientes)
    .set({ arquivadoEm: new Date() })
    .where(eq(clientes.id, id));
  atualizarTelas();
  return certo();
}

const dadosFornecedor = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(2, "Escreva o nome do fornecedor").max(200),
  nomeFantasia: textoOpcional,
  telefone: textoOpcional,
  documento: textoOpcional,
  categoria: z.enum([
    "Chapa galvanizada",
    "Condutor/tubo",
    "Bocais e acessórios",
    "Silicone/vedação",
    "Rebites/parafusos/buchas",
    "Estanho/solda",
    "Ferramentas",
    "Combustível",
    "Serviços",
    "Outros",
  ]).default("Outros"),
  observacao: textoOpcional,
  ativo: z.boolean().optional(),
});

export async function salvarFornecedor(
  entrada: z.input<typeof dadosFornecedor>,
): Promise<Resultado<{ id: number }>> {
  await exigirSessao();
  const analise = dadosFornecedor.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { id, ...campos } = analise.data;
  const banco = obterBanco();

  if (id) {
    await banco.update(fornecedores).set(campos).where(eq(fornecedores.id, id));
    atualizarTelas();
    return certo({ id });
  }
  const [criado] = await banco.insert(fornecedores).values(campos).returning();
  atualizarTelas();
  return certo({ id: criado!.id });
}

const dadosTipoCalha = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(2, "Escreva o nome do tipo").max(120),
  descricao: textoOpcional,
  unidade: z.enum(["m", "un", "vb"]).default("m"),
  precoMaterial: z.string().trim().default("0"),
  precoMaoObra: z.string().trim().default("0"),
  ordem: z.coerce.number().int().min(0).optional(),
  ativo: z.boolean().optional(),
});

export async function salvarTipoCalha(
  entrada: z.input<typeof dadosTipoCalha>,
): Promise<Resultado<{ id: number }>> {
  await exigirSessao();
  const analise = dadosTipoCalha.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { id, precoMaterial, precoMaoObra, ...campos } = analise.data;
  const valores = {
    ...campos,
    precoMaterialCentavos: parsearReais(precoMaterial),
    precoMaoObraCentavos: parsearReais(precoMaoObra),
  };
  const banco = obterBanco();

  if (id) {
    await banco.update(tiposCalha).set(valores).where(eq(tiposCalha.id, id));
    await anotar("tipo_calha", id, "preco_alterado", valores);
    atualizarTelas();
    return certo({ id });
  }
  const [criado] = await banco.insert(tiposCalha).values(valores).returning();
  atualizarTelas();
  return certo({ id: criado!.id });
}

const dadosCalheiro = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(2, "Escreva o nome do calheiro").max(120),
  telefone: textoOpcional,
  tipo: z.enum(["terceiro", "funcionario"]).default("terceiro"),
  observacao: textoOpcional,
  ativo: z.boolean().optional(),
});

export async function salvarCalheiro(
  entrada: z.input<typeof dadosCalheiro>,
): Promise<Resultado<{ id: number }>> {
  await exigirSessao();
  const analise = dadosCalheiro.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { id, ...campos } = analise.data;
  const banco = obterBanco();

  if (id) {
    await banco.update(calheiros).set(campos).where(eq(calheiros.id, id));
    atualizarTelas();
    return certo({ id });
  }
  const [criado] = await banco.insert(calheiros).values(campos).returning();
  atualizarTelas();
  return certo({ id: criado!.id });
}

// ---------------------------------------------------------------------------
// Vale e acerto do calheiro
// ---------------------------------------------------------------------------

const movimentoCalheiro = z.object({
  calheiroId: z.coerce.number().int().positive(),
  tipo: z.enum(["vale", "acerto", "ajuste"]),
  valor: z.string().trim().min(1, "Informe o valor"),
  data: dataTexto.optional(),
  forma: z
    .enum(["pix", "dinheiro", "transferencia", "cartao", "boleto", "cheque", "outro"])
    .default("dinheiro"),
  descricao: textoOpcional,
  orcamentoId: z.coerce.number().int().positive().nullish(),
});

/**
 * Paga vale ou acerta a mao de obra com o calheiro.
 *
 * Grava duas coisas, na mesma transacao: o movimento na conta do calheiro e
 * a saida no financeiro. Sem a segunda, o dinheiro sumia do caixa sem
 * aparecer em lugar nenhum; sem a primeira, o saldo dele nunca abaixava.
 * As duas juntas ou nenhuma.
 */
export async function lancarMovimentoCalheiro(
  entrada: z.input<typeof movimentoCalheiro>,
): Promise<Resultado<{ id: number }>> {
  await exigirSessao();

  const analise = movimentoCalheiro.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const dados = analise.data;
  const valorCentavos = parsearReais(dados.valor);

  if (dados.tipo !== "ajuste" && valorCentavos <= 0) {
    return errado("O valor precisa ser maior que zero.");
  }
  if (valorCentavos === 0) return errado("O valor não pode ser zero.");

  const banco = obterBanco();
  const achados = await banco
    .select()
    .from(calheiros)
    .where(eq(calheiros.id, dados.calheiroId))
    .limit(1);
  const calheiro = achados[0];
  if (!calheiro) return errado("Calheiro não encontrado.");

  const data = dados.data ?? hoje();
  const rotulo =
    dados.tipo === "vale" ? "Vale" : dados.tipo === "acerto" ? "Acerto" : "Ajuste";
  const descricao = dados.descricao ?? `${rotulo} - ${calheiro.nome}`;

  const id = await banco.transaction(async (tx) => {
    let lancamentoId: number | null = null;

    // Ajuste negativo so corrige a conta do calheiro, nao mexe no caixa.
    if (valorCentavos > 0) {
      const [saida] = await tx
        .insert(lancamentos)
        .values({
          tipo: "saida",
          categoria: "Mão de obra",
          descricao,
          valorCentavos,
          vencimento: data,
          dataPagamento: data,
          forma: dados.forma,
          status: "pago",
          calheiroId: dados.calheiroId,
          orcamentoId: dados.orcamentoId ?? null,
        })
        .returning();
      lancamentoId = saida!.id;
    }

    const [movimento] = await tx
      .insert(movimentosCalheiro)
      .values({
        calheiroId: dados.calheiroId,
        tipo: dados.tipo,
        valorCentavos,
        data,
        orcamentoId: dados.orcamentoId ?? null,
        descricao,
        forma: dados.forma,
        lancamentoId,
      })
      .returning();

    return movimento!.id;
  });

  await anotar("movimento_calheiro", id, dados.tipo, { valorCentavos });
  atualizarTelas();
  return certo({ id });
}

export async function cancelarMovimentoCalheiro(id: number): Promise<Resultado> {
  await exigirSessao();
  const banco = obterBanco();

  const linhas = await banco
    .select()
    .from(movimentosCalheiro)
    .where(eq(movimentosCalheiro.id, id))
    .limit(1);
  const movimento = linhas[0];
  if (!movimento) return errado("Movimento não encontrado.");
  if (movimento.canceladoEm) return errado("Este movimento já foi cancelado.");

  await banco.transaction(async (tx) => {
    await tx
      .update(movimentosCalheiro)
      .set({ canceladoEm: new Date() })
      .where(eq(movimentosCalheiro.id, id));

    // Cancelar o movimento tem que devolver o dinheiro ao caixa tambem.
    if (movimento.lancamentoId) {
      await tx
        .update(lancamentos)
        .set({ status: "cancelado" })
        .where(eq(lancamentos.id, movimento.lancamentoId));
    }
  });

  await anotar("movimento_calheiro", id, "cancelado");
  atualizarTelas();
  return certo();
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

const dadosLancamento = z.object({
  id: z.coerce.number().int().positive().optional(),
  tipo: z.enum(["entrada", "saida"]),
  categoria: z.string().trim().min(1).max(100).default("Outros"),
  descricao: z.string().trim().min(2, "Escreva a descrição").max(300),
  valor: z.string().trim().min(1, "Informe o valor"),
  vencimento: dataTexto.optional(),
  dataPagamento: dataTexto.nullish(),
  forma: z
    .enum(["pix", "dinheiro", "transferencia", "cartao", "boleto", "cheque", "outro"])
    .nullish(),
  fornecedorId: z.coerce.number().int().positive().nullish(),
  observacao: textoOpcional,
  jaPago: z.boolean().optional(),
});

export async function salvarLancamento(
  entrada: z.input<typeof dadosLancamento>,
): Promise<Resultado<{ id: number }>> {
  await exigirSessao();

  const analise = dadosLancamento.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { id, valor, jaPago, ...campos } = analise.data;
  const valorCentavos = parsearReais(valor);
  if (valorCentavos <= 0) return errado("O valor precisa ser maior que zero.");

  const vencimento = campos.vencimento ?? hoje();
  const pago = jaPago === true;

  const valores = {
    ...campos,
    valorCentavos,
    vencimento,
    dataPagamento: pago ? (campos.dataPagamento ?? vencimento) : (campos.dataPagamento ?? null),
    status: (pago || campos.dataPagamento ? "pago" : "aberto") as "pago" | "aberto",
  };

  const banco = obterBanco();
  if (id) {
    await banco.update(lancamentos).set(valores).where(eq(lancamentos.id, id));
    await anotar("lancamento", id, "alterado");
    atualizarTelas();
    return certo({ id });
  }

  const [criado] = await banco.insert(lancamentos).values(valores).returning();
  await anotar("lancamento", criado!.id, "criado", { valorCentavos });
  atualizarTelas();
  return certo({ id: criado!.id });
}

export async function pagarConta(entrada: {
  id: number;
  data?: string;
  forma?: "pix" | "dinheiro" | "transferencia" | "cartao" | "boleto" | "cheque" | "outro";
}): Promise<Resultado> {
  await exigirSessao();

  const banco = obterBanco();
  const linhas = await banco
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.id, entrada.id))
    .limit(1);
  const conta = linhas[0];
  if (!conta) return errado("Conta não encontrada.");
  if (conta.status === "pago") return errado("Esta conta já está paga.");
  if (conta.status === "cancelado") return errado("Esta conta foi cancelada.");

  await banco
    .update(lancamentos)
    .set({
      status: "pago",
      dataPagamento: entrada.data ?? hoje(),
      forma: entrada.forma ?? conta.forma ?? "pix",
    })
    .where(eq(lancamentos.id, entrada.id));

  await anotar("lancamento", entrada.id, "pago", { valorCentavos: conta.valorCentavos });
  atualizarTelas();
  return certo();
}

export async function reabrirLancamento(id: number): Promise<Resultado> {
  await exigirSessao();
  const banco = obterBanco();
  await banco
    .update(lancamentos)
    .set({ status: "aberto", dataPagamento: null })
    .where(eq(lancamentos.id, id));
  await anotar("lancamento", id, "reaberto");
  atualizarTelas();
  return certo();
}

export async function cancelarLancamento(id: number): Promise<Resultado> {
  await exigirSessao();
  const banco = obterBanco();
  await banco
    .update(lancamentos)
    .set({ status: "cancelado" })
    .where(eq(lancamentos.id, id));
  await anotar("lancamento", id, "cancelado");
  atualizarTelas();
  return certo();
}

export async function definirSaldoInicial(entrada: {
  valor: string;
  data: string;
}): Promise<Resultado> {
  await exigirSessao();

  const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(entrada.data);
  if (!data.success) return errado("Informe a data no formato AAAA-MM-DD.");

  const banco = obterBanco();
  await banco
    .insert(configuracoes)
    .values({
      id: 1,
      saldoInicialCentavos: parsearReais(entrada.valor),
      saldoInicialData: entrada.data,
    })
    .onConflictDoUpdate({
      target: configuracoes.id,
      set: {
        saldoInicialCentavos: parsearReais(entrada.valor),
        saldoInicialData: entrada.data,
        atualizadoEm: new Date(),
      },
    });

  atualizarTelas();
  return certo();
}

const dadosConfiguracoes = z.object({
  nomeEmpresa: z.string().trim().min(1).max(200).optional(),
  telefone: textoOpcional,
  documento: textoOpcional,
  endereco: textoOpcional,
  pixChave: textoOpcional,
  pixFavorecido: textoOpcional,
  percentualNota: z.string().optional(),
  validadePadraoDias: z.coerce.number().int().min(0).max(365).optional(),
});

export async function salvarConfiguracoes(
  entrada: z.input<typeof dadosConfiguracoes>,
): Promise<Resultado> {
  await exigirSessao();

  const analise = dadosConfiguracoes.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { percentualNota, ...campos } = analise.data;

  const valores: Record<string, unknown> = { ...campos, atualizadoEm: new Date() };
  if (percentualNota !== undefined) {
    // "12" ou "12,5" viram pontos-base: 1200 e 1250.
    valores.percentualNotaBp = Math.round(parsearReais(percentualNota));
  }

  const banco = obterBanco();
  await banco
    .insert(configuracoes)
    .values({ id: 1, ...valores })
    .onConflictDoUpdate({ target: configuracoes.id, set: valores });

  atualizarTelas();
  return certo();
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------

const itemCompra = z.object({
  descricao: z.string().trim().min(1, "Descreva o item").max(200),
  unidade: z.enum(["m", "un", "vb"]).default("un"),
  quantidade: z.string().trim().default("1"),
  valorUnitario: z.string().trim().default("0"),
});

const dadosCompra = z.object({
  id: z.coerce.number().int().positive().optional(),
  fornecedorId: z.coerce.number().int().positive(),
  data: dataTexto.optional(),
  status: z.enum(["rascunho", "pedido", "recebido", "cancelado"]).default("pedido"),
  previsaoEntrega: dataTexto.nullish(),
  frete: z.string().optional(),
  observacao: textoOpcional,
  itens: z.array(itemCompra).default([]),
});

export async function salvarCompra(
  entrada: z.input<typeof dadosCompra>,
): Promise<Resultado<{ id: number }>> {
  await exigirSessao();

  const analise = dadosCompra.safeParse(entrada);
  if (!analise.success) {
    return errado(analise.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const dados = analise.data;
  const banco = obterBanco();

  const id = await banco.transaction(async (tx) => {
    let compraId = dados.id;

    const valores = {
      fornecedorId: dados.fornecedorId,
      data: dados.data ?? hoje(),
      status: dados.status,
      previsaoEntrega: dados.previsaoEntrega ?? null,
      freteCentavos: parsearReais(dados.frete ?? "0"),
      observacao: dados.observacao ?? null,
    };

    if (compraId) {
      await tx.update(compras).set(valores).where(eq(compras.id, compraId));
      await tx.delete(compraItens).where(eq(compraItens.compraId, compraId));
    } else {
      const [criada] = await tx.insert(compras).values(valores).returning();
      compraId = criada!.id;
    }

    if (dados.itens.length > 0) {
      await tx.insert(compraItens).values(
        dados.itens.map((item) => ({
          compraId: compraId!,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidadeMilesimos: parsearQuantidade(item.quantidade),
          valorUnitarioCentavos: parsearReais(item.valorUnitario),
        })),
      );
    }

    return compraId!;
  });

  await anotar("compra", id, dados.id ? "alterada" : "criada");
  atualizarTelas();
  return certo({ id });
}

/**
 * Marca a compra como recebida e abre a conta a pagar correspondente.
 * E o momento em que a compra deixa de ser intencao e passa a ser divida.
 */
export async function receberCompra(entrada: {
  compraId: number;
  vencimento?: string;
  gerarContaAPagar?: boolean;
}): Promise<Resultado> {
  await exigirSessao();

  const banco = obterBanco();
  const linhas = await banco
    .select()
    .from(compras)
    .where(eq(compras.id, entrada.compraId))
    .limit(1);
  const compra = linhas[0];
  if (!compra) return errado("Compra não encontrada.");
  if (compra.status === "recebido") return errado("Esta compra já foi recebida.");

  const itens = await banco
    .select()
    .from(compraItens)
    .where(eq(compraItens.compraId, entrada.compraId));

  const total =
    itens.reduce(
      (s, i) => s + Math.round((i.valorUnitarioCentavos * i.quantidadeMilesimos) / 1000),
      0,
    ) + compra.freteCentavos;

  const fornecedor = await banco
    .select({ nome: fornecedores.nome, categoria: fornecedores.categoria })
    .from(fornecedores)
    .where(eq(fornecedores.id, compra.fornecedorId))
    .limit(1);

  await banco.transaction(async (tx) => {
    await tx
      .update(compras)
      .set({ status: "recebido" })
      .where(eq(compras.id, entrada.compraId));

    const jaTemConta = await tx
      .select({ id: lancamentos.id })
      .from(lancamentos)
      .where(eq(lancamentos.compraId, entrada.compraId))
      .limit(1);

    if (entrada.gerarContaAPagar !== false && total > 0 && !jaTemConta[0]) {
      await tx.insert(lancamentos).values({
        tipo: "saida",
        categoria: fornecedor[0]?.categoria ?? "Outros",
        descricao: `Compra nº ${entrada.compraId} · ${fornecedor[0]?.nome ?? "fornecedor"}`,
        valorCentavos: total,
        vencimento: entrada.vencimento ?? somarDias(hoje(), 30),
        status: "aberto",
        fornecedorId: compra.fornecedorId,
        compraId: entrada.compraId,
      });
    }
  });

  await anotar("compra", entrada.compraId, "recebida", { total });
  atualizarTelas();
  return certo();
}

// ---------------------------------------------------------------------------
// Lista de compras
// ---------------------------------------------------------------------------

export async function adicionarItemLista(entrada: {
  descricao: string;
  quantidade?: string;
  fornecedorId?: number | null;
  observacao?: string;
}): Promise<Resultado<{ id: number }>> {
  await exigirSessao();

  const descricao = entrada.descricao?.trim();
  if (!descricao) return errado("Escreva o que está faltando.");

  const banco = obterBanco();
  const [criado] = await banco
    .insert(listaCompras)
    .values({
      descricao,
      quantidade: entrada.quantidade?.trim() || null,
      fornecedorId: entrada.fornecedorId ?? null,
      observacao: entrada.observacao?.trim() || null,
    })
    .returning();

  atualizarTelas();
  return certo({ id: criado!.id });
}

export async function marcarItemComprado(id: number): Promise<Resultado> {
  await exigirSessao();
  const banco = obterBanco();
  await banco
    .update(listaCompras)
    .set({ compradoEm: new Date() })
    .where(eq(listaCompras.id, id));
  atualizarTelas();
  return certo();
}

export async function removerItemLista(id: number): Promise<Resultado> {
  await exigirSessao();
  const banco = obterBanco();
  await banco.delete(listaCompras).where(eq(listaCompras.id, id));
  atualizarTelas();
  return certo();
}
