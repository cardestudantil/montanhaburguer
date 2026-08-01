import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Tables } from "@/integrations/supabase/types";

type OrderWithItems = Tables<"orders"> & {
  order_items?: Tables<"order_items">[];
};

type AddonEntry = { name: string; qty: number };

function addonsList(raw: unknown): AddonEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: AddonEntry[] = [];
  for (const a of raw) {
    if (!a || typeof a !== "object") continue;
    const o = a as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name : "";
    if (!name) continue;
    const qty = Number(o.qty ?? 1);
    out.push({ name, qty: qty > 1 ? qty : 1 });
  }
  return out;
}

const BRL = (n: number) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OrderPrint({
  order,
  onDone,
}: {
  order: OrderWithItems;
  onDone: () => void;
}) {
  useEffect(() => {
    const after = () => {
      window.removeEventListener("afterprint", after);
      onDone();
    };
    window.addEventListener("afterprint", after);
    // give the DOM a tick to paint before opening the dialog
    const t = window.setTimeout(() => window.print(), 60);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", after);
    };
  }, [onDone]);

  const items = order.order_items ?? [];
  const orderNo = String(
    (order as unknown as { order_number?: number }).order_number ?? 0,
  ).padStart(2, "0");
  const dt = new Date(order.created_at).toLocaleString("pt-BR");

  return createPortal(
    <div className="print-root" aria-hidden>
      {/* ============ VIA COZINHA ============ */}
      <section className="print-ticket">
        <h1 className="print-title">=== VIA COZINHA ===</h1>
        <div className="print-order-no">PEDIDO #{orderNo}</div>
        <div className="print-meta">{dt}</div>
        <hr className="print-hr" />

        <ul className="print-items">
          {items.map((it) => {
            const ads = addonsList(it.addons as unknown);
            return (
              <li key={it.id} className="print-item">
                <div className="print-item-line">
                  {it.quantity}x {it.name.toUpperCase()}
                </div>
                {ads.length > 0 && (
                  <ul className="print-addons">
                    {ads.map((a, i) => (
                      <li key={i}>
                        + {a.qty && a.qty > 1 ? `${a.qty}x ` : ""}
                        {a.name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <hr className="print-hr print-hr-dash" />

      </section>

      {/* ============ VIA ENTREGA ============ */}
      <section className="print-ticket print-page-break">
        <h1 className="print-title">=== VIA ENTREGA ===</h1>
        <div className="print-order-no">PEDIDO #{orderNo}</div>
        <div className="print-meta">{dt}</div>
        <hr className="print-hr" />

        <div className="print-label">CLIENTE</div>
        <div className="print-strong">{order.customer_name}</div>
        <div className="print-strong">Tel: {order.customer_phone}</div>

        <hr className="print-hr" />
        <div className="print-label">ENDEREÇO DE ENTREGA</div>
        <div className="print-address">{order.customer_address}</div>

        {(() => {
          const raw = order.notes ?? "";
          let troco = "";
          let obs = raw;
          const m = raw.match(/^(Troco para [^.]+\([^)]+\)|Sem troco \(valor exato\))\.?\s*/);
          if (m) {
            troco = m[1];
            obs = raw.slice(m[0].length).trim();
          }
          return (
            <>
              {troco && (
                <>
                  <hr className="print-hr" />
                  <div className="print-label">TROCO</div>
                  <div className="print-obs">{troco}</div>
                </>
              )}
              {obs && (
                <>
                  <hr className="print-hr" />
                  <div className="print-label">OBSERVAÇÕES / MOTOBOY</div>
                  <div className="print-obs">{obs}</div>
                </>
              )}
            </>
          );
        })()}


        <hr className="print-hr" />
        <div className="print-label">ITENS (conferência)</div>
        <ul className="print-items-simple">
          {items.map((it) => {
            const ads = addonsList(it.addons as unknown);
            return (
              <li key={it.id}>
                <div>
                  {it.quantity}x {it.name}
                </div>
                {ads.length > 0 && (
                  <ul className="print-addons">
                    {ads.map((a, i) => (
                      <li key={i}>
                        + {a.qty && a.qty > 1 ? `${a.qty}x ` : ""}
                        {a.name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>


        <hr className="print-hr" />
        <div className="print-row">
          <span>Subtotal</span>
          <span>{BRL(Number(order.subtotal))}</span>
        </div>
        <div className="print-row">
          <span>Entrega</span>
          <span>{BRL(Number(order.delivery_fee))}</span>
        </div>
        <div className="print-payment">
          <div>Pagamento:</div>
          <div>{order.payment_method || "—"}</div>
        </div>

        <hr className="print-hr" />
        <div className="print-total">
          <span>TOTAL</span>
          <span>{BRL(Number(order.total))}</span>
        </div>
        <hr className="print-hr print-hr-dash" />
        <div className="print-footer">Obrigado pela preferência!</div>
      </section>
    </div>,
    document.body,
  );
}
