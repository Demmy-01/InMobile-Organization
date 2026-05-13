import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

interface ListingData {
  id?: string;
  title?: string;
  location?: string;
  duration?: string;
  slots?: number;
  deadline?: string;
  description?: string;
  work_mode?: string;
  category?: string;
  is_siwes?: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  required_skills?: string[];
}

interface PostListingModalProps {
  onClose: () => void;
  listing?: ListingData; // if provided → edit mode
}

export function PostListingModal({ onClose, listing }: PostListingModalProps) {
  const { user } = useAuth();
  const isEdit = Boolean(listing?.id);

  const [skills, setSkills] = useState<string[]>(listing?.required_skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title:       listing?.title       ?? "",
    location:    listing?.location    ?? "Lagos Island",
    duration:    listing?.duration    ?? "3 months",
    slots:       String(listing?.slots ?? 3),
    deadline:    listing?.deadline    ?? "",
    description: listing?.description ?? "",
    work_mode:   listing?.work_mode   ?? "Remote",
    category:    listing?.category    ?? "",
    is_siwes:    listing?.is_siwes    ?? false,
    salary_min:  listing?.salary_min  ? String(listing.salary_min) : "",
    salary_max:  listing?.salary_max  ? String(listing.salary_max) : "",
  });

  const handleAddSkill = (e?: React.KeyboardEvent) => {
    if (e && e.key !== "Enter") return;
    if (e) e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) setSkills([...skills, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (index: number) => setSkills(skills.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        organisation_id: user.id,
        title:           form.title,
        location:        form.location,
        duration:        form.duration,
        slots:           parseInt(form.slots),
        deadline:        form.deadline || null,
        description:     form.description,
        work_mode:       form.work_mode,
        required_skills: skills,
        status:          "ACTIVE",
        category:        form.category || null,
        is_siwes:        form.is_siwes,
        salary_min:      form.salary_min ? parseInt(form.salary_min) : null,
        salary_max:      form.salary_max ? parseInt(form.salary_max) : null,
      };

      const { error: dbError } = isEdit
        ? await supabase.from("internship_listings").update(payload).eq("id", listing!.id!)
        : await supabase.from("internship_listings").insert(payload);

      if (dbError) throw dbError;
      setSuccess(true);
      setTimeout(() => onClose(), 1800);
    } catch (err: any) {
      setError(err.message || "Failed to save listing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.6)",
    marginBottom: "6px",
  };

  return (
    <>
      <style>{`
        .modal-grid-2 { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 480px) { .modal-grid-2 { grid-template-columns: repeat(2, 1fr); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeScale { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div
        className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden" style={{ background: "#162d6e", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
          <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <h2 className="text-white font-bold text-sm sm:text-base">
              {isEdit ? "Edit Internship Listing" : "Post New Internship Listing"}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {success ? (
            <div style={{ padding: "48px 24px", textAlign: "center", animation: "fadeScale 0.4s ease" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(26,175,107,0.15)", border: "2px solid rgba(26,175,107,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle2 style={{ width: 32, height: 32, color: "#1aaf6b" }} />
              </div>
              <p className="text-white font-bold text-base mb-2">{isEdit ? "Listing Updated!" : "Listing Published!"}</p>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                {isEdit ? "Your changes have been saved." : "Students can now apply to this internship."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-5 py-4 overflow-y-auto" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {error && (
                <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 12px", color: "#fca5a5", fontSize: 13 }}>
                  {error}
                </div>
              )}

              <div>
                <label style={labelStyle}>JOB TITLE <span style={{ color: "#f87171" }}>*</span></label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. UI/UX Design Intern" style={fieldStyle} required />
              </div>

              <div className="modal-grid-2">
                <div>
                  <label style={labelStyle}>LOCATION</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>DURATION</label>
                  <select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} style={{ ...fieldStyle, cursor: "pointer" }}>
                    <option>3 months</option>
                    <option>4 months</option>
                    <option>6 months</option>
                    <option>12 months</option>
                  </select>
                </div>
              </div>

              <div className="modal-grid-2">
                <div>
                  <label style={labelStyle}>WORK MODE</label>
                  <select value={form.work_mode} onChange={(e) => setForm({ ...form, work_mode: e.target.value })} style={{ ...fieldStyle, cursor: "pointer" }}>
                    <option value="Remote">Remote</option>
                    <option value="Onsite">Onsite</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>AVAILABLE SLOTS</label>
                  <input type="number" value={form.slots} onChange={(e) => setForm({ ...form, slots: e.target.value })} min="1" style={fieldStyle} required />
                </div>
              </div>

              <div className="modal-grid-2">
                <div>
                  <label style={labelStyle}>MIN SALARY (₦, optional)</label>
                  <input type="number" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} placeholder="e.g. 50000" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>MAX SALARY (₦, optional)</label>
                  <input type="number" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} placeholder="e.g. 150000" style={fieldStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>APPLICATION DEADLINE</label>
                <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} style={fieldStyle} />
              </div>

              <div>
                <label style={labelStyle}>ROLE DESCRIPTION</label>
                <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of what the intern will do..." style={{ ...fieldStyle, resize: "none" }} />
              </div>

              <div>
                <label style={labelStyle}>REQUIRED SKILLS</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder="e.g. React, Python, Figma..."
                    style={{ ...fieldStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill()}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 8,
                      background: "rgba(59,107,212,0.5)",
                      color: "#93c5fd",
                      border: "1px solid rgba(59,107,212,0.5)",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    + Add
                  </button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.map((skill, idx) => (
                      <span key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(59,107,212,0.5)", color: "#93c5fd" }}>
                        {skill}
                        <button type="button" onClick={() => removeSkill(idx)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.is_siwes}
                    onChange={(e) => setForm({ ...form, is_siwes: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: "#1aaf6b" }}
                  />
                  This is a SIWES-eligible placement
                </label>
              </div>

              <div className="flex gap-3 pt-1 pb-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 flex items-center justify-center gap-2" style={{ background: "#1aaf6b" }}>
                  {submitting
                    ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Saving...</>
                    : isEdit ? "Save Changes" : "Publish Now"
                  }
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
