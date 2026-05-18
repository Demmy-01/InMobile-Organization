import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, Building2, User, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"account" | "org">("account");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    hrManagerName: "",
    organizationName: "",
    industry: "",
    website: "",
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setStep("org");
  };

  // Uses SECURITY DEFINER RPC — bypasses RLS, works before email is confirmed
  const saveOrgProfileViaRpc = async (userId: string) => {
    const { error } = await supabase.rpc("upsert_org_profile", {
      p_id:       userId,
      p_name:     form.organizationName || "My Organisation",
      p_email:    form.email,
      p_hr_name:  form.hrManagerName || null,
      p_industry: form.industry || null,
      p_website:  form.website || null,
    });
    return error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Block student accounts from registering as organisations
      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('email', form.email)
        .maybeSingle();

      if (studentProfile) {
        setError('This email is already registered as a Student account. Please use the InternLink mobile app.');
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { role: "organization" },
        },
      });

      if (signUpError) throw signUpError;

      const userId = data.user?.id;
      if (!userId) throw new Error("Failed to get user ID after sign up.");

      // Always save to localStorage as backup for the OTP step
      localStorage.setItem(
        "pending_org_profile",
        JSON.stringify({
          user_id: userId,
          organization_name: form.organizationName,
          contact_email: form.email,
          hr_manager_name: form.hrManagerName || null,
          industry: form.industry || null,
          website: form.website || null,
        })
      );

      // Save immediately via SECURITY DEFINER RPC — this bypasses RLS
      // and works even though the email is not confirmed yet.
      const rpcError = await saveOrgProfileViaRpc(userId);
      if (rpcError) {
        console.error("[Signup] RPC profile save error:", rpcError.message);
        // Non-fatal: ConfirmOtp will retry via localStorage
      } else {
        // Success — clear the backup since DB already has the data
        localStorage.removeItem("pending_org_profile");
      }

      navigate(`/confirm-otp?email=${encodeURIComponent(form.email)}`);
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.toLowerCase().includes("database error")) {
        setError("Account creation failed due to a server error. Please try again shortly.");
      } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("user already registered")) {
        setError("An account with this email already exists. Please sign in instead.");
      } else {
        setError(msg || "Sign up failed. Please try again.");
      }
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
    padding: "13px 16px 13px 44px",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s, background 0.2s",
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
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26,175,107,0.08) 0%, transparent 70%);
          top: -200px; right: -200px;
          pointer-events: none;
        }
        .auth-bg::after {
          content: '';
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59,107,212,0.12) 0%, transparent 70%);
          bottom: -100px; left: -100px;
          pointer-events: none;
        }
        .auth-card {
          width: 100%;
          max-width: 460px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 36px;
          backdrop-filter: blur(20px);
          position: relative;
          z-index: 1;
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
        }
        .auth-input-wrap { position: relative; }
        .auth-input-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.35);
          pointer-events: none;
        }
        .auth-input-icon-right {
          position: absolute;
          right: 14px; top: 50%;
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
        .auth-input::placeholder { color: rgba(255,255,255,0.3); }
        .auth-input:focus { border-color: #1aaf6b !important; background: rgba(26,175,107,0.06) !important; }
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
        .auth-btn-outline {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          background: transparent;
          color: rgba(255,255,255,0.7);
          font-weight: 600;
          font-size: 15px;
          border: 1.5px solid rgba(255,255,255,0.15);
          cursor: pointer;
          transition: background 0.2s;
        }
        .auth-btn-outline:hover { background: rgba(255,255,255,0.06); }
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
        .step-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          transition: background 0.3s, width 0.3s;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="auth-bg">
        <div className="auth-card">
          {/* Brand */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1e3a7a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", border: "1.5px solid rgba(255,255,255,0.12)" }}>
              <img src="/images/logo.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="badge-org" style={{ margin: "0 auto 12px" }}>Organisation Portal</div>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
              {step === "account" ? "Create Account" : "Organisation Details"}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
              {step === "account" ? "Set up your login credentials" : "Tell us about your organisation"}
            </p>
          </div>

          {/* Progress dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
            <div className="step-dot" style={{ background: "#1aaf6b", width: step === "account" ? 24 : 8, borderRadius: 4 }} />
            <div className="step-dot" style={{ background: step === "org" ? "#1aaf6b" : "rgba(255,255,255,0.2)" }} />
          </div>

          {error && (
            <div className="auth-error" style={{ marginBottom: 16 }}>
              <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {step === "account" ? (
            <form onSubmit={handleNext} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>EMAIL ADDRESS</label>
                <div className="auth-input-wrap">
                  <Mail className="auth-input-icon" style={{ width: 17, height: 17 }} />
                  <input className="auth-input" style={fieldStyle} type="email" placeholder="hr@yourcompany.com" value={form.email} onChange={(e) => update("email", e.target.value)} required autoComplete="email" />
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>HR MANAGER NAME</label>
                <div className="auth-input-wrap">
                  <User className="auth-input-icon" style={{ width: 17, height: 17 }} />
                  <input className="auth-input" style={fieldStyle} type="text" placeholder="Full name" value={form.hrManagerName} onChange={(e) => update("hrManagerName", e.target.value)} required />
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>PASSWORD</label>
                <div className="auth-input-wrap">
                  <Lock className="auth-input-icon" style={{ width: 17, height: 17 }} />
                  <input className="auth-input" style={{ ...fieldStyle, paddingRight: 44 }} type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" value={form.password} onChange={(e) => update("password", e.target.value)} required autoComplete="new-password" />
                  <button type="button" className="auth-input-icon-right" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>CONFIRM PASSWORD</label>
                <div className="auth-input-wrap">
                  <Lock className="auth-input-icon" style={{ width: 17, height: 17 }} />
                  <input className="auth-input" style={fieldStyle} type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required autoComplete="new-password" />
                </div>
              </div>

              <button type="submit" className="auth-btn" style={{ marginTop: 6 }}>Next →</button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>ORGANISATION NAME</label>
                <div className="auth-input-wrap">
                  <Building2 className="auth-input-icon" style={{ width: 17, height: 17 }} />
                  <input className="auth-input" style={fieldStyle} type="text" placeholder="e.g. GTBank, Dangote Group" value={form.organizationName} onChange={(e) => update("organizationName", e.target.value)} required />
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>INDUSTRY</label>
                <div className="auth-input-wrap">
                  <Building2 className="auth-input-icon" style={{ width: 17, height: 17 }} />
                  <select
                    className="auth-input"
                    style={{ ...fieldStyle, cursor: "pointer", paddingLeft: 44 }}
                    value={form.industry}
                    onChange={(e) => update("industry", e.target.value)}
                  >
                    <option value="">Select industry</option>
                    {["Banking & Finance", "Technology", "Oil & Gas", "Telecommunications", "Healthcare", "Manufacturing", "Retail", "Education", "Other"].map((i) => (
                      <option key={i} value={i} style={{ background: "#0d1b3e" }}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>WEBSITE (OPTIONAL)</label>
                <div className="auth-input-wrap">
                  <Building2 className="auth-input-icon" style={{ width: 17, height: 17 }} />
                  <input className="auth-input" style={fieldStyle} type="url" placeholder="https://yourcompany.com" value={form.website} onChange={(e) => update("website", e.target.value)} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button type="button" className="auth-btn-outline" onClick={() => setStep("account")}>← Back</button>
                <button type="submit" className="auth-btn" disabled={loading} style={{ flex: 1 }}>
                  {loading ? (
                    <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> Creating...</>
                  ) : "Create Account"}
                </button>
              </div>
            </form>
          )}

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "20px 0 0" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#1aaf6b", fontWeight: 700, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
