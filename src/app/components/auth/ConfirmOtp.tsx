import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Mail, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export function ConfirmOtp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleOtpChange = (idx: number, value: string) => {
    const val = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 7) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 7) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (paste.length === 8) {
      setOtp(paste.split(""));
      inputRefs.current[7]?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length < 8) { setError("Please enter the full 8-digit code."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });
      if (error) throw error;

      // Retry profile save if Signup's first attempt failed (localStorage still has data)
      const pending = localStorage.getItem("pending_org_profile");
      if (pending) {
        const raw = JSON.parse(pending);
        const userId = data.user?.id ?? raw.user_id;
        if (userId) {
          const { error: rpcError } = await supabase.rpc("upsert_org_profile", {
            p_id:       userId,
            p_name:     raw.organization_name ?? "My Organisation",
            p_email:    raw.contact_email ?? email,
            p_hr_name:  raw.hr_manager_name ?? null,
            p_industry: raw.industry ?? null,
            p_website:  raw.website ?? null,
          });
          if (rpcError) {
            console.error("[ConfirmOtp] RPC retry failed:", rpcError.message);
          }
        }
        localStorage.removeItem("pending_org_profile");
      }

      // Sign the user out so they log in fresh with their confirmed account
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };



  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || "Could not resend code. Try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <style>{`
        .auth-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #040d23 0%, #0d1b3e 45%, #0f2a5c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        }
        .auth-bg::before {
          content: ''; position: absolute;
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(26,175,107,0.08) 0%, transparent 70%);
          top: -200px; right: -200px; pointer-events: none;
        }
        .auth-bg::after {
          content: ''; position: absolute;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(59,107,212,0.12) 0%, transparent 70%);
          bottom: -100px; left: -100px; pointer-events: none;
        }
        .auth-card {
          width: 100%; max-width: 420px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 40px 36px;
          backdrop-filter: blur(20px);
          position: relative; z-index: 1;
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
        }
        .otp-input {
          width: 40px; height: 50px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          color: #fff;
          font-size: 20px;
          font-weight: 700;
          text-align: center;
          outline: none;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          caret-color: #1aaf6b;
        }
        .otp-input:focus {
          border-color: #1aaf6b;
          background: rgba(26,175,107,0.08);
          transform: scale(1.05);
        }
        .otp-input.filled {
          border-color: rgba(26,175,107,0.6);
          background: rgba(26,175,107,0.06);
        }
        .auth-btn {
          width: 100%; padding: 14px; border-radius: 12px;
          background: #1aaf6b; color: #fff;
          font-weight: 700; font-size: 15px;
          border: none; cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .auth-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-error {
          display: flex; align-items: flex-start; gap: 8px;
          background: rgba(248,113,113,0.12);
          border: 1px solid rgba(248,113,113,0.25);
          border-radius: 10px; padding: 12px 14px;
          color: #fca5a5; font-size: 13px;
        }
        .badge-org {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(26,175,107,0.15);
          border: 1px solid rgba(26,175,107,0.3);
          border-radius: 20px; padding: 4px 12px;
          color: #1aaf6b; font-size: 12px; font-weight: 600;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      <div className="auth-bg">
        <div className="auth-card">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(26,175,107,0.15)", border: "1.5px solid rgba(26,175,107,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Mail style={{ width: 28, height: 28, color: "#1aaf6b" }} />
            </div>
            <div className="badge-org" style={{ margin: "0 auto 12px" }}>Email Verification</div>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Check Your Email</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              We sent an 8-digit verification code to<br />
              <span style={{ color: "#1aaf6b", fontWeight: 600 }}>{email || "your email"}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
            {error && (
              <div className="auth-error" style={{ width: "100%", boxSizing: "border-box" }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* OTP Boxes */}
            <div style={{ display: "flex", gap: 7, justifyContent: "center" }} onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  id={`otp-${idx}`}
                  className={`otp-input${digit ? " filled" : ""}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <button id="otp-verify-btn" type="submit" className="auth-btn" disabled={loading} style={{ width: "100%" }}>
              {loading ? (
                <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> Verifying...</>
              ) : (
                <><CheckCircle2 style={{ width: 18, height: 18 }} /> Verify Email</>
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 8 }}>
              Didn't receive the code?
            </p>
            {resendTimer > 0 ? (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                Resend in <span style={{ color: "#1aaf6b", fontWeight: 700 }}>{resendTimer}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                style={{ background: "none", border: "none", color: "#1aaf6b", fontWeight: 700, fontSize: 14, cursor: "pointer", textDecoration: "underline" }}
              >
                {resending ? "Sending..." : "Resend Code"}
              </button>
            )}
          </div>

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 16 }}>
            <Link to="/login" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
              ← Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
