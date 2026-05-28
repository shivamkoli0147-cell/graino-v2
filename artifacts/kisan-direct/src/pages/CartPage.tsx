import { useState, useRef } from "react";
import { useCreateOrder } from "@workspace/api-client-react";
import { formatINR, getCartTotal, DELIVERY_SLOTS, type Cart, type CartItem, type CustomerSession } from "../lib/utils";

interface CartPageProps {
  cart: Cart;
  customer: CustomerSession;
  onCartChange: (key: string, item: CartItem | null) => void;
  onClearCart: () => void;
  onOrderSuccess: () => void;
}

const SLOT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  morning:   { bg: "#FFF7ED", border: "#FED7AA", text: "#c2410c" },
  afternoon: { bg: "#FFFBEB", border: "#FDE68A", text: "#b45309" },
  evening:   { bg: "#F5F3FF", border: "#DDD6FE", text: "#6d28d9" },
};

const SELLER_NAME = "Rohit Mukati";

export function CartPage({ cart, customer, onCartChange, onClearCart, onOrderSuccess }: CartPageProps) {
  const [selectedSlot, setSelectedSlot] = useState("");
  const [ordered, setOrdered] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  // Order-specific delivery details (NOT saved to profile)
  const [deliveryPhone, setDeliveryPhone] = useState(customer.phone || "");
  const [deliveryAddr, setDeliveryAddr] = useState(customer.address || "");
  const [landmark, setLandmark] = useState("");

  // Snapshot at order time for confirmation card
  const [confirmedAddress, setConfirmedAddress] = useState("");
  const [confirmedPhone, setConfirmedPhone] = useState("");

  // Error states
  const [showSlotError, setShowSlotError] = useState(false);
  const [showAddrError, setShowAddrError] = useState(false);
  const [showPhoneError, setShowPhoneError] = useState(false);

  const addrRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const createOrder = useCreateOrder();

  const items = Object.entries(cart);
  const total = getCartTotal(cart);

  const placeOrder = () => {
    let hasError = false;

    if (!deliveryAddr.trim()) {
      setShowAddrError(true);
      hasError = true;
    } else {
      setShowAddrError(false);
    }

    if (!/^\d{10}$/.test(deliveryPhone)) {
      setShowPhoneError(true);
      hasError = true;
    } else {
      setShowPhoneError(false);
    }

    if (!selectedSlot) {
      setShowSlotError(true);
      hasError = true;
    } else {
      setShowSlotError(false);
    }

    if (hasError) {
      // Scroll to top of form to show errors
      setTimeout(() => {
        addrRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
      return;
    }

    const finalAddress = landmark.trim()
      ? `${deliveryAddr.trim()}, ${landmark.trim()}`
      : deliveryAddr.trim();

    createOrder.mutate(
      {
        data: {
          customer_id: customer.id,
          village: customer.village,
          address: finalAddress,
          delivery_slot: selectedSlot as "morning" | "afternoon" | "evening",
          items: items.map(([, item]) => ({
            variety_id: item.varietyId,
            product_name: item.productName,
            variety_name: item.varietyName,
            price_per_kg: item.pricePerKg,
            quantity_kg: item.quantityKg,
          })),
        },
      },
      {
        onSuccess: (order) => {
          setConfirmedAddress(finalAddress);
          setConfirmedPhone(deliveryPhone);
          setOrderId((order as { id: number }).id);
          setOrdered(true);
          onClearCart();
        },
      }
    );
  };

  // ── ORDER SUCCESS SCREEN ─────────────────────────────────────────────────────
  if (ordered) {
    const slot = DELIVERY_SLOTS.find(s => s.id === selectedSlot);
    return (
      <div className="slide-up" style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "28px 20px", background: "#F7F4EF",
      }}>
        {/* Success icon */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "linear-gradient(135deg,#2D6A2D,#4A9B4A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 38, marginBottom: 16,
          boxShadow: "0 8px 24px rgba(45,106,45,0.3)",
        }}>✅</div>

        <div style={{ fontWeight: 800, fontSize: 22, color: "#1C1C1C", marginBottom: 4 }}>
          Order हो गया!
        </div>
        <div style={{ fontSize: 13, color: "#777", fontWeight: 600, marginBottom: 20 }}>
          Order ID: <span style={{ color: "#2D6A2D", fontWeight: 800 }}>#{orderId}</span>
        </div>

        {/* Confirmation details card */}
        <div style={{
          width: "100%", maxWidth: 360,
          background: "white", borderRadius: 20,
          border: "1.5px solid #E5DDD0",
          boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
          overflow: "hidden",
          marginBottom: 20,
        }}>
          {/* Seller message */}
          <div style={{
            background: "linear-gradient(135deg,#2D6A2D,#4A9B4A)",
            padding: "14px 18px", textAlign: "center",
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>📞</div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>
              {SELLER_NAME} जल्द आएंगे
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>
              आपसे जल्द संपर्क किया जाएगा
            </div>
          </div>

          {/* Details rows */}
          <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            {slot && (
              <DetailRow icon="🕐" label="Delivery Time" value={`${slot.label} · ${slot.time}`} valueColor="#b45309" />
            )}
            <DetailRow icon="📱" label="Phone" value={`+91 ${confirmedPhone}`} />
            <DetailRow icon="📍" label="Delivery Address" value={confirmedAddress} />
            <DetailRow icon="💰" label="Payment" value="Delivery पर (Cash)" valueColor="#15803d" />
          </div>
        </div>

        <button onClick={onOrderSuccess} className="btn-press" style={{
          background: "linear-gradient(135deg,#2D6A2D,#4A9B4A)",
          color: "white", border: "none",
          borderRadius: 16, padding: "14px 40px",
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700, fontSize: 15, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(45,106,45,0.3)",
        }}>
          Orders देखें →
        </button>
      </div>
    );
  }

  // ── EMPTY CART ────────────────────────────────────────────────────────────────
  if (!items.length) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, background: "#F7F4EF", textAlign: "center" }}>
        <div style={{ fontSize: 56 }}>🛒</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#777", marginTop: 16 }}>Cart खाली है</div>
        <div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>Products tab से items add करो</div>
      </div>
    );
  }

  // ── MAIN CART ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F7F4EF" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "16px 16px 14px", flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#1C1C1C" }}>🛒 Cart</div>
        <div style={{ fontSize: 12, color: "#777", fontWeight: 500, marginTop: 2 }}>
          {customer.name} · {customer.village}
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 16px 8px" }}>

        {/* ── Cart Items ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {items.map(([key, item]) => (
            <div key={key} style={{
              background: "white", borderRadius: 16, padding: "14px",
              border: "1.5px solid #E5DDD0", boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{item.productEmoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1C1C1C" }}>
                        {item.productName} · {item.varietyName}
                      </div>
                      <div style={{ fontSize: 12, color: "#777" }}>
                        {formatINR(item.pricePerKg)}/kg × {item.quantityKg}kg
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#2D6A2D" }}>
                    {formatINR(item.pricePerKg * item.quantityKg)}
                  </div>
                  <button onClick={() => onCartChange(key, null)} style={{
                    background: "none", border: "none", color: "#dc2626", fontSize: 12,
                    cursor: "pointer", fontFamily: "'Baloo 2', sans-serif", fontWeight: 600,
                  }}>हटाओ ✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Order Details Confirm करें ─────────────────────────────────── */}
        <div style={{
          background: "white", borderRadius: 16, padding: 16, marginBottom: 14,
          border: `1.5px solid ${(showAddrError || showPhoneError) ? "#dc2626" : "#BBF7D0"}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C", marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <span>📋</span><span>Order Details Confirm करें</span>
          </div>

          {/* Phone Number */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelSty}>📱 फ़ोन नंबर (Delivery के लिए)</label>
            <div style={{ display: "flex", gap: 0 }}>
              <div style={{
                padding: "10px 12px", background: "#F7F4EF",
                border: `1px solid ${showPhoneError ? "#dc2626" : "#E5DDD0"}`,
                borderRight: "none", borderRadius: "10px 0 0 10px",
                fontSize: 13, color: "#777", display: "flex", alignItems: "center", flexShrink: 0,
              }}>+91</div>
              <input
                value={deliveryPhone}
                onChange={e => { setDeliveryPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setShowPhoneError(false); }}
                type="tel" inputMode="numeric" placeholder="10 अंकों का नंबर"
                style={{
                  flex: 1, padding: "10px 12px",
                  border: `1px solid ${showPhoneError ? "#dc2626" : "#E5DDD0"}`,
                  borderRadius: "0 10px 10px 0", fontSize: 13,
                  fontFamily: "'Baloo 2', sans-serif", outline: "none",
                  background: "white", color: "#1C1C1C",
                }}
              />
            </div>
            {showPhoneError && (
              <div style={errorTextSty}>⚠️ सही 10-digit नंबर डालें</div>
            )}
          </div>

          {/* Full Address */}
          <div style={{ marginBottom: 14 }}>
            <label style={fieldLabelSty}>🏠 पूरा पता <span style={{ color: "#dc2626" }}>*</span></label>
            <textarea
              ref={addrRef}
              value={deliveryAddr}
              onChange={e => { setDeliveryAddr(e.target.value); setShowAddrError(false); }}
              placeholder="जैसे: Ward No. 3, Ramesh Nagar, Pichor"
              rows={3}
              style={{
                width: "100%", padding: "10px 12px",
                border: `1.5px solid ${showAddrError ? "#dc2626" : "#E5DDD0"}`,
                borderRadius: 10, fontSize: 13,
                fontFamily: "'Baloo 2', sans-serif", outline: "none",
                background: showAddrError ? "#FFF5F5" : "white",
                color: "#1C1C1C", resize: "none", boxSizing: "border-box",
                lineHeight: 1.5,
              }}
            />
            {showAddrError && (
              <div style={errorTextSty}>⚠️ पता डालना ज़रूरी है</div>
            )}
          </div>

          {/* Landmark */}
          <div>
            <label style={fieldLabelSty}>🏛️ Landmark <span style={{ color: "#aaa", fontWeight: 500 }}>(optional)</span></label>
            <input
              value={landmark}
              onChange={e => setLandmark(e.target.value)}
              placeholder="जैसे: शिव मंदिर के पास, नीला मकान"
              style={{
                width: "100%", padding: "10px 12px",
                border: "1px solid #E5DDD0", borderRadius: 10, fontSize: 13,
                fontFamily: "'Baloo 2', sans-serif", outline: "none",
                background: "white", color: "#1C1C1C", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* ── Delivery Slot ──────────────────────────────────────────────── */}
        <div style={{
          background: "white", borderRadius: 16, padding: 16, marginBottom: 14,
          border: showSlotError ? "1.5px solid #dc2626" : "1.5px solid #E5DDD0",
        }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1C1C1C", marginBottom: 4 }}>
            🕐 Delivery Time चुनें
          </div>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 12, fontWeight: 500 }}>
            {SELLER_NAME} किस समय आए आपके पास?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DELIVERY_SLOTS.map(slot => {
              const selected = selectedSlot === slot.id;
              const colors = SLOT_COLORS[slot.id] || SLOT_COLORS.morning;
              return (
                <button key={slot.id} onClick={() => { setSelectedSlot(slot.id); setShowSlotError(false); }}
                  className="btn-press" style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderRadius: 14,
                    background: selected ? colors.bg : "#FAFAF8",
                    border: `2px solid ${selected ? colors.border : "#E5DDD0"}`,
                    cursor: "pointer", fontFamily: "'Baloo 2',sans-serif", textAlign: "left",
                    transition: "all 0.15s",
                  }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: selected ? colors.text : "#1C1C1C" }}>
                      {slot.label}
                    </div>
                    <div style={{ fontSize: 12, color: selected ? colors.text : "#777", fontWeight: 600 }}>
                      {slot.time}
                    </div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: `2px solid ${selected ? colors.border : "#ccc"}`,
                    background: selected ? colors.text : "white",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {selected && <span style={{ color: "white", fontSize: 12, fontWeight: 900 }}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {showSlotError && (
            <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginTop: 8 }}>
              ⚠️ कृपया delivery time चुनें
            </div>
          )}
        </div>

        {/* ── Order Summary & CTA ────────────────────────────────────────── */}
        <div style={{ background: "linear-gradient(135deg,#2D6A2D,#4A9B4A)", borderRadius: 20, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 8 }}>
            <span>{items.length} items</span>
            <span>{formatINR(total)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "white", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            <span>Delivery</span><span style={{ color: "#86efac" }}>Free ✓</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "white", fontSize: 19, fontWeight: 800, marginBottom: 20 }}>
            <span>Total</span><span>{formatINR(total)}</span>
          </div>
          <button onClick={placeOrder} disabled={createOrder.isPending} className="btn-press" style={{
            width: "100%", background: "#F59E0B", color: "#1C1C1C", border: "none",
            borderRadius: 16, padding: "14px", fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800, fontSize: 16, cursor: createOrder.isPending ? "default" : "pointer",
          }}>
            {createOrder.isPending ? "Order हो रहा है..." : "Order करो →"}
          </button>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, textAlign: "center", marginTop: 8 }}>
            {selectedSlot
              ? `${DELIVERY_SLOTS.find(s => s.id === selectedSlot)?.label} ${DELIVERY_SLOTS.find(s => s.id === selectedSlot)?.time} · Payment on Delivery`
              : "↑ पहले delivery time चुनें"
            }
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, valueColor }: {
  icon: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, color: valueColor || "#1C1C1C", fontWeight: 700, lineHeight: 1.4 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

const fieldLabelSty: React.CSSProperties = {
  display: "block",
  fontSize: 11, fontWeight: 700, color: "#555",
  marginBottom: 6, fontFamily: "'Baloo 2', sans-serif",
  textTransform: "uppercase", letterSpacing: 0.4,
};

const errorTextSty: React.CSSProperties = {
  fontSize: 11, color: "#dc2626", fontWeight: 700,
  marginTop: 5, fontFamily: "'Baloo 2', sans-serif",
};
