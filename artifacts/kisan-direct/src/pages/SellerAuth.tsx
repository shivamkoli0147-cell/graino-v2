import { useState, useRef, useEffect } from "react";
import { useSellerAuth } from "@workspace/api-client-react";
import { setSellerSession } from "../lib/utils";

interface SellerAuthProps {
  onSuccess: () => void;
}

type Step = "phone" | "otp";

export function SellerAuth({ onSuccess }: SellerAuthProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const authMutation = useSellerAuth();
  const otpString = otp.join("");

  useEffect(() => {
    if (step !== "otp") return;
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const callSendOtp = async (phoneNum: string): Promise<boolean> => {
    setIsSending(true);
    setError("");
    try {
      const resp = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNum }),
      });
      const data = await resp.json() as { error?: string };
      if (!resp.ok) {
        setError(data.error || "OTP भेजने में error आई");
        return false;
      }
      return true;
    } catch {
      setError("Network error — internet check करें");
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) { setError("10 अंकों का फोन नंबर डालें"); return; }
    const ok = await callSendOtp(phone);
    if (ok) {
      setOtp(["", "", "", ""]);
      setError("");
      setStep("otp");
      setTimeout(() => otpRefs[0].current?.focus(), 80);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsSending(true);
    setError("");
    try {
      const resp = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await resp.json() as { error?: string };
      if (!resp.ok) {
        setError(data.error || "OTP दोबारा भेजने में error");
      } else {
        setResendCooldown(30);
        setOtp(["", "", "", ""]);
        setTimeout(() => otpRefs[0].current?.focus(), 80);
      }
    } catch {
      setError("Network error — internet check करें");
    } finally {
      setIsSending(false);
    }
  };

  const handleOtpInput = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 3) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpConfirm = () => {
    if (otpString.length !== 4) { setError("4 अंकों का OTP डालें"); return; }
    setError("");
    authMutation.mutate(
      { data: { phone, otp: otpString } },
      {
        onSuccess: () => { setSellerSession(); onSuccess(); },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? err?.data?.message ?? "";
          setError(msg || "OTP गलत है या expire हो गया");
          setOtp(["", "", "", ""]);
          setTimeout(() => otpRefs[0].current?.focus(), 60);
        },
      }
    );
  };

  return (
    <div className="slide-up" style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F7F4EF" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)", padding: "48px 24px 36px" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌾</div>
        <div style={{ color: "white", fontSize: 26, fontWeight: 800 }}>
          Seller <span style={{ color: "#F59E0B" }}>Dashboard</span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>
          Rohit Mukati · KisanDirect
        </div>
      </div>

      <div style={{ flex: 1, padding: "28px 20px 40px" }}>
        <div style={{
          background: "white", borderRadius: 20, padding: 24,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #E5DDD0",
        }}>
          {/* ── STEP: PHONE ──────────────────────────────────────────── */}
          {step === "phone" && (
            <>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#1C1C1C", marginBottom: 4 }}>
                Seller Login
              </div>
              <div style={{ fontSize: 12, color: "#777", fontWeight: 500, marginBottom: 20 }}>
                अपना seller phone number डालें
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={labelSty}>Seller Phone Number</div>
                <div style={{ display: "flex" }}>
                  <div style={{
                    padding: "11px 12px", background: "#F7F4EF",
                    border: "1.5px solid #E5DDD0", borderRight: "none",
                    borderRadius: "12px 0 0 12px", fontSize: 13, color: "#777",
                    display: "flex", alignItems: "center", flexShrink: 0,
                  }}>+91</div>
                  <input
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                    placeholder="10 अंकों का नंबर"
                    type="tel" inputMode="numeric"
                    onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                    autoFocus
                    style={{ ...iSty, borderRadius: "0 12px 12px 0", flex: 1 }}
                  />
                </div>
              </div>

              {error && <ErrMsg msg={error} />}

              <button
                onClick={handleSendOtp}
                disabled={isSending}
                className="btn-press"
                style={btnSty(isSending)}
              >
                {isSending ? "OTP भेजा जा रहा है..." : "OTP भेजें →"}
              </button>
            </>
          )}

          {/* ── STEP: OTP ────────────────────────────────────────────── */}
          {step === "otp" && (
            <>
              <div style={{ textAlign: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>📱</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#1C1C1C", marginBottom: 4 }}>
                  OTP डालें
                </div>
                <div style={{ fontSize: 12, color: "#777", fontWeight: 500, marginBottom: 20, lineHeight: 1.5 }}>
                  <span>+91 </span>
                  <span style={{ color: "#2D6A2D", fontWeight: 700 }}>{phone}</span>
                  <span> पर OTP भेजा गया</span>
                </div>
              </div>

              {/* 4-box OTP */}
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    value={digit}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onFocus={e => e.target.select()}
                    type="tel" inputMode="numeric" maxLength={1}
                    style={{
                      width: 56, height: 60,
                      border: digit ? "2px solid #2D6A2D" : "1.5px solid #E5DDD0",
                      borderRadius: 14, background: digit ? "#F0FFF0" : "white",
                      color: "#1C1C1C", fontSize: 26, fontWeight: 800,
                      fontFamily: "'Baloo 2', sans-serif",
                      textAlign: "center", outline: "none", transition: "all 0.15s",
                    }}
                  />
                ))}
              </div>

              {error && <ErrMsg msg={error} />}

              <button
                onClick={handleOtpConfirm}
                disabled={authMutation.isPending || otpString.length !== 4}
                className="btn-press"
                style={btnSty(authMutation.isPending || otpString.length !== 4)}
              >
                {authMutation.isPending ? "Verify हो रहा है..." : "Login करें ✓"}
              </button>

              {/* Resend */}
              <div style={{ textAlign: "center", marginTop: 14 }}>
                {resendCooldown > 0 ? (
                  <div style={{ fontSize: 12, color: "#aaa", fontWeight: 600, fontFamily: "'Baloo 2', sans-serif" }}>
                    OTP नहीं मिला? {resendCooldown}s बाद Resend
                  </div>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={isSending}
                    style={{
                      background: "none", border: "none",
                      color: isSending ? "#aaa" : "#2D6A2D",
                      fontSize: 13, fontWeight: 700,
                      cursor: isSending ? "default" : "pointer",
                      fontFamily: "'Baloo 2', sans-serif",
                      textDecoration: "underline",
                    }}
                  >
                    {isSending ? "भेजा जा रहा है..." : "🔄 OTP दोबारा भेजें"}
                  </button>
                )}
              </div>

              <button
                onClick={() => { setStep("phone"); setError(""); setOtp(["", "", "", ""]); }}
                style={{
                  background: "none", border: "none", color: "#aaa",
                  fontSize: 13, cursor: "pointer", fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 600, marginTop: 10, display: "block", width: "100%", textAlign: "center",
                }}
              >
                ← वापस जाएं
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return (
    <div style={{
      color: "#dc2626", fontSize: 12, marginBottom: 14,
      fontFamily: "'Baloo 2', sans-serif", fontWeight: 600,
      background: "#FFF5F5", borderRadius: 8, padding: "8px 10px",
      border: "1px solid #fecaca",
    }}>{msg}</div>
  );
}

const btnSty = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  background: disabled ? "#ccc" : "#1a3d1a",
  color: "white", border: "none",
  borderRadius: 14, padding: "14px",
  fontFamily: "'Baloo 2', sans-serif",
  fontSize: 16, fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
});

const labelSty: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#777",
  marginBottom: 6, fontFamily: "'Baloo 2', sans-serif",
  textTransform: "uppercase", letterSpacing: 0.4,
};

const iSty: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  border: "1.5px solid #E5DDD0",
  fontSize: 14, fontFamily: "'Baloo 2', sans-serif",
  outline: "none", color: "#1C1C1C",
  background: "white", boxSizing: "border-box",
};
