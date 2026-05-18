import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../../lib/auth-context";
import { Loader2 } from "lucide-react";
import { OnboardingWizard } from "./OnboardingWizard";
import { VerificationPending } from "./VerificationPending";

export function AuthGuard() {
  const { session, orgProfile, loading } = useAuth();

  // Show loader while session + profile are being fetched
  if (loading || (session && orgProfile === null)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #040d23 0%, #0d1b3e 50%, #0f2a5c 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#1e3a7a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1.5px solid rgba(255,255,255,0.12)",
          }}
        >
          <img
            src="/images/logo.png"
            alt=""
            style={{ width: 34, height: 34, objectFit: "contain" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <Loader2
          style={{
            width: 24,
            height: 24,
            color: "#1aaf6b",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, margin: 0 }}>
          Loading InternLink...
        </p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!session) return <Navigate to="/login" replace />;

  // Profile loaded — run state checks
  if (orgProfile) {
    // 1️⃣ Onboarding not completed → show wizard (redo mode if rejection_reason present)
    if (!orgProfile.onboarding_completed) {
      return (
        <OnboardingWizard
          isRedo={!!orgProfile.rejection_reason}
          adminFeedback={orgProfile.rejection_reason}
        />
      );
    }

    // 2️⃣ Onboarding done but not yet verified → show pending/rejected screen
    if (!orgProfile.is_verified) {
      return <VerificationPending />;
    }
  }

  // ✅ All checks passed — render the app
  return <Outlet />;
}
