import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Block student accounts from signing in as organisations
      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (studentProfile) {
        setError('This email is registered as a Student account. Please use the InternLink mobile app to sign in.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
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
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26,175,107,0.08) 0%, transparent 70%);
          top: -200px;
          right: -200px;
          pointer-events: none;
        }
        .auth-bg::after {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59,107,212,0.12) 0%, transparent 70%);
          bottom: -100px;
          left: -100px;
          pointer-events: none;
        }
        .auth-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 40px 36px;
          backdrop-filter: blur(20px);
          position: relative;
          z-index: 1;
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
        }
        .auth-input-wrap {
          position: relative;
        }
        .auth-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 13px 16px 13px 44px;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.3); }
        .auth-input:focus {
          border-color: #1aaf6b;
          background: rgba(26,175,107,0.06);
        }
        .auth-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.35);
          pointer-events: none;
        }
        .auth-input-icon-right {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          display: flex;
          align-items: center;
        }
        .auth-input-icon-right:hover { color: rgba(255,255,255,0.7); }
        .auth-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          background: #1aaf6b;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .auth-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0;
        }
        .auth-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.1);
        }
        .auth-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(248,113,113,0.12);
          border: 1px solid rgba(248,113,113,0.25);
          border-radius: 10px;
          padding: 12px 14px;
          color: #fca5a5;
          font-size: 13px;
        }
        .badge-org {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(26,175,107,0.15);
          border: 1px solid rgba(26,175,107,0.3);
          border-radius: 20px;
          padding: 4px 12px;
          color: #1aaf6b;
          font-size: 12px;
          font-weight: 600;
        }
      `}</style>

      <div className="auth-bg">
        <div className="auth-card">
          {/* Logo & Brand */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#1e3a7a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                border: "1.5px solid rgba(255,255,255,0.12)",
              }}
            >
              <img src="/images/logo.png" alt="InternLink" style={{ width: 32, height: 32, objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="badge-org" style={{ margin: "0 auto 12px" }}>
              Organisation Portal
            </div>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
              Welcome Back
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, margin: 0 }}>
              Sign in to manage your internship listings
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
              <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                EMAIL ADDRESS
              </label>
              <div className="auth-input-wrap">
                <Mail className="auth-input-icon" style={{ width: 17, height: 17 }} />
                <input
                  id="login-email"
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

            <div>
              <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                PASSWORD
              </label>
              <div className="auth-input-wrap">
                <Lock className="auth-input-icon" style={{ width: 17, height: 17 }} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  style={{ paddingRight: 44 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-input-icon-right"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                </button>
              </div>
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <Link to="/forgot-password" style={{ color: "#1aaf6b", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>
            </div>

            <button id="login-submit" type="submit" className="auth-btn" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? (
                <>
                  <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>OR</span>
            <div className="auth-divider-line" />
          </div>

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 14, margin: 0 }}>
            New organisation?{" "}
            <Link to="/signup" style={{ color: "#1aaf6b", fontWeight: 700, textDecoration: "none" }}>
              Create an account
            </Link>
          </p>

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </>
  );
}
