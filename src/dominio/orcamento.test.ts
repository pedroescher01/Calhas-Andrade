import { describe, it, expect } from "vitest";
import { calcularItem, calcularTotais } from "./orcamento";

/** 20 m de calha americana: R$ 45,00/m de material + R$ 15,00/m de mao de obra. */
const calhaAmericana20m = {
  quantidadeMilesimos: 20_000,
  precoMaterialCentavos: 4500,
  precoMaoObraCentavos: 1500,
};

/** 3 bocais a R$ 35,00 de material + R$ 10,00 de mao de obra cada. */
const tresBocais = {
  quantidadeMilesimos: 3000,
  precoMaterialCentavos: 3500,
  precoMaoObraCentavos: 1000,
};

describe("calcularItem", () => {
  it("separa material de mao de obra", () => {
    const r = calcularItem(calhaAmericana20m);
    expect(r.material).toBe(90_000); // R$ 900,00
    expect(r.maoObra).toBe(30_000); // R$ 300,00
    expect(r.total).toBe(120_000); // R$ 1.200,00
  });

  it("calcula item cobrado por peca", () => {
    const r = calcularItem(tresBocais);
    expect(r.material).toBe(10_500);
    expect(r.maoObra).toBe(3000);
    expect(r.total).toBe(13_500);
  });
});

describe("calcularTotais", () => {
  it("soma os itens e abre material e mao de obra", () => {
    const t = calcularTotais({ itens: [calhaAmericana20m, tresBocais] });
    expect(t.totalMaterial).toBe(100_500);
    expect(t.totalMaoObra).toBe(33_000);
    expect(t.subtotal).toBe(133_500);
    expect(t.total).toBe(133_500);
  });

  it("orcamento vazio fica zerado e aberto", () => {
    const t = calcularTotais({ itens: [] });
    expect(t.total).toBe(0);
    expect(t.pago).toBe(0);
    expect(t.statusFinanceiro).toBe("aberto");
    expect(t.maoObraLiberada).toBe(0);
  });

  it("desconto sai do total do cliente", () => {
    const t = calcularTotais({
      itens: [calhaAmericana20m],
      descontoCentavos: 20_000,
    });
    expect(t.subtotal).toBe(120_000);
    expect(t.desconto).toBe(20_000);
    expect(t.total).toBe(100_000);
  });

  it("acrescimo de nota entra no total", () => {
    const t = calcularTotais({
      itens: [calhaAmericana20m],
      acrescimoNotaCentavos: 14_400, // 12%
    });
    expect(t.total).toBe(134_400);
  });

  it("desconto nunca deixa o total negativo", () => {
    const t = calcularTotais({
      itens: [calhaAmericana20m],
      descontoCentavos: 999_999,
    });
    expect(t.total).toBe(0);
  });

  describe("status financeiro vem dos pagamentos", () => {
    it("sem pagamento: aberto", () => {
      const t = calcularTotais({ itens: [calhaAmericana20m] });
      expect(t.statusFinanceiro).toBe("aberto");
      expect(t.saldo).toBe(120_000);
    });

    it("pagamento no meio: parcial", () => {
      const t = calcularTotais({
        itens: [calhaAmericana20m],
        pagamentos: [{ valorCentavos: 60_000 }],
      });
      expect(t.statusFinanceiro).toBe("parcial");
      expect(t.pago).toBe(60_000);
      expect(t.saldo).toBe(60_000);
    });

    it("pagamento completo: pago", () => {
      const t = calcularTotais({
        itens: [calhaAmericana20m],
        pagamentos: [{ valorCentavos: 60_000 }, { valorCentavos: 60_000 }],
      });
      expect(t.statusFinanceiro).toBe("pago");
      expect(t.saldo).toBe(0);
      expect(t.sobra).toBe(0);
    });

    it("pagamento a mais registra sobra, nao saldo negativo", () => {
      const t = calcularTotais({
        itens: [calhaAmericana20m],
        pagamentos: [{ valorCentavos: 130_000 }],
      });
      expect(t.statusFinanceiro).toBe("pago");
      expect(t.saldo).toBe(0);
      expect(t.sobra).toBe(10_000);
    });

    it("pagamento estornado nao conta", () => {
      const t = calcularTotais({
        itens: [calhaAmericana20m],
        pagamentos: [
          { valorCentavos: 60_000, estornadoEm: new Date() },
          { valorCentavos: 20_000 },
        ],
      });
      expect(t.pago).toBe(20_000);
      expect(t.statusFinanceiro).toBe("parcial");
    });
  });

  /**
   * A regra que o dono descreveu:
   * "tem o valor do material e da mao de obra; assim que o cliente paga
   *  eu ja acerto a mao de obra com o calheiro".
   */
  describe("mao de obra liberada conforme o cliente paga", () => {
    it("cliente nao pagou: nada a acertar", () => {
      const t = calcularTotais({ itens: [calhaAmericana20m] });
      expect(t.totalMaoObra).toBe(30_000);
      expect(t.maoObraLiberada).toBe(0);
    });

    it("cliente pagou metade: metade da mao de obra", () => {
      const t = calcularTotais({
        itens: [calhaAmericana20m],
        pagamentos: [{ valorCentavos: 60_000 }],
      });
      expect(t.maoObraLiberada).toBe(15_000);
    });

    it("cliente quitou: mao de obra inteira", () => {
      const t = calcularTotais({
        itens: [calhaAmericana20m],
        pagamentos: [{ valorCentavos: 120_000 }],
      });
      expect(t.maoObraLiberada).toBe(30_000);
    });

    it("cliente pagou a mais: mao de obra nao passa do total dela", () => {
      const t = calcularTotais({
        itens: [calhaAmericana20m],
        pagamentos: [{ valorCentavos: 200_000 }],
      });
      expect(t.maoObraLiberada).toBe(30_000);
    });

    it("com desconto, quitar libera a mao de obra inteira", () => {
      // O desconto sai da margem da fabrica. O calheiro recebe igual.
      const t = calcularTotais({
        itens: [calhaAmericana20m],
        descontoCentavos: 20_000,
        pagamentos: [{ valorCentavos: 100_000 }],
      });
      expect(t.total).toBe(100_000);
      expect(t.statusFinanceiro).toBe("pago");
      expect(t.maoObraLiberada).toBe(30_000);
    });

    it("obra de cortesia (desconto total) ainda deve mao de obra", () => {
      const t = calcularTotais({
        itens: [calhaAmericana20m],
        descontoCentavos: 120_000,
      });
      expect(t.total).toBe(0);
      expect(t.maoObraLiberada).toBe(30_000);
    });

    it("liberacao proporcional nao cria nem perde centavo", () => {
      // Total R$ 1.335,00, mao de obra R$ 330,00. Pagamentos quebrados.
      const itens = [calhaAmericana20m, tresBocais];
      const parcelas = [44_500, 44_500, 44_500];
      let acumulado = 0;
      const liberacoes: number[] = [];
      for (let i = 0; i < parcelas.length; i++) {
        acumulado += parcelas[i]!;
        const t = calcularTotais({
          itens,
          pagamentos: [{ valorCentavos: acumulado }],
        });
        liberacoes.push(t.maoObraLiberada);
      }
      // No fim, liberou exatamente a mao de obra toda.
      expect(liberacoes.at(-1)).toBe(33_000);
      // E cresceu sempre, nunca voltou atras.
      expect(liberacoes).toEqual([...liberacoes].sort((a, b) => a - b));
    });
  });
});
