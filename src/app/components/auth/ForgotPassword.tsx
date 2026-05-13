import { useState } from "react";
import { Link } from "react-router";
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export function ForgotPassword() {
  const [stage, setStage] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setStage("sent");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
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
        .auth-input-wrap { position: relative; }
        .auth-input-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.35); pointer-events: none;
        }
        .auth-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 13px 16px 13px 44px;
          color: #fff; font-size: 14px; outline: none;
          transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.3); }
        .auth-input:focus { border-color: #1aaf6b; background: rgba(26,175,107,0.06); }
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
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease; }
      `}</style>

      <div className="auth-bg">
        <div className="auth-card">
          {stage === "email" ? (
            <div className="fade-in">
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(59,107,212,0.15)", border: "1.5px solid rgba(59,107,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Mail style={{ width: 28, height: 28, color: "#3b6fd4" }} />
                </div>
                <div className="badge-org" style={{ margin: "0 auto 12px" }}>Organisation Portal</div>
                <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Forgot Password?</h1>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  Enter your email and we'll send you a<br />link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {error && (
                  <div className="auth-error">
                    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>EMAIL ADDRESS</label>
                  <div className="auth-input-wrap">
                    <Mail className="auth-input-icon" style={{ width: 17, height: 17 }} />
                    <input
                      id="forgot-email"
                      type="email"
                      className="auth-input"
                      placeholder="hr@yourcompany.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button id="forgot-submit" type="submit" className="auth-btn" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? (
                    <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> Sending...</>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <p style={{ textAlign: "center", marginTop: 20 }}>
                <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.45)", fontSize: 13, textDecoration: "none" }}>
                  <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Sign In
                </Link>
              </p>
            </div>
          ) : (
            <div className="fade-in" style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(26,175,107,0.15)", border: "2px solid rgba(26,175,107,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle2 style={{ width: 36, height: 36, color: "#1aaf6b" }} />
              </div>
              <div className="badge-org" style={{ margin: "0 auto 14px" }}>Email Sent!</div>
              <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>Check Your Inbox</h1>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.7, margin: "0 0 28px" }}>
                We've sent a password reset link to<br />
                <span style={{ color: "#1aaf6b", fontWeight: 600 }}>{email}</span>.<br />
                The link expires in 1 hour.
              </p>

              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", marginBottom: 24, textAlign: "left" }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                  📬 Didn't receive it? Check your spam folder or{" "}
                  <button onClick={() => setStage("email")} style={{ background: "none", border: "none", color: "#1aaf6b", cursor: "pointer", fontWeight: 600, fontSize: 12, padding: 0 }}>
                    try a different email
                  </button>.
                </p>
              </div>

              <Link to="/login">
                <button className="auth-btn" style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)" }}>
                  <ArrowLeft style={{ width: 17, height: 17 }} /> Back to Sign In
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
