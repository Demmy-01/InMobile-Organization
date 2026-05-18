import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends the user back with an access_token + refresh_token in the
  // URL hash fragment after they click the reset link in their email.
  // We must exchange those tokens for an active session before we can call updateUser.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setError("Invalid or expired reset link. Please request a new one.");
      return;
    }

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (type !== "recovery" || !accessToken || !refreshToken) {
      setError("Invalid or expired reset link. Please request a new one.");
      return;
    }

    // Set the session so supabase client is authenticated for updateUser
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError("Session error: " + sessionError.message);
        } else {
          setSessionReady(true);
          // Clear the hash so it isn't accidentally re-used
          window.history.replaceState(null, "", window.location.pathname);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 14,
    outline: "none",
    width: "100%",
    padding: "13px 44px 13px 16px",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s, background 0.2s",
  };

  return (
    <>
      <style>{`
        .auth-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #040d23 0%, #0d1b3e 45%, #0f2a5c 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; position: relative; overflow: hidden;
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
          width: 100%; max-width: 440px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px; padding: 40px 36px;
          backdrop-filter: blur(20px);
          position: relative; z-index: 1;
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
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
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease; }
        input::placeholder { color: rgba(255,255,255,0.3); }
        input:focus { border-color: #1aaf6b !important; background: rgba(26,175,107,0.06) !important; }
      `}</style>

      <div className="auth-bg">
        <div className="auth-card fade-in">
          {/* Logo + Badge */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1e3a7a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1.5px solid rgba(255,255,255,0.12)" }}>
              <img src="/images/logo.png" alt="InternLink" style={{ width: 32, height: 32, objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="badge-org" style={{ margin: "0 auto 12px" }}>Organisation Portal</div>
          </div>

          {done ? (
            /* ── Success State ── */
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(26,175,107,0.15)", border: "2px solid rgba(26,175,107,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle2 style={{ width: 36, height: 36, color: "#1aaf6b" }} />
              </div>
              <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>Password Updated!</h1>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.7, margin: "0 0 28px" }}>
                Your password has been reset successfully.<br />
                You can now sign in with your new password.
              </p>
              <button className="auth-btn" onClick={() => navigate("/login")}>
                Go to Sign In
              </button>
            </div>
          ) : (
            /* ── Reset Form ── */
            <>
              <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Reset Password</h1>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 24px", lineHeight: 1.6 }}>
                Enter and confirm your new password below.
              </p>

              {error && (
                <div className="auth-error" style={{ marginBottom: 16 }}>
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              {!sessionReady && !error && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "24px 0", color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                  <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                  Verifying reset link...
                </div>
              )}

              {sessionReady && (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>NEW PASSWORD</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        style={fieldStyle}
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPassword((v) => !v)}
                        style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                        {showPassword ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>CONFIRM PASSWORD</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showConfirm ? "text" : "password"}
                        style={fieldStyle}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)}
                        style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                        {showConfirm ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: 4 }}>
                    {loading
                      ? <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> Updating...</>
                      : <><Lock style={{ width: 17, height: 17 }} /> Update Password</>}
                  </button>
                </form>
              )}

              <p style={{ textAlign: "center", marginTop: 20 }}>
                <a href="/login" style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none" }}>
                  ← Back to Sign In
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
