import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  date,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Convencoes deste banco, validas em todas as tabelas:
 *
 * - Dinheiro sempre em CENTAVOS, como inteiro. Nunca float. R$ 1.234,56 = 123456.
 * - Quantidade sempre em MILESIMOS, como inteiro. 12,5 metros = 12500.
 *   Isso permite meio metro, um quarto de metro, e mantem a conta exata.
 * - Data de negocio (emissao, vencimento, pagamento) e TEXTO "AAAA-MM-DD".
 *   Guardar como texto evita o classico erro de fuso que faz um pagamento
 *   do dia 1 aparecer no dia 30 do mes anterior.
 * - Data de sistema (criado_em) e timestamp com fuso.
 * - Nada e apagado de verdade: usa-se arquivado_em / cancelado_em.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const unidadeEnum = pgEnum("unidade", ["m", "un", "vb"]);

export const statusOrcamentoEnum = pgEnum("status_orcamento", [
  "rascunho",
  "enviado",
  "aprovado",
  "recusado",
  "cancelado",
]);

export const situacaoObraEnum = pgEnum("situacao_obra", [
  "a_fazer",
  "agendada",
  "feita",
]);

export const formaPagamentoEnum = pgEnum("forma_pagamento", [
  "pix",
  "dinheiro",
  "transferencia",
  "cartao",
  "boleto",
  "cheque",
  "outro",
]);

export const tipoCalheiroEnum = pgEnum("tipo_calheiro", [
  "terceiro",
  "funcionario",
]);

export const tipoMovimentoCalheiroEnum = pgEnum("tipo_movimento_calheiro", [
  "vale",
  "acerto",
  "ajuste",
]);

export const categoriaFornecedorEnum = pgEnum("categoria_fornecedor", [
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
]);

export const statusCompraEnum = pgEnum("status_compra", [
  "rascunho",
  "pedido",
  "recebido",
  "cancelado",
]);

export const tipoLancamentoEnum = pgEnum("tipo_lancamento", [
  "entrada",
  "saida",
]);

export const statusLancamentoEnum = pgEnum("status_lancamento", [
  "aberto",
  "pago",
  "cancelado",
]);

// ---------------------------------------------------------------------------
// Usuario (dono unico) e configuracoes
// ---------------------------------------------------------------------------

export const usuario = pgTable("usuario", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().default("Dono"),
  senhaHash: text("senha_hash").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  ultimoAcesso: timestamp("ultimo_acesso", { withTimezone: true }),
});

export const configuracoes = pgTable("configuracoes", {
  id: integer("id").primaryKey().default(1),
  nomeEmpresa: text("nome_empresa").notNull().default("Calhas Andrade"),
  telefone: text("telefone"),
  documento: text("documento"),
  endereco: text("endereco"),
  /** Chave Pix que aparece no orcamento enviado ao cliente. */
  pixChave: text("pix_chave"),
  pixFavorecido: text("pix_favorecido"),
  /**
   * Acrescimo quando o cliente pede nota fiscal, em pontos-base
   * (1200 = 12%). O sistema nao emite nota; so ajusta o preco.
   */
  percentualNotaBp: integer("percentual_nota_bp").notNull().default(0),
  validadePadraoDias: integer("validade_padrao_dias").notNull().default(15),
  /** Saldo do caixa no dia em que o sistema comecou a ser usado. */
  saldoInicialCentavos: integer("saldo_inicial_centavos"),
  saldoInicialData: date("saldo_inicial_data", { mode: "string" }),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Cadastros
// ---------------------------------------------------------------------------

export const clientes = pgTable(
  "clientes",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    telefone: text("telefone"),
    documento: text("documento"),
    email: text("email"),
    endereco: text("endereco"),
    bairro: text("bairro"),
    cidade: text("cidade"),
    cep: text("cep"),
    observacao: text("observacao"),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    arquivadoEm: timestamp("arquivado_em", { withTimezone: true }),
  },
  (t) => [index("clientes_nome_idx").on(t.nome)],
);

/**
 * Tabela de preços: cada tipo de calha tem preco de MATERIAL e preco de
 * MAO DE OBRA, separados, por unidade (normalmente o metro linear).
 * Essa separacao e o que permite acertar a mao de obra com o calheiro
 * quando o cliente paga.
 */
export const tiposCalha = pgTable(
  "tipos_calha",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    unidade: unidadeEnum("unidade").notNull().default("m"),
    precoMaterialCentavos: integer("preco_material_centavos")
      .notNull()
      .default(0),
    precoMaoObraCentavos: integer("preco_mao_obra_centavos")
      .notNull()
      .default(0),
    ordem: integer("ordem").notNull().default(0),
    ativo: boolean("ativo").notNull().default(true),
  },
  (t) => [uniqueIndex("tipos_calha_nome_idx").on(t.nome)],
);

export const calheiros = pgTable("calheiros", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  tipo: tipoCalheiroEnum("tipo").notNull().default("terceiro"),
  observacao: text("observacao"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const fornecedores = pgTable(
  "fornecedores",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    nomeFantasia: text("nome_fantasia"),
    telefone: text("telefone"),
    documento: text("documento"),
    categoria: categoriaFornecedorEnum("categoria").notNull().default("Outros"),
    observacao: text("observacao"),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("fornecedores_nome_idx").on(t.nome)],
);

// ---------------------------------------------------------------------------
// Orcamentos
// ---------------------------------------------------------------------------

export const orcamentos = pgTable(
  "orcamentos",
  {
    id: serial("id").primaryKey(),
    /**
     * Cliente pode ficar vazio no comeco: no celular da para abrir o
     * orcamento so com o nome anotado e vincular o cadastro depois.
     */
    clienteId: integer("cliente_id").references(() => clientes.id),
    clienteNomeAvulso: text("cliente_nome_avulso"),
    dataEmissao: date("data_emissao", { mode: "string" }).notNull(),
    validadeDias: integer("validade_dias").notNull().default(15),
    status: statusOrcamentoEnum("status").notNull().default("rascunho"),
    situacaoObra: situacaoObraEnum("situacao_obra").notNull().default("a_fazer"),
    dataAgendada: date("data_agendada", { mode: "string" }),
    calheiroId: integer("calheiro_id").references(() => calheiros.id),
    enderecoObra: text("endereco_obra"),
    observacoes: text("observacoes"),
    /** Desconto sai da margem do dono, nunca da mao de obra do calheiro. */
    descontoCentavos: integer("desconto_centavos").notNull().default(0),
    /** Acrescimo de nota fiscal congelado no momento do orcamento. */
    acrescimoNotaCentavos: integer("acrescimo_nota_centavos")
      .notNull()
      .default(0),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    arquivadoEm: timestamp("arquivado_em", { withTimezone: true }),
  },
  (t) => [
    index("orcamentos_cliente_idx").on(t.clienteId),
    index("orcamentos_emissao_idx").on(t.dataEmissao),
    index("orcamentos_situacao_idx").on(t.situacaoObra),
  ],
);

export const orcamentoItens = pgTable(
  "orcamento_itens",
  {
    id: serial("id").primaryKey(),
    orcamentoId: integer("orcamento_id")
      .notNull()
      .references(() => orcamentos.id, { onDelete: "cascade" }),
    ordem: integer("ordem").notNull().default(0),
    /** Opcional: item pode ser livre, sem tipo cadastrado. */
    tipoCalhaId: integer("tipo_calha_id").references(() => tiposCalha.id),
    /** Copia do nome na hora do orcamento, para o historico nao mudar. */
    descricao: text("descricao").notNull(),
    unidade: unidadeEnum("unidade").notNull().default("m"),
    /** 12,5 m = 12500 */
    quantidadeMilesimos: integer("quantidade_milesimos").notNull(),
    /** Precos congelados: mudar a tabela de precos nao altera o passado. */
    precoMaterialCentavos: integer("preco_material_centavos")
      .notNull()
      .default(0),
    precoMaoObraCentavos: integer("preco_mao_obra_centavos")
      .notNull()
      .default(0),
  },
  (t) => [index("orcamento_itens_orcamento_idx").on(t.orcamentoId)],
);

export const pagamentos = pgTable(
  "pagamentos",
  {
    id: serial("id").primaryKey(),
    orcamentoId: integer("orcamento_id")
      .notNull()
      .references(() => orcamentos.id, { onDelete: "cascade" }),
    valorCentavos: integer("valor_centavos").notNull(),
    data: date("data", { mode: "string" }).notNull(),
    forma: formaPagamentoEnum("forma").notNull().default("pix"),
    observacao: text("observacao"),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Estorno nao apaga: marca a data para o historico ficar honesto. */
    estornadoEm: timestamp("estornado_em", { withTimezone: true }),
  },
  (t) => [
    index("pagamentos_orcamento_idx").on(t.orcamentoId),
    index("pagamentos_data_idx").on(t.data),
  ],
);

// ---------------------------------------------------------------------------
// Compras e financeiro
// ---------------------------------------------------------------------------

export const compras = pgTable(
  "compras",
  {
    id: serial("id").primaryKey(),
    fornecedorId: integer("fornecedor_id")
      .notNull()
      .references(() => fornecedores.id),
    data: date("data", { mode: "string" }).notNull(),
    status: statusCompraEnum("status").notNull().default("rascunho"),
    previsaoEntrega: date("previsao_entrega", { mode: "string" }),
    freteCentavos: integer("frete_centavos").notNull().default(0),
    observacao: text("observacao"),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("compras_fornecedor_idx").on(t.fornecedorId)],
);

export const compraItens = pgTable(
  "compra_itens",
  {
    id: serial("id").primaryKey(),
    compraId: integer("compra_id")
      .notNull()
      .references(() => compras.id, { onDelete: "cascade" }),
    descricao: text("descricao").notNull(),
    unidade: unidadeEnum("unidade").notNull().default("un"),
    quantidadeMilesimos: integer("quantidade_milesimos").notNull(),
    valorUnitarioCentavos: integer("valor_unitario_centavos")
      .notNull()
      .default(0),
  },
  (t) => [index("compra_itens_compra_idx").on(t.compraId)],
);

/**
 * Livro de saidas e de entradas avulsas.
 *
 * Pagamento de cliente NAO entra aqui: fica em `pagamentos`, amarrado ao
 * orcamento. O caixa soma as duas fontes. Assim cada coisa tem um lugar so
 * e nao existe risco de contar a mesma entrada duas vezes.
 */
export const lancamentos = pgTable(
  "lancamentos",
  {
    id: serial("id").primaryKey(),
    tipo: tipoLancamentoEnum("tipo").notNull(),
    categoria: text("categoria").notNull().default("Outros"),
    descricao: text("descricao").notNull(),
    valorCentavos: integer("valor_centavos").notNull(),
    vencimento: date("vencimento", { mode: "string" }).notNull(),
    dataPagamento: date("data_pagamento", { mode: "string" }),
    forma: formaPagamentoEnum("forma"),
    status: statusLancamentoEnum("status").notNull().default("aberto"),
    fornecedorId: integer("fornecedor_id").references(() => fornecedores.id),
    compraId: integer("compra_id").references(() => compras.id),
    calheiroId: integer("calheiro_id").references(() => calheiros.id),
    orcamentoId: integer("orcamento_id").references(() => orcamentos.id),
    observacao: text("observacao"),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("lancamentos_vencimento_idx").on(t.vencimento),
    index("lancamentos_pagamento_idx").on(t.dataPagamento),
    index("lancamentos_status_idx").on(t.status),
  ],
);

/**
 * O que foi PAGO ao calheiro: vale durante a semana e acerto depois.
 * O que ele TEM A RECEBER nao fica aqui: e calculado a partir da mao de
 * obra dos orcamentos dele, liberada conforme o cliente paga.
 */
export const movimentosCalheiro = pgTable(
  "movimentos_calheiro",
  {
    id: serial("id").primaryKey(),
    calheiroId: integer("calheiro_id")
      .notNull()
      .references(() => calheiros.id),
    tipo: tipoMovimentoCalheiroEnum("tipo").notNull(),
    valorCentavos: integer("valor_centavos").notNull(),
    data: date("data", { mode: "string" }).notNull(),
    orcamentoId: integer("orcamento_id").references(() => orcamentos.id),
    descricao: text("descricao"),
    forma: formaPagamentoEnum("forma").notNull().default("dinheiro"),
    /** Saida de caixa gerada por este movimento. */
    lancamentoId: integer("lancamento_id").references(() => lancamentos.id),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    canceladoEm: timestamp("cancelado_em", { withTimezone: true }),
  },
  (t) => [index("movimentos_calheiro_calheiro_idx").on(t.calheiroId)],
);

/** Lista de compras: anotar no celular o que esta faltando na fabrica. */
export const listaCompras = pgTable("lista_compras", {
  id: serial("id").primaryKey(),
  descricao: text("descricao").notNull(),
  quantidade: text("quantidade"),
  observacao: text("observacao"),
  fornecedorId: integer("fornecedor_id").references(() => fornecedores.id),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  compradoEm: timestamp("comprado_em", { withTimezone: true }),
});

/** Trilha de auditoria: toda alteracao fica registrada. */
export const historico = pgTable(
  "historico",
  {
    id: serial("id").primaryKey(),
    tipo: text("tipo").notNull(),
    registroId: integer("registro_id"),
    acao: text("acao").notNull(),
    dados: jsonb("dados"),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("historico_tipo_idx").on(t.tipo, t.registroId)],
);

// ---------------------------------------------------------------------------
// Tipos inferidos
// ---------------------------------------------------------------------------

export type Cliente = typeof clientes.$inferSelect;
export type TipoCalha = typeof tiposCalha.$inferSelect;
export type Calheiro = typeof calheiros.$inferSelect;
export type Fornecedor = typeof fornecedores.$inferSelect;
export type Orcamento = typeof orcamentos.$inferSelect;
export type OrcamentoItem = typeof orcamentoItens.$inferSelect;
export type Pagamento = typeof pagamentos.$inferSelect;
export type Compra = typeof compras.$inferSelect;
export type CompraItem = typeof compraItens.$inferSelect;
export type Lancamento = typeof lancamentos.$inferSelect;
export type MovimentoCalheiro = typeof movimentosCalheiro.$inferSelect;
export type Configuracoes = typeof configuracoes.$inferSelect;
