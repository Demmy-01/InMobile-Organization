import { useEffect, useState } from "react";
import { Calendar, Mail, Phone, X, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

interface InternApplication {
  id: string;
  listing_id: string;
  student_id: string;
  status: string;
  applied_at: string;
  internship_listings: {
    title: string;
    duration: string;
    deadline: string;
  } | null;
  student_profiles: {
    first_name: string;
    last_name: string;
    email?: string;
    avatar_url?: string;
    skills?: string[];
  } | null;
}

const avatarColors = ["#1e3a7a", "#1aaf6b", "#7c3aed", "#db2777", "#d97706", "#0891b2", "#dc2626", "#059669"];

export function CurrentInterns() {
  const { user } = useAuth();
  const [interns, setInterns] = useState<InternApplication[]>([]);
  const [selected, setSelected] = useState<InternApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [performanceNote, setPerformanceNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadInterns();
  }, [user]);

  const loadInterns = async () => {
    setLoading(true);
    try {
      const { data: listings } = await supabase
        .from("internship_listings")
        .select("id")
        .eq("organisation_id", user!.id);

      const listingIds = (listings ?? []).map((l: any) => l.id);
      if (listingIds.length === 0) { setInterns([]); return; }

      const { data, error } = await supabase
        .from("applications")
        .select("*, internship_listings(*), student_profiles(first_name, last_name, email, skills, avatar_url)")
        .in("listing_id", listingIds)
        .order("applied_at", { ascending: false });

      if (error) console.error("CurrentInterns error:", error);
      
      const activeOrCompleted = (data ?? []).filter((app: any) => 
        app.status === "Accepted" || app.status === "Completed"
      );
      
      setInterns(activeOrCompleted);
    } finally {
      setLoading(false);
    }
  };

  const getName = (intern: InternApplication) => {
    if (!intern.student_profiles) return "Unknown";
    return `${intern.student_profiles.first_name} ${intern.student_profiles.last_name}`;
  };

  const getInitials = (intern: InternApplication) => {
    const name = getName(intern);
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getDaysLeft = (deadline: string) => {
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleSaveNote = async () => {
    if (!selected) return;
    setSavingNote(true);
    // Could save to a performance_notes table; for now just simulate
    await new Promise((r) => setTimeout(r, 800));
    setSavingNote(false);
    setSelected(null);
    setPerformanceNote("");
  };

  const handleMarkCompleted = async () => {
    if (!selected) return;
    setSavingNote(true);
    const { error } = await supabase
      .from("applications")
      .update({ status: "Completed" })
      .eq("id", selected.id);
    
    setSavingNote(false);
    if (!error) {
      setSelected(null);
      loadInterns();
    }
  };

  return (
    <>
      <style>{`
        .interns-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 480px) {
          .interns-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .interns-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h1 className="font-black text-base sm:text-lg" style={{ color: "#0d1b3e" }}>Current Interns</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: "rgba(13,27,62,0.6)" }}>
            {interns.length} active intern{interns.length !== 1 ? "s" : ""}
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12 }}>
            <Loader2 style={{ width: 22, height: 22, color: "#1aaf6b", animation: "spin 1s linear infinite" }} />
            <span style={{ color: "#0d1b3e", fontWeight: 600 }}>Loading interns...</span>
          </div>
        ) : interns.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: "rgba(255,255,255,0.6)" }}>
            <p style={{ color: "#0d1b3e", fontWeight: 600, marginBottom: 4 }}>No active interns yet</p>
            <p style={{ color: "rgba(13,27,62,0.4)", fontSize: 13 }}>
              Interns will appear here once you accept applications
            </p>
          </div>
        ) : (
          <div className="interns-grid">
            {interns.map((intern, idx) => (
              <div
                key={intern.id}
                onClick={() => { setSelected(intern); setPerformanceNote(""); }}
                className="rounded-xl p-4 sm:p-5 cursor-pointer hover:-translate-y-0.5 transition-transform"
                style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0 bg-cover bg-center overflow-hidden"
                    style={{ 
                      background: intern.student_profiles?.avatar_url ? 'transparent' : avatarColors[idx % avatarColors.length]
                    }}
                  >
                    {intern.student_profiles?.avatar_url ? (
                      <img 
                        src={intern.student_profiles.avatar_url} 
                        alt="Avatar" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      getInitials(intern)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: "#0d1b3e" }}>{getName(intern)}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "rgba(13,27,62,0.55)" }}>
                      {intern.internship_listings?.title ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3" style={{ color: "rgba(13,27,62,0.5)" }}>
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs truncate">
                    Accepted {new Date(intern.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(13,27,62,0.4)" }}>Duration</p>
                    <p className="text-xs sm:text-sm font-semibold" style={{ color: "#0d1b3e" }}>
                      {intern.internship_listings?.duration ?? "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: "rgba(13,27,62,0.4)" }}>
                      {intern.internship_listings?.deadline ? "Days Left" : ""}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold" style={{ color: "#0d1b3e" }}>
                      {intern.status === "Completed"
                        ? 0
                        : intern.internship_listings?.deadline
                        ? getDaysLeft(intern.internship_listings.deadline)
                        : "—"}
                    </p>
                  </div>
                </div>

                <span
                  className="inline-block mt-3 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: intern.status === "Completed" ? "rgba(107,114,128,0.15)" : "rgba(26,175,107,0.15)",
                    color: intern.status === "Completed" ? "#6b7280" : "#1aaf6b"
                  }}
                >
                  {intern.status === "Completed" ? "Term Completed" : "Active"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setSelected(null); } }}
        >
          <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md" style={{ background: "#162d6e" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <h2 className="text-white font-bold text-base">Intern Details</h2>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden" 
                  style={{ background: selected.student_profiles?.avatar_url ? 'transparent' : "#1e3a7a" }}
                >
                  {selected.student_profiles?.avatar_url ? (
                    <img 
                      src={selected.student_profiles.avatar_url} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    getInitials(selected)
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">{getName(selected)}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {selected.internship_listings?.title ?? "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {selected.student_profiles?.email && (
                  <div className="flex items-center gap-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                    <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                    <span className="text-sm">{selected.student_profiles.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <span className="text-sm">
                    Accepted: {new Date(selected.applied_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selected.student_profiles?.skills && selected.student_profiles.skills.length > 0 && (
                <div>
                  <label className="block text-xs font-bold tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                    SKILLS
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selected.student_profiles.skills.map((s) => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded" style={{ background: "rgba(59,107,212,0.4)", color: "#93c5fd" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                  PERFORMANCE NOTES
                </label>
                <textarea
                  rows={3}
                  placeholder="Add notes about this intern's performance..."
                  value={performanceNote}
                  onChange={(e) => setPerformanceNote(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none resize-none"
                  style={{ background: "#1e3a7a", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                />
              </div>

              <div className="flex gap-3">
                {selected.status === "Accepted" && (
                  <button
                    onClick={handleMarkCompleted}
                    disabled={savingNote}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
                  >
                    Mark Completed
                  </button>
                )}
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ background: "#1aaf6b" }}
                >
                  {savingNote ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
