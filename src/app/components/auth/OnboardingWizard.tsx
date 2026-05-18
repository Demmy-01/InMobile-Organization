import { useState } from "react";
import { useAuth } from "../../../lib/auth-context";
import { supabase } from "../../../lib/supabase";
import {
  Building2,
  Globe,
  FileText,
  User,
  Phone,
  MapPin,
  FileBadge2,
  Upload,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

interface OnboardingWizardProps {
  isRedo?: boolean;
  adminFeedback?: string | null;
}

export function OnboardingWizard({ isRedo = false, adminFeedback }: OnboardingWizardProps) {
  const { user, orgProfile, refreshProfile, signOut } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields — pre-fill with existing profile if redo
  const [name, setName] = useState(orgProfile?.name ?? "");
  const [industry, setIndustry] = useState(orgProfile?.industry ?? "");
  const [website, setWebsite] = useState(orgProfile?.website ?? "");
  const [description, setDescription] = useState(orgProfile?.description ?? "");
  const [hrManager, setHrManager] = useState(orgProfile?.hr_manager_name ?? "");
  const [phone, setPhone] = useState(orgProfile?.phone ?? "");
  const [address, setAddress] = useState(orgProfile?.address ?? "");
  const [cacNumber, setCacNumber] = useState(orgProfile?.cac_number ?? "");
  const [cacFile, setCacFile] = useState<File | null>(null);
  const [cacFileName, setCacFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCacFile(file);
      setCacFileName(file.name);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!name.trim()) return setError("Company Name is required.");
      if (!industry.trim()) return setError("Industry is required.");
      if (!description.trim()) return setError("Company Description is required.");
    } else if (step === 2) {
      if (!hrManager.trim()) return setError("HR Manager Name is required.");
      if (!phone.trim()) return setError("Contact Phone Number is required.");
      if (!address.trim()) return setError("Office Address is required.");
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cacNumber.trim()) return setError("CAC Registration Number is required.");
    if (!cacFile && !orgProfile?.cac_url) return setError("Please upload your CAC Registration Document.");

    setLoading(true);
    setError(null);

    try {
      let finalCacUrl = orgProfile?.cac_url ?? null;

      if (cacFile && user) {
        const fileExt = cacFile.name.split(".").pop();
        const filePath = `${user.id}/cac_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("cac-documents")
          .upload(filePath, cacFile, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from("cac-documents").getPublicUrl(filePath);
          finalCacUrl = data.publicUrl;
        }
      }

      if (!user) throw new Error("No authenticated user session.");

      const { error: updateError } = await supabase
        .from("organisation_profiles")
        .update({
          name,
          industry,
          website: website || null,
          description,
          hr_manager_name: hrManager,
          phone,
          address,
          cac_number: cacNumber,
          cac_url: finalCacUrl,
          onboarding_completed: true,
          // Reset to pending: clear rejection, mark unverified
          is_verified: false,
          rejection_reason: null,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      await refreshProfile();
    } catch (err: any) {
      setError(err.message ?? "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={outerContainerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={iconWrapStyle}>
            {isRedo ? (
              <RotateCcw style={{ width: "26px", height: "26px", color: "#F59E0B" }} />
            ) : (
              <Building2 style={{ width: "26px", height: "26px", color: "#1aaf6b" }} />
            )}
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
            {isRedo ? "Resubmit Your Profile" : "Complete Onboarding"}
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: 0 }}>
            {isRedo
              ? "Your previous submission was reviewed. Please make the necessary corrections and resubmit."
              : "Fill in your business details to set up your organization profile."}
          </p>
        </div>

        {/* Admin Rejection Feedback Banner */}
        {isRedo && adminFeedback && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "14px",
              padding: "16px 18px",
              marginBottom: "24px",
            }}
          >
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 6px" }}>
              Admin Feedback
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: "20px" }}>
              {adminFeedback}
            </p>
          </div>
        )}

        {/* Step Indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", position: "relative", padding: "0 10px" }}>
          <div style={{ position: "absolute", top: "16px", left: "40px", right: "40px", height: "2px", background: "rgba(255,255,255,0.07)", zIndex: 1 }}>
            <div style={{ height: "100%", width: step === 1 ? "0%" : step === 2 ? "50%" : "100%", background: isRedo ? "#F59E0B" : "#1aaf6b", transition: "width 0.3s ease" }} />
          </div>
          {[{ num: 1, label: "Company" }, { num: 2, label: "Contacts" }, { num: 3, label: "Documents" }].map((s) => (
            <div key={s.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2, position: "relative" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: step >= s.num ? (isRedo ? "#F59E0B" : "#1aaf6b") : "#0a1a40",
                border: `2px solid ${step >= s.num ? (isRedo ? "#F59E0B" : "#1aaf6b") : "rgba(255,255,255,0.12)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "13px", fontWeight: 600,
                color: step >= s.num ? "#fff" : "rgba(255,255,255,0.4)",
                transition: "all 0.3s ease",
                boxShadow: step === s.num ? `0 0 12px ${isRedo ? "rgba(245,158,11,0.4)" : "rgba(26,175,107,0.4)"}` : "none",
              }}>
                {step > s.num ? <CheckCircle2 style={{ width: "16px", height: "16px" }} /> : s.num}
              </div>
              <span style={{ fontSize: "11px", color: step >= s.num ? "#fff" : "rgba(255,255,255,0.35)", marginTop: "7px", fontWeight: 500 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "12px", padding: "11px 15px", display: "flex", alignItems: "center", gap: "9px", color: "#ef4444", fontSize: "13px", marginBottom: "20px" }}>
            <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1 — Company Info */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>Company Name</label>
              <div style={inputRow}>
                <Building2 style={iconStyle} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corporation" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Industry</label>
                <div style={inputRow}>
                  <Briefcase style={iconStyle} />
                  <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Website (Optional)</label>
                <div style={inputRow}>
                  <Globe style={iconStyle} />
                  <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." style={inputStyle} />
                </div>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Company Description</label>
              <div style={{ ...inputRow, alignItems: "flex-start", height: "auto", padding: "12px 14px" }}>
                <FileText style={{ ...iconStyle, marginTop: "2px" }} />
                <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your company's mission, values, and work culture..." style={{ ...inputStyle, height: "auto", resize: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
              <button type="button" onClick={signOut} style={ghostBtnStyle}>Sign Out</button>
              <button type="button" onClick={nextStep} style={primaryBtn(isRedo)}>Next <ArrowRight style={{ width: "15px", height: "15px" }} /></button>
            </div>
          </div>
        )}

        {/* STEP 2 — Contact & Location */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>HR Manager / Coordinator Name</label>
              <div style={inputRow}>
                <User style={iconStyle} />
                <input type="text" value={hrManager} onChange={(e) => setHrManager(e.target.value)} placeholder="e.g. Jane Doe" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Contact Phone Number</label>
              <div style={inputRow}>
                <Phone style={iconStyle} />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +234 80 1234 5678" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Physical Office Address</label>
              <div style={{ ...inputRow, alignItems: "flex-start", height: "auto", padding: "12px 14px" }}>
                <MapPin style={{ ...iconStyle, marginTop: "2px" }} />
                <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 123 Business Avenue, Victoria Island, Lagos" style={{ ...inputStyle, height: "auto", resize: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
              <button type="button" onClick={prevStep} style={secondaryBtnStyle}><ArrowLeft style={{ width: "15px", height: "15px" }} /> Back</button>
              <button type="button" onClick={nextStep} style={primaryBtn(isRedo)}>Next <ArrowRight style={{ width: "15px", height: "15px" }} /></button>
            </div>
          </div>
        )}

        {/* STEP 3 — CAC Document */}
        {step === 3 && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>CAC Registration Number</label>
              <div style={inputRow}>
                <FileBadge2 style={iconStyle} />
                <input type="text" value={cacNumber} onChange={(e) => setCacNumber(e.target.value)} placeholder="e.g. RC1234567" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>
                Upload CAC Document (PDF / Image)
                {isRedo && orgProfile?.cac_url && (
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginLeft: "8px", fontWeight: 400 }}>
                    — Previous document on file. Upload new to replace.
                  </span>
                )}
              </label>
              <div style={{ border: "2px dashed rgba(255,255,255,0.12)", borderRadius: "14px", padding: "28px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", cursor: "pointer", position: "relative" }}>
                <input type="file" accept=".pdf,image/*" onChange={handleFileChange} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                  <Upload style={{ width: "18px", height: "18px", color: "rgba(255,255,255,0.5)" }} />
                </div>
                <p style={{ fontSize: "13px", fontWeight: 500, margin: "0 0 3px", color: cacFileName ? "#1aaf6b" : "#fff" }}>
                  {cacFileName ? "File selected" : "Click to select a file"}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
                  {cacFileName ? cacFileName : "PDF, PNG, JPG — max 5MB"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
              <button type="button" onClick={prevStep} disabled={loading} style={secondaryBtnStyle}><ArrowLeft style={{ width: "15px", height: "15px" }} /> Back</button>
              <button type="submit" disabled={loading} style={primaryBtn(isRedo)}>
                {loading ? <><Loader2 style={{ width: "15px", height: "15px", animation: "spin 1s linear infinite" }} /> Submitting...</> : <>{isRedo ? "Resubmit Profile" : "Complete Onboarding"} <ArrowRight style={{ width: "15px", height: "15px" }} /></>}
              </button>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const outerContainerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #050e26 0%, #0d1b3e 50%, #0f2a5c 100%)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'Inter', sans-serif", padding: "24px", color: "#ffffff",
};

const cardStyle: React.CSSProperties = {
  width: "100%", maxWidth: "580px",
  background: "rgba(15, 33, 80, 0.42)",
  backdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "24px", padding: "40px",
  boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
};

const iconWrapStyle: React.CSSProperties = {
  width: "54px", height: "54px", borderRadius: "16px",
  background: "rgba(26,175,107,0.1)",
  border: "1px solid rgba(26,175,107,0.25)",
  display: "flex", alignItems: "center", justifyContent: "center",
  margin: "0 auto 16px",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: 600,
  color: "rgba(255,255,255,0.65)", marginBottom: "8px",
};

const inputRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "10px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "12px", padding: "0 14px", height: "48px",
};

const inputStyle: React.CSSProperties = {
  flex: 1, background: "none", border: "none", outline: "none",
  color: "#fff", fontSize: "14px", fontFamily: "inherit",
  height: "100%", padding: "0",
};

const iconStyle: React.CSSProperties = {
  width: "16px", height: "16px", color: "rgba(255,255,255,0.35)", flexShrink: 0,
};

const primaryBtn = (amber: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: "7px",
  background: amber ? "#F59E0B" : "#1aaf6b",
  color: "#fff", border: "none", borderRadius: "12px",
  padding: "11px 22px", fontSize: "13px", fontWeight: 600,
  cursor: "pointer",
  boxShadow: amber ? "0 4px 14px rgba(245,158,11,0.3)" : "0 4px 14px rgba(26,175,107,0.3)",
});

const secondaryBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "7px",
  background: "rgba(255,255,255,0.06)",
  color: "#fff", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px", padding: "11px 22px",
  fontSize: "13px", fontWeight: 600, cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  background: "none", border: "none",
  color: "rgba(255,255,255,0.45)", fontSize: "13px",
  fontWeight: 500, cursor: "pointer", padding: "11px",
};
