import { describe, it, expect } from "vitest";
import {
  arredondar,
  multiplicarPorMilesimos,
  aplicarBp,
  proporcao,
  formatarReais,
  parsearReais,
  parsearQuantidade,
  formatarQuantidade,
} from "./dinheiro";

describe("arredondar", () => {
  it("arredonda meio para longe do zero", () => {
    expect(arredondar(0.5)).toBe(1);
    expect(arredondar(1.5)).toBe(2);
    expect(arredondar(-0.5)).toBe(-1);
    expect(arredondar(-1.5)).toBe(-2);
    expect(arredondar(2.4)).toBe(2);
  });
});

describe("multiplicarPorMilesimos", () => {
  it("calcula metragem com preco por metro", () => {
    // 12,5 m a R$ 48,00/m = R$ 600,00
    expect(multiplicarPorMilesimos(4800, 12500)).toBe(60000);
  });

  it("aceita fracao de metro", () => {
    // 0,25 m a R$ 48,00/m = R$ 12,00
    expect(multiplicarPorMilesimos(4800, 250)).toBe(1200);
  });

  it("nao deixa sobrar fracao de centavo", () => {
    // 3,333 m a R$ 33,33/m = R$ 111,09 (111,08889 arredondado)
    expect(multiplicarPorMilesimos(3333, 3333)).toBe(11109);
    expect(Number.isInteger(multiplicarPorMilesimos(3333, 3333))).toBe(true);
  });

  it("quantidade zero da zero", () => {
    expect(multiplicarPorMilesimos(4800, 0)).toBe(0);
  });
});

describe("aplicarBp", () => {
  it("aplica percentual de nota fiscal", () => {
    // 12% sobre R$ 1.000,00 = R$ 120,00
    expect(aplicarBp(100000, 1200)).toBe(12000);
  });

  it("zero por cento nao mexe no valor", () => {
    expect(aplicarBp(100000, 0)).toBe(0);
  });
});

describe("proporcao", () => {
  it("devolve a parte proporcional", () => {
    expect(proporcao(30000, 60000, 120000)).toBe(15000); // metade
  });

  it("nao passa do total quando o numerador e maior", () => {
    expect(proporcao(30000, 999999, 120000)).toBe(30000);
  });

  it("protege divisao por zero", () => {
    expect(proporcao(30000, 100, 0)).toBe(0);
  });

  it("numerador negativo ou zero da zero", () => {
    expect(proporcao(30000, 0, 120000)).toBe(0);
    expect(proporcao(30000, -50, 120000)).toBe(0);
  });
});

describe("parsearReais", () => {
  const casos: Array<[string, number]> = [
    ["1.234,56", 123456],
    ["1234,56", 123456],
    ["1234.56", 123456],
    ["R$ 1.234,56", 123456],
    ["1234", 123400],
    ["0,50", 50],
    [",5", 50],
    ["1.500", 150000], // ponto de milhar: mil e quinhentos reais
    ["12.50", 1250], // duas casas depois do ponto: doze e cinquenta
    ["1.234.567,89", 123456789],
    ["-45,30", -4530],
    ["", 0],
    ["abc", 0],
    ["R$", 0],
  ];

  for (const [entrada, esperado] of casos) {
    it(`"${entrada}" -> ${esperado}`, () => {
      expect(parsearReais(entrada)).toBe(esperado);
    });
  }

  it("aceita numero direto", () => {
    expect(parsearReais(1234.56)).toBe(123456);
  });

  it("volta ao mesmo valor depois de formatar", () => {
    for (const centavos of [0, 1, 99, 100, 12345, 123456789]) {
      expect(parsearReais(formatarReais(centavos))).toBe(centavos);
    }
  });
});

describe("parsearQuantidade", () => {
  const casos: Array<[string, number]> = [
    ["12,5", 12500],
    ["12.5", 12500],
    ["3", 3000],
    ["0,25", 250],
    ["0,001", 1],
    ["", 0],
  ];

  for (const [entrada, esperado] of casos) {
    it(`"${entrada}" -> ${esperado}`, () => {
      expect(parsearQuantidade(entrada)).toBe(esperado);
    });
  }

  it("volta ao mesmo valor depois de formatar", () => {
    for (const milesimos of [0, 1, 250, 3000, 12500, 1000000]) {
      expect(parsearQuantidade(formatarQuantidade(milesimos))).toBe(milesimos);
    }
  });
});

describe("formatarReais", () => {
  it("formata em reais do Brasil", () => {
    // O espaco pode ser nao-separavel, por isso a comparacao normaliza.
    expect(formatarReais(123456).replace(/ /g, " ")).toBe("R$ 1.234,56");
    expect(formatarReais(0).replace(/ /g, " ")).toBe("R$ 0,00");
  });

  it("trata nulo como zero", () => {
    expect(formatarReais(null).replace(/ /g, " ")).toBe("R$ 0,00");
  });
});

describe("formatarQuantidade", () => {
  it("nao mostra zeros a direita", () => {
    expect(formatarQuantidade(3000)).toBe("3");
    expect(formatarQuantidade(12500)).toBe("12,5");
    expect(formatarQuantidade(250)).toBe("0,25");
  });
});
