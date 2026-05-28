import { useState, useRef, useEffect } from "react";
import { useCustomerAuth } from "@workspace/api-client-react";
import { setCustomerSession, VILLAGES, type CustomerSession } from "../lib/utils";

interface CustomerAuthProps {
  onSuccess: (customer: CustomerSession) => void;
}

type Step = "login" | "register" | "otp";

export function CustomerAuth({ onSuccess }: CustomerAuthProps) {
  const [step, setStep] = useState<Step>("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpFrom, setOtpFrom] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const authMutation = useCustomerAuth();
  const otpString = otp.join("");

  // Countdown timer when on OTP step
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
        setError(data.error || "OTP भेजने में error आई — फिर try करें");
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

  const goToOtp = (from: "login" | "register") => {
    setOtpFrom(from);
    setOtp(["", "", "", ""]);
    setError("");
    setStep("otp");
    setTimeout(() => otpRefs[0].current?.focus(), 80);
  };

  const handleLoginProceed = async () => {
    if (!/^\d{10}$/.test(phone)) { setError("10 अंकों का फोन नंबर डालें"); return; }
    const ok = await callSendOtp(phone);
    if (ok) goToOtp("login");
  };

  const handleRegisterProceed = async () => {
    if (!name.trim()) { setError("अपना नाम डालें"); return; }
    if (!/^\d{10}$/.test(phone)) { setError("10 अंकों का फोन नंबर डालें"); return; }
    if (!village) { setError("गांव चुनें"); return; }
    const ok = await callSendOtp(phone);
    if (ok) goToOtp("register");
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

  const handleOtpConfirm = () => {
    if (otpString.length !== 4) { setError("4 अंकों का OTP डालें"); return; }
    setError("");

    const payload = otpFrom === "register"
      ? { data: { phone, otp: otpString, name: name.trim(), village } }
      : { data: { phone, otp: otpString } };

    authMutation.mutate(payload as any, {
      onSuccess: (result) => {
        const c = result.customer as {
          id: number; name: string; phone: string; village: string;
          address?: string | null; lat?: number | null; lng?: number | null;
        };
        const session: CustomerSession = {
          id: c.id, name: c.name, phone: c.phone, village: c.village,
          address: c.address || undefined,
          lat: c.lat || undefined,
          lng: c.lng || undefined,
        };
        setCustomerSession(session);
        onSuccess(session);
      },
      onError: (err: any) => {
        const code = err?.response?.data?.code ?? err?.data?.code;
        const msg = err?.response?.data?.error ?? err?.data?.error ?? "";
        if (code === "NOT_REGISTERED" || msg.includes("NOT_REGISTERED")) {
          setOtp(["", "", "", ""]);
          setStep("register");
          setError("यह नंबर registered नहीं है — कृपया register करें।");
        } else if (code === "OTP_EXPIRED") {
          setError("OTP expire हो गया — Resend करें");
        } else if (code === "WRONG_OTP") {
          setError("OTP गलत है — दोबारा check करें");
          setOtp(["", "", "", ""]);
          setTimeout(() => otpRefs[0].current?.focus(), 60);
        } else {
          setError(msg || "कोई error आई — दोबारा कोशिश करें");
        }
      },
    });
  };

  const handleOtpInput = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0a1f10" }}>
      {/* Animated floating grain particles + light blobs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {AUTH_PARTICLES.map((p, i) => (
          <div key={i} className="grain-particle" style={{
            ["--op" as string]: p.opacity,
            left: p.x + "%",
            width: p.size,
            height: p.size,
            animationDuration: p.dur + "s",
            animationDelay: p.delay + "s",
            background: p.gold
              ? `rgba(245,158,11,${p.opacity})`
              : p.emerald
              ? `rgba(16,185,129,${p.opacity})`
              : `rgba(74,155,74,${p.opacity})`,
            borderRadius: p.isBlob ? "50%" : p.size > 12 ? "35%" : "50%",
            filter: p.isBlob ? "blur(22px)" : p.size > 12 ? "blur(2px)" : "none",
            position: "absolute",
            bottom: "-80px",
          }} />
        ))}
      </div>

      {/* Subtle vignette overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 60%, transparent 30%, rgba(8,20,12,0.7) 100%)",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2,
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 20px",
        overflowY: "auto",
      }}>
        {/* Logo */}
        <div className="splash-fade" style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 8,
            filter: "drop-shadow(0 2px 12px rgba(245,158,11,0.6))" }}>🌾</div>
          <div style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 38,
            color: "white", lineHeight: 1, letterSpacing: -1,
          }}>
            Grai<span style={{ color: "#F59E0B" }}>no</span>
          </div>
          <div style={{
            fontFamily: "'Baloo 2', sans-serif", fontSize: 12,
            color: "rgba(212,175,55,0.9)", fontWeight: 600, marginTop: 4, letterSpacing: 0.5,
          }}>
            हर किसान, हमारा वादा
          </div>
        </div>

        {/* Radial glow pulse behind card */}
        <div style={{
          position: "absolute",
          width: 320, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.18) 0%, rgba(45,106,45,0.12) 50%, transparent 75%)",
          filter: "blur(32px)",
          animation: "glowPulse 4s ease-in-out infinite alternate",
          pointerEvents: "none", zIndex: 1,
        }} />

        {/* ── STEP: LOGIN ──────────────────────────────────────────────── */}
        {step === "login" && (
          <div className="slide-up" style={{ ...cardSty, zIndex: 2 }}>
            <div style={stepTitleSty}>Phone से Login करें</div>
            <div style={stepSubSty}>अपना नंबर डालें, OTP आएगा</div>

            <div style={{ marginBottom: 16 }}>
              <div style={labelSty}>Phone Number</div>
              <div style={{ display: "flex", gap: 0 }}>
                <div style={{
                  ...glassSty, width: "auto", padding: "12px 12px",
                  borderRight: "none", borderRadius: "12px 0 0 12px",
                  color: "rgba(255,255,255,0.7)", fontSize: 14,
                  display: "flex", alignItems: "center", flexShrink: 0,
                  background: "rgba(255,255,255,0.05)",
                }}>+91</div>
                <input
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                  placeholder="10 अंकों का नंबर"
                  type="tel" inputMode="numeric"
                  onKeyDown={e => e.key === "Enter" && handleLoginProceed()}
                  style={{ ...glassSty, borderRadius: "0 12px 12px 0", flex: 1 }}
                  autoFocus
                />
              </div>
            </div>

            {error && <ErrorMsg msg={error} />}

            <GoldBtn onClick={handleLoginProceed} label="OTP भेजें →" loading={isSending} />

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "'Baloo 2', sans-serif" }}>
                नया हैं?{" "}
              </span>
              <button
                onClick={() => { setError(""); setStep("register"); }}
                style={{
                  background: "none", border: "none", padding: 0,
                  color: "#F59E0B", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'Baloo 2', sans-serif",
                  textDecoration: "underline",
                }}
              >
                Register करें
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: REGISTER ───────────────────────────────────────────── */}
        {step === "register" && (
          <div className="slide-up" style={{ ...cardSty, zIndex: 2 }}>
            <div style={stepTitleSty}>नया Account बनाएं</div>
            <div style={stepSubSty}>एक बार details भरें, फिर OTP से login</div>

            <GlassInput label="आपका पूरा नाम *" value={name}
              onChange={v => { setName(v); setError(""); }} placeholder="जैसे: Ramesh Kumar" />

            <div style={{ marginBottom: 14 }}>
              <div style={labelSty}>Phone Number *</div>
              <div style={{ display: "flex", gap: 0 }}>
                <div style={{
                  ...glassSty, width: "auto", padding: "12px 12px",
                  borderRight: "none", borderRadius: "12px 0 0 12px",
                  color: "rgba(255,255,255,0.7)", fontSize: 14,
                  display: "flex", alignItems: "center", flexShrink: 0,
                  background: "rgba(255,255,255,0.05)",
                }}>+91</div>
                <input
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                  placeholder="10 अंकों का नंबर"
                  type="tel" inputMode="numeric"
                  style={{ ...glassSty, borderRadius: "0 12px 12px 0", flex: 1 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={labelSty}>गांव चुनें *</div>
              <select value={village} onChange={e => { setVillage(e.target.value); setError(""); }} style={glassSty}>
                <option value="" style={{ background: "#1B4332", color: "white" }}>-- गांव select करो --</option>
                {VILLAGES.map(v => (
                  <option key={v} value={v} style={{ background: "#1B4332", color: "white" }}>{v}</option>
                ))}
              </select>
            </div>

            {error && <ErrorMsg msg={error} />}

            <GoldBtn onClick={handleRegisterProceed} label="OTP भेजें →" loading={isSending} />

            <BackBtn onClick={() => { setError(""); setStep("login"); }} label="← Login करें" />
          </div>
        )}

        {/* ── STEP: OTP ────────────────────────────────────────────────── */}
        {step === "otp" && (
          <div className="slide-up" style={{ ...cardSty, zIndex: 2 }}>
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
              <div style={stepTitleSty}>OTP डालें</div>
              <div style={{ ...stepSubSty, lineHeight: 1.5 }}>
                <span style={{ color: "rgba(255,255,255,0.45)" }}>+91 </span>
                <span style={{ color: "#F59E0B", fontWeight: 700 }}>{phone}</span>
                <span style={{ color: "rgba(255,255,255,0.45)" }}> पर भेजा गया</span>
              </div>
            </div>

            {/* 4-box OTP input */}
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
                    width: 58, height: 64,
                    background: digit ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.08)",
                    border: digit ? "1.5px solid rgba(245,158,11,0.6)" : "1.5px solid rgba(255,255,255,0.18)",
                    borderRadius: 14,
                    color: "white",
                    fontSize: 28, fontWeight: 800,
                    fontFamily: "'Baloo 2', sans-serif",
                    textAlign: "center",
                    outline: "none",
                    transition: "all 0.15s ease",
                    caretColor: "#F59E0B",
                  }}
                />
              ))}
            </div>

            {error && <ErrorMsg msg={error} />}

            <GoldBtn
              onClick={handleOtpConfirm}
              label="Confirm करें ✓"
              loading={authMutation.isPending}
              disabled={otpString.length !== 4}
            />

            {/* Resend OTP */}
            <div style={{ textAlign: "center", marginTop: 14 }}>
              {resendCooldown > 0 ? (
                <div style={{
                  fontSize: 12, color: "rgba(255,255,255,0.38)",
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 600,
                }}>
                  OTP नहीं मिला? {resendCooldown}s बाद Resend करें
                </div>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={isSending}
                  style={{
                    background: "none", border: "none",
                    color: isSending ? "rgba(245,158,11,0.4)" : "#F59E0B",
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

            <BackBtn
              onClick={() => {
                setError("");
                setOtp(["", "", "", ""]);
                setStep(otpFrom === "register" ? "register" : "login");
              }}
              label="← वापस जाएं"
            />
          </div>
        )}

        <div style={{
          marginTop: 20, textAlign: "center", fontSize: 12,
          color: "rgba(255,255,255,0.3)", fontFamily: "'Baloo 2', sans-serif", fontWeight: 500,
        }}>
          Pichor, Bamori और 8 गांवों में delivery
        </div>
      </div>
    </div>
  );
}

function GlassInput({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={labelSty}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} type={type} style={glassSty} />
    </div>
  );
}

function GoldBtn({ onClick, label, loading, disabled }: {
  onClick: () => void; label: string; loading?: boolean; disabled?: boolean;
}) {
  const isDisabled = loading || disabled;
  return (
    <button onClick={onClick} disabled={isDisabled} className="btn-press" style={{
      width: "100%",
      background: isDisabled ? "rgba(245,158,11,0.4)" : "linear-gradient(135deg,#F59E0B,#D97706)",
      color: "#1B4332", border: "none",
      borderRadius: 14, padding: "14px",
      fontFamily: "'Baloo 2', sans-serif",
      fontSize: 16, fontWeight: 800,
      cursor: isDisabled ? "not-allowed" : "pointer",
      boxShadow: isDisabled ? "none" : "0 4px 16px rgba(245,158,11,0.35)",
      transition: "all 0.15s",
    }}>
      {loading ? "OTP भेजा जा रहा है..." : label}
    </button>
  );
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", color: "rgba(255,255,255,0.45)",
      fontSize: 13, cursor: "pointer", fontFamily: "'Baloo 2', sans-serif",
      fontWeight: 600, marginTop: 12, display: "block", width: "100%", textAlign: "center",
    }}>
      {label}
    </button>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div style={{
      color: "#fca5a5", fontSize: 12, marginBottom: 12,
      fontFamily: "'Baloo 2', sans-serif", fontWeight: 600,
      background: "rgba(239,68,68,0.1)", borderRadius: 8,
      padding: "8px 10px", border: "1px solid rgba(239,68,68,0.2)",
    }}>
      {msg}
    </div>
  );
}

const cardSty: React.CSSProperties = {
  background: "rgba(255,255,255,0.09)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  borderRadius: 24,
  padding: "24px 22px",
  width: "100%",
  maxWidth: 360,
  border: "1px solid rgba(255,255,255,0.13)",
  boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
};

const stepTitleSty: React.CSSProperties = {
  fontFamily: "'Baloo 2', sans-serif", fontWeight: 800,
  fontSize: 18, color: "white", marginBottom: 4,
};

const stepSubSty: React.CSSProperties = {
  fontSize: 12, color: "rgba(255,255,255,0.5)",
  marginBottom: 20, fontFamily: "'Baloo 2', sans-serif",
};

const labelSty: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)",
  marginBottom: 6, fontFamily: "'Baloo 2', sans-serif",
  textTransform: "uppercase", letterSpacing: 0.5,
};

const glassSty: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  fontSize: 14, fontFamily: "'Baloo 2', sans-serif", outline: "none",
  color: "white", background: "rgba(255,255,255,0.08)", boxSizing: "border-box",
};

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const AUTH_PARTICLES = Array.from({ length: 45 }, (_, i) => {
  const r = (offset: number) => seededRand(i * 7 + offset);
  const isBlob = i >= 25;
  if (isBlob) {
    return {
      x: r(0) * 90 + 5, size: Math.floor(r(1) * 44) + 38,
      dur: r(2) * 18 + 18, delay: r(3) * 12,
      gold: r(4) > 0.55, emerald: r(4) <= 0.3,
      opacity: r(5) * 0.045 + 0.03, isBlob: true,
    };
  }
  return {
    x: r(0) * 100, size: Math.floor(r(1) * 13) + 4,
    dur: r(2) * 7 + 6, delay: r(3) * 8,
    gold: i % 3 === 0, emerald: i % 7 === 0,
    opacity: r(4) * 0.18 + 0.07, isBlob: false,
  };
});
