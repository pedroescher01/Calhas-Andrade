import { describe, it, expect } from "vitest";
import { normalizarTelefone, montarMensagemOrcamento, linkWhatsApp } from "./whatsapp";

describe("normalizarTelefone", () => {
  const casos: Array<[string, string | null]> = [
    ["(19) 99999-8888", "5519999998888"],
    ["19999998888", "5519999998888"],
    ["+55 19 99999-8888", "5519999998888"],
    ["55 19 99999 8888", "5519999998888"],
    ["19 3333-4444", "551933334444"], // fixo com DDD
    ["0 19 99999-8888", "5519999998888"], // zero de operadora
    ["99999-8888", null], // sem DDD, nao da para montar
    ["", null],
    ["abc", null],
  ];

  for (const [entrada, esperado] of casos) {
    it(`"${entrada}" -> ${esperado}`, () => {
      expect(normalizarTelefone(entrada)).toBe(esperado);
    });
  }

  it("trata nulo", () => {
    expect(normalizarTelefone(null)).toBeNull();
    expect(normalizarTelefone(undefined)).toBeNull();
  });
});

describe("montarMensagemOrcamento", () => {
  const base = {
    nomeEmpresa: "Calhas Andrade",
    numero: 42,
    clienteNome: "Maria Helena",
    dataEmissao: "2026-10-08",
    enderecoObra: "Rua das Flores, 10",
    itens: [
      {
        descricao: "Calha americana",
        unidade: "m" as const,
        quantidadeMilesimos: 12_500,
        totalCentavos: 75_000,
      },
    ],
    totalCentavos: 75_000,
  };

  it("mostra empresa, número, cliente e total", () => {
    const texto = montarMensagemOrcamento(base);
    expect(texto).toContain("Calhas Andrade");
    expect(texto).toContain("nº 42");
    expect(texto).toContain("Maria Helena");
    expect(texto).toContain("08/10/2026");
    expect(texto).toContain("Rua das Flores, 10");
    expect(texto).toContain("Calha americana: 12,5 m");
    expect(texto.replace(/ /g, " ")).toContain("Total: R$ 750,00");
  });

  it("não fala de mão de obra: isso e assunto interno", () => {
    const texto = montarMensagemOrcamento(base);
    expect(texto.toLowerCase()).not.toContain("mão de obra");
    expect(texto.toLowerCase()).not.toContain("material");
  });

  it("mostra o que falta quando já teve pagamento", () => {
    const texto = montarMensagemOrcamento({
      ...base,
      pagoCentavos: 30_000,
      saldoCentavos: 45_000,
    });
    expect(texto.replace(/ /g, " ")).toContain("Já pago: R$ 300,00");
    expect(texto.replace(/ /g, " ")).toContain("Falta: R$ 450,00");
  });

  it("não fala de pagamento quando não houve nenhum", () => {
    const texto = montarMensagemOrcamento(base);
    expect(texto).not.toContain("Já pago");
    expect(texto).not.toContain("Falta");
  });

  it("inclui o Pix quando configurado", () => {
    const texto = montarMensagemOrcamento({ ...base, pixChave: "19999998888" });
    expect(texto).toContain("Pix: 19999998888");
  });

  it("mostra o desconto como linha negativa", () => {
    const texto = montarMensagemOrcamento({
      ...base,
      descontoCentavos: 5000,
      totalCentavos: 70_000,
    });
    expect(texto.replace(/ /g, " ")).toContain("Desconto: -R$ 50,00");
  });
});

describe("linkWhatsApp", () => {
  it("monta o link com número e texto codificado", () => {
    const link = linkWhatsApp("(19) 99999-8888", "Ola, tudo bem?");
    expect(link).toBe("https://wa.me/5519999998888?text=Ola%2C%20tudo%20bem%3F");
  });

  it("sem número, abre para escolher o contato", () => {
    expect(linkWhatsApp(null, "Oi")).toBe("https://wa.me/?text=Oi");
  });

  it("codifica a quebra de linha e preserva o asterisco do negrito", () => {
    const link = linkWhatsApp("19999998888", "*Total*\nR$ 10,00");
    expect(link).toContain("%0A"); // quebra de linha codificada
    // O asterisco passa inteiro: e ele que deixa o texto em negrito no
    // WhatsApp. Codificar estragaria a formatacao da mensagem.
    expect(link).toContain("*Total*");
  });
});
