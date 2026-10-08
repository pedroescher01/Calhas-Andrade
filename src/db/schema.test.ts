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
