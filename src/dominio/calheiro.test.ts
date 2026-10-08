import { describe, it, expect } from "vitest";
import { calcularSaldoCalheiro } from "./calheiro";

describe("calcularSaldoCalheiro", () => {
  it("calheiro sem obra e sem vale fica zerado", () => {
    const s = calcularSaldoCalheiro({ obras: [], movimentos: [] });
    expect(s.saldo).toBe(0);
    expect(s.liberado).toBe(0);
    expect(s.aLiberar).toBe(0);
  });

  it("obra feita e cliente pagando libera o que ele tem a receber", () => {
    const s = calcularSaldoCalheiro({
      obras: [{ orcamentoId: 1, totalMaoObra: 30_000, maoObraLiberada: 15_000 }],
      movimentos: [],
    });
    expect(s.liberado).toBe(15_000);
    expect(s.aLiberar).toBe(15_000); // ainda preso no que o cliente deve
    expect(s.saldo).toBe(15_000);
  });

  it("vale durante a semana abate do saldo", () => {
    const s = calcularSaldoCalheiro({
      obras: [{ orcamentoId: 1, totalMaoObra: 30_000, maoObraLiberada: 30_000 }],
      movimentos: [{ tipo: "vale", valorCentavos: 10_000 }],
    });
    expect(s.vales).toBe(10_000);
    expect(s.pago).toBe(10_000);
    expect(s.saldo).toBe(20_000); // ainda deve R$ 200,00 a ele
  });

  it("acerto fecha a conta", () => {
    const s = calcularSaldoCalheiro({
      obras: [{ orcamentoId: 1, totalMaoObra: 30_000, maoObraLiberada: 30_000 }],
      movimentos: [
        { tipo: "vale", valorCentavos: 10_000 },
        { tipo: "acerto", valorCentavos: 20_000 },
      ],
    });
    expect(s.saldo).toBe(0);
  });

  it("vale maior que o liberado deixa ele adiantado (saldo negativo)", () => {
    const s = calcularSaldoCalheiro({
      obras: [{ orcamentoId: 1, totalMaoObra: 30_000, maoObraLiberada: 0 }],
      movimentos: [{ tipo: "vale", valorCentavos: 5000 }],
    });
    expect(s.saldo).toBe(-5000);
  });

  it("movimento cancelado não conta", () => {
    const s = calcularSaldoCalheiro({
      obras: [{ orcamentoId: 1, totalMaoObra: 30_000, maoObraLiberada: 30_000 }],
      movimentos: [
        { tipo: "vale", valorCentavos: 10_000, canceladoEm: new Date() },
        { tipo: "vale", valorCentavos: 3000 },
      ],
    });
    expect(s.vales).toBe(3000);
    expect(s.saldo).toBe(27_000);
  });

  it("soma varias obras", () => {
    const s = calcularSaldoCalheiro({
      obras: [
        { orcamentoId: 1, totalMaoObra: 30_000, maoObraLiberada: 30_000 },
        { orcamentoId: 2, totalMaoObra: 12_000, maoObraLiberada: 6000 },
        { orcamentoId: 3, totalMaoObra: 8000, maoObraLiberada: 0 },
      ],
      movimentos: [{ tipo: "acerto", valorCentavos: 20_000 }],
    });
    expect(s.liberado).toBe(36_000);
    expect(s.aLiberar).toBe(14_000);
    expect(s.saldo).toBe(16_000);
  });

  it("ajuste serve para corrigir a conta na mão", () => {
    const s = calcularSaldoCalheiro({
      obras: [{ orcamentoId: 1, totalMaoObra: 30_000, maoObraLiberada: 30_000 }],
      movimentos: [{ tipo: "ajuste", valorCentavos: -5000 }],
    });
    // Ajuste negativo aumenta o que a fabrica deve a ele.
    expect(s.saldo).toBe(35_000);
  });
});
