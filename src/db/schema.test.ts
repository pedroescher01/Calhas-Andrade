import { describe, it, expect } from "vitest";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Nome de tabela, de coluna e de indice fica em ASCII, sempre.
 *
 * Nao e frescura: nome com acento obriga aspas em toda consulta escrita a
 * mao, atrapalha exportacao para planilha e quebra ferramenta que nao
 * espera UTF-8 em identificador. O texto que o dono le na tela pode (e
 * deve) ter acento; o nome da coluna, nao.
 *
 * Este teste existe porque uma passada automatica de acentuacao ja renomeou
 * as tabelas "usuario" e "historico" sem ninguem perceber.
 */

function temAcento(texto: string): boolean {
  return [...texto].some((c) => c.charCodeAt(0) > 127);
}

const tabelas = Object.entries(schema).filter(
  ([, valor]) => valor instanceof PgTable,
) as [string, PgTable][];

describe("identificadores do banco", () => {
  it("encontra as tabelas do sistema", () => {
    expect(tabelas.length).toBeGreaterThanOrEqual(14);
  });

  for (const [exportado, tabela] of tabelas) {
    const config = getTableConfig(tabela);

    it(`${exportado}: nome de tabela em ASCII`, () => {
      expect(temAcento(config.name), `tabela "${config.name}"`).toBe(false);
      expect(config.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it(`${exportado}: colunas em ASCII`, () => {
      for (const coluna of config.columns) {
        expect(temAcento(coluna.name), `coluna "${coluna.name}"`).toBe(false);
        expect(coluna.name).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    });
  }
});

describe("rotulos que o dono le", () => {
  it("as categorias de fornecedor sao escritas em portugues correto", () => {
    // Estas sao excecao proposital: o valor guardado e o proprio rotulo
    // mostrado na tela, entao leva acento.
    const categorias = schema.categoriaFornecedorEnum.enumValues;
    expect(categorias).toContain("Bocais e acessórios");
    expect(categorias).toContain("Silicone/vedação");
    expect(categorias).toContain("Combustível");
    expect(categorias).toContain("Serviços");
  });

  it("as chaves tecnicas de forma de pagamento ficam em ASCII", () => {
    // Estas nunca aparecem na tela: cada tela tem seu proprio rotulo.
    for (const forma of schema.formaPagamentoEnum.enumValues) {
      expect(temAcento(forma), `forma "${forma}"`).toBe(false);
    }
  });
});

describe("script de dados de exemplo", () => {
  /**
   * O "npm run db:seed -- --limpar" apaga tudo com um TRUNCATE escrito a
   * mao. Como o nome das tabelas aparece ali como texto, ele e o lugar mais
   * facil de ficar para tras quando o schema muda -- e foi o que aconteceu:
   * uma passada de acentuacao renomeou as tabelas no TRUNCATE e o comando
   * passou a falhar.
   */
  it("o TRUNCATE lista tabelas que existem de verdade", async () => {
    const { readFileSync } = await import("node:fs");
    const script = readFileSync("scripts/semear.ts", "utf8");

    const trecho = script.match(/TRUNCATE TABLE([\s\S]*?)RESTART IDENTITY/);
    expect(trecho, "nao achei o TRUNCATE no script de exemplo").not.toBeNull();

    const citadas = trecho![1]!
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    const existentes = new Set(
      tabelas.map(([, tabela]) => getTableConfig(tabela).name),
    );

    expect(citadas.length).toBeGreaterThan(10);
    for (const nome of citadas) {
      expect(existentes.has(nome), `tabela "${nome}" nao existe no schema`).toBe(true);
    }
  });

  it("apaga todas as tabelas que guardam movimento", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const script = readFileSync("scripts/semear.ts", "utf8");
    const trecho = script.match(/TRUNCATE TABLE([\s\S]*?)RESTART IDENTITY/)![1]!;

    // Estas nao podem sobrar para tras: seriam dados velhos misturados
    // com o exemplo novo.
    for (const nome of [
      "orcamentos",
      "orcamento_itens",
      "pagamentos",
      "movimentos_calheiro",
      "lancamentos",
      "compras",
      "compra_itens",
    ]) {
      expect(trecho, `o TRUNCATE esqueceu de "${nome}"`).toContain(nome);
    }
  });
});
