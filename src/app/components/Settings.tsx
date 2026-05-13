import { useEffect, useRef, useState } from "react";
import { Upload, Save, Loader2, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

const fieldStyle: React.CSSProperties = {
  background: "#1e3a7a",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "8px",
  color: "#fff",
  width: "100%",
  padding: "10px 14px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "rgba(255,255,255,0.6)",
  marginBottom: "6px",
};

const sectionStyle: React.CSSProperties = {
  background: "#162d6e",
  borderRadius: "16px",
  padding: "20px",
};

const notificationDefaults = [
  { key: "email_alerts", label: "Email alerts for new applications", desc: "Receive an email when a new application is submitted" },
  { key: "deadline_reminders", label: "Deadline reminders", desc: "Get notified when application deadlines are approaching" },
  { key: "acceptance_alerts", label: "Application acceptances", desc: "Receive notifications when candidates accept offers" },
];

export function Settings() {
  const { user, orgProfile, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    name: "",
    contact_email: "",
    hr_manager_name: "",
    industry: "",
    website: "",
    description: "",
  });

  const [notifs, setNotifs] = useState({ email_alerts: true, deadline_reminders: true, acceptance_alerts: true });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pwForm, setPwForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);
  const [pwStatus, setPwStatus] = useState<"idle" | "success" | "error">("idle");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (orgProfile) {
      setForm({
        name: orgProfile.name ?? "",
        contact_email: orgProfile.contact_email ?? "",
        hr_manager_name: orgProfile.hr_manager_name ?? "",
        industry: orgProfile.industry ?? "",
        website: orgProfile.website ?? "",
        description: orgProfile.description ?? "",
      });
      setLogoUrl(orgProfile.logo_url ?? null);
    }
  }, [orgProfile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const { error } = await supabase
        .from("organisation_profiles")
        .upsert({ id: user.id, ...form, logo_url: logoUrl }, { onConflict: "id" });
      if (error) throw error;
      await refreshProfile();
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { setLogoError("File too large — max 2MB"); return; }
    setLogoError("");
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("org-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      // Get clean public URL (no cache-bust — store this in DB)
      const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);
      const cleanUrl = urlData.publicUrl;

      // Save to DB — use update since the profile row already exists
      const { error: dbErr } = await supabase
        .from("organisation_profiles")
        .update({ logo_url: cleanUrl })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      // Refresh profile context, then force-set logoUrl with cache-bust for immediate display
      // (useEffect will run after refreshProfile but we override it right after)
      await refreshProfile();
      // Add cache-bust only for local display so browser shows the new image
      setLogoUrl(`${cleanUrl}?t=${Date.now()}`);
    } catch (err: any) {
      setLogoError(err.message || "Upload failed");
    } finally {
      setUploadingLogo(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (pwForm.newPass !== pwForm.confirm) { setPwError("Passwords do not match"); return; }
    if (pwForm.newPass.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    setChangingPw(true);
    setPwStatus("idle");
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPass });
      if (error) throw error;
      setPwStatus("success");
      setPwForm({ current: "", newPass: "", confirm: "" });
      setTimeout(() => setPwStatus("idle"), 3000);
    } catch (err: any) {
      setPwError(err.message || "Failed to change password");
      setPwStatus("error");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div style={{ maxWidth: "640px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <h1 className="font-black text-base sm:text-lg" style={{ color: "#0d1b3e" }}>Settings</h1>

      {/* Organisation Details */}
      <div style={sectionStyle}>
        <h2 className="text-white font-bold text-sm sm:text-base mb-4">Organisation Details</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Organisation Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Organisation Logo</label>
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#1e3a7a", border: "2px dashed rgba(255,255,255,0.2)", overflow: "hidden" }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Building2 style={{ width: 24, height: 24, color: "rgba(255,255,255,0.3)" }} />
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />
                <button
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium"
                  style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer" }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Upload className="w-4 h-4" />}
                  {uploadingLogo ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                </button>
                {logoError && <p style={{ fontSize: 11, color: "#f87171", margin: 0 }}>{logoError}</p>}
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              PNG, JPG or WebP · 200×200px recommended · Max 2MB
            </p>
          </div>

          <div>
            <label style={labelStyle}>Contact Email</label>
            <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>HR Manager Name</label>
            <input type="text" value={form.hr_manager_name} onChange={(e) => setForm({ ...form, hr_manager_name: e.target.value })} style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Industry</label>
            <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} style={{ ...fieldStyle, cursor: "pointer" }}>
              <option value="">Select industry</option>
              {["Banking & Finance", "Technology", "Oil & Gas", "Telecommunications", "Healthcare", "Manufacturing", "Retail", "Education", "Other"].map((i) => (
                <option key={i} value={i} style={{ background: "#0d1b3e" }}>{i}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Website</label>
            <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://yourcompany.com" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>About the Organisation</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description about your company..."
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div style={sectionStyle}>
        <h2 className="text-white font-bold text-sm sm:text-base mb-4">Notification Preferences</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {notificationDefaults.map((item, idx) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 gap-4"
              style={idx < notificationDefaults.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.07)" } : {}}
            >
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-white leading-snug">{item.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={notifs[item.key as keyof typeof notifs]}
                  onChange={(e) => setNotifs({ ...notifs, [item.key]: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="relative w-10 h-5 rounded-full transition-colors peer-checked:bg-[#1aaf6b]" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div style={sectionStyle}>
        <h2 className="text-white font-bold text-sm sm:text-base mb-4">Security</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {pwError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 12px", color: "#fca5a5", fontSize: 13 }}>
              <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
              {pwError}
            </div>
          )}
          {pwStatus === "success" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(26,175,107,0.1)", border: "1px solid rgba(26,175,107,0.2)", borderRadius: 8, padding: "10px 12px", color: "#1aaf6b", fontSize: 13 }}>
              <CheckCircle2 style={{ width: 15, height: 15, flexShrink: 0 }} />
              Password changed successfully
            </div>
          )}

          <div>
            <label style={labelStyle}>New Password</label>
            <input type="password" value={pwForm.newPass} onChange={(e) => setPwForm({ ...pwForm, newPass: e.target.value })} placeholder="Enter new password" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Confirm new password" style={fieldStyle} />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={changingPw}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 mt-1"
            style={{ background: "#1e3a7a", border: "1px solid rgba(255,255,255,0.2)", alignSelf: "flex-start" }}
          >
            {changingPw ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : null}
            Change Password
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pb-2">
        {saveStatus === "success" && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#1aaf6b", fontSize: 13 }}>
            <CheckCircle2 style={{ width: 15, height: 15 }} /> Changes saved!
          </span>
        )}
        {saveStatus === "error" && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#f87171", fontSize: 13 }}>
            <AlertCircle style={{ width: 15, height: 15 }} /> Failed to save
          </span>
        )}
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-white hover:opacity-90"
            style={{ background: "#1aaf6b" }}
          >
            {saving ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Save className="w-4 h-4" />}
            Save All Changes
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
