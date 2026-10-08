CREATE TYPE "public"."categoria_fornecedor" AS ENUM('Chapa galvanizada', 'Condutor/tubo', 'Bocais e acessorios', 'Silicone/vedacao', 'Rebites/parafusos/buchas', 'Estanho/solda', 'Ferramentas', 'Combustivel', 'Servicos', 'Outros');--> statement-breakpoint
CREATE TYPE "public"."forma_pagamento" AS ENUM('pix', 'dinheiro', 'transferencia', 'cartao', 'boleto', 'cheque', 'outro');--> statement-breakpoint
CREATE TYPE "public"."situacao_obra" AS ENUM('a_fazer', 'agendada', 'feita');--> statement-breakpoint
CREATE TYPE "public"."status_compra" AS ENUM('rascunho', 'pedido', 'recebido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_lancamento" AS ENUM('aberto', 'pago', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_orcamento" AS ENUM('rascunho', 'enviado', 'aprovado', 'recusado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."tipo_calheiro" AS ENUM('terceiro', 'funcionario');--> statement-breakpoint
CREATE TYPE "public"."tipo_lancamento" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimento_calheiro" AS ENUM('vale', 'acerto', 'ajuste');--> statement-breakpoint
CREATE TYPE "public"."unidade" AS ENUM('m', 'un', 'vb');--> statement-breakpoint
CREATE TABLE "calheiros" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"telefone" text,
	"tipo" "tipo_calheiro" DEFAULT 'terceiro' NOT NULL,
	"observacao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"telefone" text,
	"documento" text,
	"email" text,
	"endereco" text,
	"bairro" text,
	"cidade" text,
	"cep" text,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"arquivado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "compra_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"compra_id" integer NOT NULL,
	"descricao" text NOT NULL,
	"unidade" "unidade" DEFAULT 'un' NOT NULL,
	"quantidade_milesimos" integer NOT NULL,
	"valor_unitario_centavos" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compras" (
	"id" serial PRIMARY KEY NOT NULL,
	"fornecedor_id" integer NOT NULL,
	"data" date NOT NULL,
	"status" "status_compra" DEFAULT 'rascunho' NOT NULL,
	"previsao_entrega" date,
	"frete_centavos" integer DEFAULT 0 NOT NULL,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"nome_empresa" text DEFAULT 'Calhas Andrade' NOT NULL,
	"telefone" text,
	"documento" text,
	"endereco" text,
	"pix_chave" text,
	"pix_favorecido" text,
	"percentual_nota_bp" integer DEFAULT 0 NOT NULL,
	"validade_padrao_dias" integer DEFAULT 15 NOT NULL,
	"saldo_inicial_centavos" integer,
	"saldo_inicial_data" date,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"nome_fantasia" text,
	"telefone" text,
	"documento" text,
	"categoria" "categoria_fornecedor" DEFAULT 'Outros' NOT NULL,
	"observacao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historico" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"registro_id" integer,
	"acao" text NOT NULL,
	"dados" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lancamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" "tipo_lancamento" NOT NULL,
	"categoria" text DEFAULT 'Outros' NOT NULL,
	"descricao" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"vencimento" date NOT NULL,
	"data_pagamento" date,
	"forma" "forma_pagamento",
	"status" "status_lancamento" DEFAULT 'aberto' NOT NULL,
	"fornecedor_id" integer,
	"compra_id" integer,
	"calheiro_id" integer,
	"orcamento_id" integer,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lista_compras" (
	"id" serial PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL,
	"quantidade" text,
	"observacao" text,
	"fornecedor_id" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"comprado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "movimentos_calheiro" (
	"id" serial PRIMARY KEY NOT NULL,
	"calheiro_id" integer NOT NULL,
	"tipo" "tipo_movimento_calheiro" NOT NULL,
	"valor_centavos" integer NOT NULL,
	"data" date NOT NULL,
	"orcamento_id" integer,
	"descricao" text,
	"forma" "forma_pagamento" DEFAULT 'dinheiro' NOT NULL,
	"lancamento_id" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "orcamento_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"orcamento_id" integer NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"tipo_calha_id" integer,
	"descricao" text NOT NULL,
	"unidade" "unidade" DEFAULT 'm' NOT NULL,
	"quantidade_milesimos" integer NOT NULL,
	"preco_material_centavos" integer DEFAULT 0 NOT NULL,
	"preco_mao_obra_centavos" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer,
	"cliente_nome_avulso" text,
	"data_emissao" date NOT NULL,
	"validade_dias" integer DEFAULT 15 NOT NULL,
	"status" "status_orcamento" DEFAULT 'rascunho' NOT NULL,
	"situacao_obra" "situacao_obra" DEFAULT 'a_fazer' NOT NULL,
	"data_agendada" date,
	"calheiro_id" integer,
	"endereco_obra" text,
	"observacoes" text,
	"desconto_centavos" integer DEFAULT 0 NOT NULL,
	"acrescimo_nota_centavos" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"arquivado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"orcamento_id" integer NOT NULL,
	"valor_centavos" integer NOT NULL,
	"data" date NOT NULL,
	"forma" "forma_pagamento" DEFAULT 'pix' NOT NULL,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"estornado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tipos_calha" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"unidade" "unidade" DEFAULT 'm' NOT NULL,
	"preco_material_centavos" integer DEFAULT 0 NOT NULL,
	"preco_mao_obra_centavos" integer DEFAULT 0 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text DEFAULT 'Dono' NOT NULL,
	"senha_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_acesso" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "compra_itens" ADD CONSTRAINT "compra_itens_compra_id_compras_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."compras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_compra_id_compras_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."compras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_calheiro_id_calheiros_id_fk" FOREIGN KEY ("calheiro_id") REFERENCES "public"."calheiros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lista_compras" ADD CONSTRAINT "lista_compras_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_calheiro" ADD CONSTRAINT "movimentos_calheiro_calheiro_id_calheiros_id_fk" FOREIGN KEY ("calheiro_id") REFERENCES "public"."calheiros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_calheiro" ADD CONSTRAINT "movimentos_calheiro_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_calheiro" ADD CONSTRAINT "movimentos_calheiro_lancamento_id_lancamentos_id_fk" FOREIGN KEY ("lancamento_id") REFERENCES "public"."lancamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_tipo_calha_id_tipos_calha_id_fk" FOREIGN KEY ("tipo_calha_id") REFERENCES "public"."tipos_calha"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_calheiro_id_calheiros_id_fk" FOREIGN KEY ("calheiro_id") REFERENCES "public"."calheiros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clientes_nome_idx" ON "clientes" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "compra_itens_compra_idx" ON "compra_itens" USING btree ("compra_id");--> statement-breakpoint
CREATE INDEX "compras_fornecedor_idx" ON "compras" USING btree ("fornecedor_id");--> statement-breakpoint
CREATE INDEX "fornecedores_nome_idx" ON "fornecedores" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "historico_tipo_idx" ON "historico" USING btree ("tipo","registro_id");--> statement-breakpoint
CREATE INDEX "lancamentos_vencimento_idx" ON "lancamentos" USING btree ("vencimento");--> statement-breakpoint
CREATE INDEX "lancamentos_pagamento_idx" ON "lancamentos" USING btree ("data_pagamento");--> statement-breakpoint
CREATE INDEX "lancamentos_status_idx" ON "lancamentos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "movimentos_calheiro_calheiro_idx" ON "movimentos_calheiro" USING btree ("calheiro_id");--> statement-breakpoint
CREATE INDEX "orcamento_itens_orcamento_idx" ON "orcamento_itens" USING btree ("orcamento_id");--> statement-breakpoint
CREATE INDEX "orcamentos_cliente_idx" ON "orcamentos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "orcamentos_emissao_idx" ON "orcamentos" USING btree ("data_emissao");--> statement-breakpoint
CREATE INDEX "orcamentos_situacao_idx" ON "orcamentos" USING btree ("situacao_obra");--> statement-breakpoint
CREATE INDEX "pagamentos_orcamento_idx" ON "pagamentos" USING btree ("orcamento_id");--> statement-breakpoint
CREATE INDEX "pagamentos_data_idx" ON "pagamentos" USING btree ("data");--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_calha_nome_idx" ON "tipos_calha" USING btree ("nome");