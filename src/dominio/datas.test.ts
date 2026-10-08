import { describe, it, expect } from "vitest";
import {
  hoje,
  formatarData,
  formatarDataCurta,
  somarDias,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
  estaVencido,
  diasAte,
  descreverPrazo,
} from "./datas";

describe("hoje", () => {
  it("usa o fuso de Sao Paulo, nao UTC", () => {
    // 2026-10-09 00:30 UTC ainda e dia 8 em Sao Paulo (UTC-3).
    expect(hoje(new Date("2026-10-09T00:30:00Z"))).toBe("2026-10-08");
  });

  it("vira o dia no horario certo", () => {
    expect(hoje(new Date("2026-10-09T02:59:00Z"))).toBe("2026-10-08");
    expect(hoje(new Date("2026-10-09T03:01:00Z"))).toBe("2026-10-09");
  });

  it("devolve no formato AAAA-MM-DD", () => {
    expect(hoje()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatarData", () => {
  it("mostra no jeito brasileiro", () => {
    expect(formatarData("2026-10-08")).toBe("08/10/2026");
    expect(formatarDataCurta("2026-10-08")).toBe("08/10");
  });

  it("aguenta vazio", () => {
    expect(formatarData(null)).toBe("");
    expect(formatarData("")).toBe("");
  });
});

describe("somarDias", () => {
  it("soma dentro do mes", () => {
    expect(somarDias("2026-10-08", 7)).toBe("2026-10-15");
  });

  it("atravessa o mes", () => {
    expect(somarDias("2026-10-28", 7)).toBe("2026-11-04");
  });

  it("atravessa o ano", () => {
    expect(somarDias("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("subtrai com dia negativo", () => {
    expect(somarDias("2026-03-02", -2)).toBe("2026-02-28");
  });

  it("acerta ano bissexto", () => {
    expect(somarDias("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("primeiro e ultimo dia do mes", () => {
  it("acha as bordas", () => {
    expect(primeiroDiaDoMes("2026-10-08")).toBe("2026-10-01");
    expect(ultimoDiaDoMes("2026-10-08")).toBe("2026-10-31");
    expect(ultimoDiaDoMes("2026-02-10")).toBe("2026-02-28");
    expect(ultimoDiaDoMes("2028-02-10")).toBe("2028-02-29");
  });
});

describe("vencimento", () => {
  it("vencido e o que passou da data", () => {
    expect(estaVencido("2026-10-07", "2026-10-08")).toBe(true);
    expect(estaVencido("2026-10-08", "2026-10-08")).toBe(false);
    expect(estaVencido("2026-10-09", "2026-10-08")).toBe(false);
  });

  it("conta os dias", () => {
    expect(diasAte("2026-10-15", "2026-10-08")).toBe(7);
    expect(diasAte("2026-10-05", "2026-10-08")).toBe(-3);
  });

  it("descreve o prazo em palavras", () => {
    expect(descreverPrazo("2026-10-08", "2026-10-08")).toBe("hoje");
    expect(descreverPrazo("2026-10-09", "2026-10-08")).toBe("amanha");
    expect(descreverPrazo("2026-10-05", "2026-10-08")).toBe("atrasado 3 dias");
    expect(descreverPrazo("2026-10-18", "2026-10-08")).toBe("em 10 dias");
  });
});
