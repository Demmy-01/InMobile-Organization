import { useState } from "react";
import { useAuth } from "../../../lib/auth-context";
import { ShieldAlert, ShieldX, LogOut, RefreshCw, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export function VerificationPending() {
  const { orgProfile, refreshProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  const isRejected = !!(orgProfile as any)?.rejection_reason;
  const feedback = (orgProfile as any)?.rejection_reason as string | null;

  const handleRefresh = async () => {
    setChecking(true);
    await refreshProfile();
    setTimeout(() => setChecking(false), 600);
  };

  return (
    <div style={outerStyle}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "-200px", left: "50%", transform: "translateX(-50%)",
        width: "500px", height: "400px", borderRadius: "50%",
        background: isRejected ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
        filter: "blur(80px)", pointerEvents: "none", zIndex: 0,
      }} />

      <div style={cardStyle}>
        {/* Icon */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <div style={{
            width: "76px", height: "76px", borderRadius: "22px",
            background: isRejected ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
            border: `1.5px solid ${isRejected ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isRejected ? "0 12px 28px rgba(239,68,68,0.1)" : "0 12px 28px rgba(245,158,11,0.1)",
            animation: "float 3s ease-in-out infinite",
          }}>
            {isRejected
              ? <ShieldX style={{ width: "38px", height: "38px", color: "#ef4444" }} />
              : <ShieldAlert style={{ width: "38px", height: "38px", color: "#F59E0B" }} />
            }
          </div>
        </div>

        <h2 style={{ fontSize: "21px", fontWeight: 700, color: "#fff", margin: "0 0 10px", textAlign: "center" }}>
          {isRejected ? "Profile Not Approved" : "Verification Pending"}
        </h2>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "21px", textAlign: "center", margin: "0 0 28px", padding: "0 8px" }}>
          {isRejected
            ? "The admin has reviewed your submission and returned it with feedback. Please correct the issues and resubmit."
            : "Your profile and documents are currently under review by our admin team. We'll verify your account shortly."}
        </p>

        {/* Admin Feedback Banner (Rejection Only) */}
        {isRejected && feedback && (
          <div style={{
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: "14px", padding: "16px 18px", marginBottom: "24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <AlertTriangle style={{ width: "15px", height: "15px", color: "#f87171", flexShrink: 0 }} />
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.8px", margin: 0 }}>
                Admin Feedback
              </p>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.82)", margin: 0, lineHeight: "20px" }}>
              {feedback}
            </p>
          </div>
        )}

        {/* Milestones */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "18px 22px", marginBottom: "28px" }}>
          <h4 style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.35)", fontWeight: 700, margin: "0 0 14px" }}>
            Review Progress
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { done: true, title: "Profile Completed", desc: "All required profile fields have been submitted." },
              { done: true, title: "CAC Document Uploaded", desc: `Registration document (${orgProfile?.cac_number ?? "RC..."}) received.` },
              {
                done: isRejected,
                pending: !isRejected,
                rejected: isRejected,
                title: isRejected ? "Requires Correction" : "Admin Approval",
                desc: isRejected
                  ? "Your profile was returned. Please resubmit after corrections."
                  : "We are verifying your credentials. Usually takes 1–2 business days.",
              },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, marginTop: "2px",
                  background: m.rejected ? "rgba(239,68,68,0.12)" : m.done ? "rgba(26,175,107,0.12)" : "rgba(245,158,11,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: m.rejected ? "#ef4444" : m.done ? "#1aaf6b" : "#F59E0B",
                }}>
                  {m.done && !m.rejected && <CheckCircle2 style={{ width: "13px", height: "13px" }} />}
                  {m.pending && <Clock style={{ width: "13px", height: "13px", animation: "spin 3s linear infinite" }} />}
                  {m.rejected && <AlertTriangle style={{ width: "13px", height: "13px" }} />}
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff", margin: 0 }}>{m.title}</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.42)", margin: "2px 0 0" }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button type="button" onClick={signOut} style={signOutBtn}>
            <LogOut style={{ width: "15px", height: "15px" }} /> Sign Out
          </button>
          {!isRejected && (
            <button type="button" onClick={handleRefresh} disabled={checking} style={refreshBtn}>
              <RefreshCw style={{ width: "15px", height: "15px", animation: checking ? "spin 0.8s linear infinite" : "none" }} />
              {checking ? "Checking..." : "Check Status"}
            </button>
          )}
          {isRejected && (
            <button
              type="button"
              onClick={async () => {
                // Reset onboarding_completed so AuthGuard redirects to wizard in redo-mode
                await import("../../../lib/supabase").then(async ({ supabase }) => {
                  if (orgProfile?.id) {
                    await supabase
                      .from("organisation_profiles")
                      .update({ onboarding_completed: false })
                      .eq("id", orgProfile.id);
                  }
                });
                await refreshProfile();
              }}
              style={redoBtn}
            >
              Fix & Resubmit Profile
            </button>
          )}
        </div>

        <style>{`
          @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const outerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #050e26 0%, #0d1b3e 50%, #0f2a5c 100%)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'Inter', sans-serif", padding: "24px", color: "#fff",
  position: "relative", overflow: "hidden",
};

const cardStyle: React.CSSProperties = {
  width: "100%", maxWidth: "500px", position: "relative", zIndex: 2,
  background: "rgba(15, 33, 80, 0.45)",
  backdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "24px", padding: "40px",
  boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
};

const signOutBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "7px",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.65)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "12px", padding: "11px 18px",
  fontSize: "13px", fontWeight: 600, cursor: "pointer",
};

const refreshBtn: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
  background: "#1aaf6b", color: "#fff",
  border: "none", borderRadius: "12px", padding: "11px 18px",
  fontSize: "13px", fontWeight: 600, cursor: "pointer",
  boxShadow: "0 4px 14px rgba(26,175,107,0.3)",
};

const redoBtn: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
  background: "#F59E0B", color: "#fff",
  border: "none", borderRadius: "12px", padding: "11px 18px",
  fontSize: "13px", fontWeight: 600, cursor: "pointer",
  boxShadow: "0 4px 14px rgba(245,158,11,0.3)",
};
