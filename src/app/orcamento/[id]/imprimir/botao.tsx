"use client";

/** Barra que aparece na tela e desaparece no papel. */
export function BotaoImprimir() {
  return (
    <div className="nao-imprime mb-6 flex items-center justify-between gap-3 rounded-lg bg-superficie px-4 py-3">
      <p className="text-[13px] text-cinza">
        Para virar PDF, escolha <strong className="text-tinta">Salvar como PDF</strong>{" "}
        na janela de impressão.
      </p>
      <button
        type="button"
        onClick={() => window.print()}
        className="shrink-0 rounded-lg bg-tinta px-4 py-2 text-[15px] font-semibold text-white"
      >
        Imprimir
      </button>
    </div>
  );
}
