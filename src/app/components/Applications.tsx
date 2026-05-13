import { useEffect, useState } from "react";
import { Eye, Check, X, Filter, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

interface Application {
  id: string;
  listing_id: string;
  student_id: string;
  status: string;
  applied_at: string;
  cover_letter: string | null;
  resume_url: string | null;
  cv_used: boolean;
  internship_listings: { title: string } | null;
  student_profiles: {
    first_name: string;
    last_name: string;
    email?: string;
    skills?: string[];
    avatar_url?: string | null;
  } | null;
}

const statusColor = (s: string): React.CSSProperties => {
  if (s === "Accepted") return { background: "rgba(26,175,107,0.2)", color: "#1aaf6b" };
  if (s === "Rejected") return { background: "rgba(248,113,113,0.2)", color: "#f87171" };
  return { background: "rgba(251,191,36,0.2)", color: "#fbbf24" };
};

const selectStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: "8px",
  padding: "7px 12px",
  fontSize: "12px",
  color: "#0d1b3e",
  outline: "none",
  cursor: "pointer",
};

export function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [actionId, setActionId] = useState<string | null>(null);
  
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [mimsCvData, setMimsCvData] = useState<any | null>(null);
  const [loadingCv, setLoadingCv] = useState(false);

  const loadApplications = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    try {
      const { data: listings } = await supabase
        .from("internship_listings")
        .select("id")
        .eq("organisation_id", user.id);

      const listingIds = (listings ?? []).map((l: any) => l.id);
      if (listingIds.length === 0) { setApplications([]); return; }

      const { data } = await supabase
        .from("applications")
        .select("*, internship_listings(title), student_profiles(first_name, last_name, email, skills, avatar_url)")
        .in("listing_id", listingIds)
        .order("applied_at", { ascending: false });

      setApplications(data ?? []);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
    if (!user) return;

    const channel = supabase
      .channel('org-apps')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => loadApplications(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleUpdateStatus = async (id: string, status: "Accepted" | "Rejected") => {
    setActionId(id);
    await supabase.from("applications").update({ status }).eq("id", id);
    await loadApplications(false);
    setActionId(null);
    if (selectedApp && selectedApp.id === id) {
      setSelectedApp(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleReview = async (app: Application) => {
    setSelectedApp(app);
    setMimsCvData(null);
    
    // Auto-update status to Reviewed if it's currently Pending
    if (app.status === "Pending") {
      await supabase.from("applications").update({ status: "Reviewed" }).eq("id", app.id);
      loadApplications(false);
      setSelectedApp(prev => prev ? { ...prev, status: "Reviewed" } : null);
    }

    if (app.cv_used) {
      setLoadingCv(true);
      const { data, error } = await supabase
        .from("generated_cvs")
        .select("cv_data")
        .eq("student_id", app.student_id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) console.error("CV fetch error:", error);
      if (data) {
        setMimsCvData(data.cv_data);
      }
      setLoadingCv(false);
    }
  };

  const roles = [...new Set(applications.map((a) => a.internship_listings?.title ?? "").filter(Boolean))];
  const filtered = applications.filter((app) => {
    const statusOk = filterStatus === "All" || app.status === filterStatus;
    const roleOk = filterRole === "All" || app.internship_listings?.title === filterRole;
    return statusOk && roleOk;
  });
  const pendingCount = applications.filter((a) => a.status === "Pending").length;

  const getApplicantName = (app: Application) => {
    if (!app.student_profiles) return "Unknown";
    return `${app.student_profiles.first_name} ${app.student_profiles.last_name}`;
  };
  const getInitials = (app: Application) => {
    const name = getApplicantName(app);
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };
  const getEmail = (app: Application) => app.student_profiles?.email ?? "—";
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <style>{`
        .app-table-wrap { display: none; }
        .app-cards { display: flex; flex-direction: column; gap: 12px; }
        @media (min-width: 768px) { .app-table-wrap { display: block; } .app-cards { display: none; } }
        .app-filter-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <h1 className="font-black text-base sm:text-lg" style={{ color: "#0d1b3e" }}>Applications</h1>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: "rgba(13,27,62,0.6)" }}>
              {pendingCount} pending application{pendingCount !== 1 ? "s" : ""} awaiting review
            </p>
          </div>

          <div className="app-filter-row">
            <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "#0d1b3e" }} />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={selectStyle}>
              <option value="All">All Roles</option>
              {roles.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12 }}>
            <Loader2 style={{ width: 22, height: 22, color: "#1aaf6b", animation: "spin 1s linear infinite" }} />
            <span style={{ color: "#0d1b3e", fontWeight: 600 }}>Loading applications...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: "rgba(255,255,255,0.6)" }}>
            <p style={{ color: "#0d1b3e", fontWeight: 600, marginBottom: 4 }}>No applications found</p>
            <p style={{ color: "rgba(13,27,62,0.4)", fontSize: 13 }}>Applications will appear here once students apply to your listings</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="app-table-wrap rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    {["Applicant", "Role", "Applied Date", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 sm:px-5 py-3 text-left text-xs font-bold tracking-wider" style={{ color: "rgba(13,27,62,0.5)" }}>
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((applicant) => (
                    <tr key={applicant.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <td className="px-4 sm:px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden" 
                            style={{ background: applicant.student_profiles?.avatar_url ? 'transparent' : "#1e3a7a" }}
                          >
                            {applicant.student_profiles?.avatar_url ? (
                              <img 
                                src={applicant.student_profiles.avatar_url} 
                                alt="Avatar" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            ) : (
                              getInitials(applicant)
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-xs sm:text-sm" style={{ color: "#0d1b3e" }}>{getApplicantName(applicant)}</p>
                            <p className="text-xs" style={{ color: "rgba(13,27,62,0.5)" }}>{getEmail(applicant)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <p className="text-xs sm:text-sm font-medium" style={{ color: "#0d1b3e" }}>{applicant.internship_listings?.title ?? "—"}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <p className="text-xs sm:text-sm" style={{ color: "rgba(13,27,62,0.6)" }}>{formatDate(applicant.applied_at)}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={statusColor(applicant.status)}>
                          {applicant.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleReview(applicant)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#e0e7ff", color: "#3730a3", border: "1px solid #c7d2fe", cursor: "pointer" }}>
                            Review
                          </button>
                          {(applicant.status === "Pending" || applicant.status === "Reviewed") && (
                            <>
                              <button disabled={actionId === applicant.id} onClick={() => handleUpdateStatus(applicant.id, "Accepted")} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center hover:bg-green-100" title="Accept">
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: "#1aaf6b" }} />
                              </button>
                              <button disabled={actionId === applicant.id} onClick={() => handleUpdateStatus(applicant.id, "Rejected")} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center hover:bg-red-100" title="Reject">
                                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: "#f87171" }} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="app-cards">
              {filtered.map((applicant) => (
                <div key={applicant.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden" 
                        style={{ background: applicant.student_profiles?.avatar_url ? 'transparent' : "#1e3a7a" }}
                      >
                        {applicant.student_profiles?.avatar_url ? (
                          <img 
                            src={applicant.student_profiles.avatar_url} 
                            alt="Avatar" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          getInitials(applicant)
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: "#0d1b3e" }}>{getApplicantName(applicant)}</p>
                        <p className="text-xs" style={{ color: "rgba(13,27,62,0.5)" }}>{getEmail(applicant)}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0" style={statusColor(applicant.status)}>
                      {applicant.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium mb-1" style={{ color: "#0d1b3e" }}>{applicant.internship_listings?.title ?? "—"}</p>
                  <p className="text-xs mb-3" style={{ color: "rgba(13,27,62,0.5)" }}>Applied: {formatDate(applicant.applied_at)}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleReview(applicant)} className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ background: "#e0e7ff", color: "#3730a3", border: "1px solid #c7d2fe" }}>
                      Review
                    </button>
                    {(applicant.status === "Pending" || applicant.status === "Reviewed") && (
                      <>
                        <button onClick={() => handleUpdateStatus(applicant.id, "Accepted")} disabled={actionId === applicant.id} className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ background: "rgba(26,175,107,0.15)", color: "#1aaf6b", border: "1px solid rgba(26,175,107,0.3)" }}>
                          Accept
                        </button>
                        <button onClick={() => handleUpdateStatus(applicant.id, "Rejected")} disabled={actionId === applicant.id} className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: 20, borderBottom: "1px solid rgba(0,0,0,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Application Review</h2>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{selectedApp.internship_listings?.title}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} style={{ padding: 8, background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1e3a7a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: "bold", overflow: "hidden", flexShrink: 0 }}>
                  {selectedApp.student_profiles?.avatar_url ? (
                    <img src={selectedApp.student_profiles.avatar_url} alt={getApplicantName(selectedApp)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    getInitials(selectedApp)
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>{getApplicantName(selectedApp)}</h3>
                  <p style={{ fontSize: 14, color: "#64748b", margin: "2px 0 0 0" }}>{getEmail(selectedApp)}</p>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ ...statusColor(selectedApp.status), padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                      {selectedApp.status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedApp.cover_letter && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Cover Letter</h4>
                  <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {selectedApp.cover_letter}
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Resume / CV</h4>
                {selectedApp.resume_url ? (
                  <a href={selectedApp.resume_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#eff6ff", color: "#2563eb", padding: "12px 20px", borderRadius: 12, textDecoration: "none", fontWeight: 600, fontSize: 14, border: "1px solid #bfdbfe" }}>
                    <Eye size={18} /> View Uploaded Resume
                  </a>
                ) : selectedApp.cv_used ? (
                  <div style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    {loadingCv ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b" }}>
                        <Loader2 className="animate-spin" size={16} /> <span style={{ fontSize: 14 }}>Loading generated CV...</span>
                      </div>
                    ) : mimsCvData ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {/* CV Header */}
                        <div style={{ background: "linear-gradient(135deg, #1e3a7a, #3b82f6)", borderRadius: 10, padding: "18px 20px", marginBottom: 14 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                            {selectedApp.student_profiles?.first_name} {selectedApp.student_profiles?.last_name}
                          </div>
                          {mimsCvData.targetRole && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>{mimsCvData.targetRole} Intern</div>}
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>{selectedApp.student_profiles?.email}</div>
                          <div style={{ display: "inline-flex", alignItems: "center", marginTop: 8 }}>
                            <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>MIMS Generated CV</span>
                          </div>
                        </div>

                        {/* Summary */}
                        {mimsCvData.summary && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <div style={{ width: 3, height: 16, borderRadius: 2, background: "#3b82f6", flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a7a", textTransform: "uppercase", letterSpacing: 0.5 }}>Professional Summary</span>
                            </div>
                            <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>{mimsCvData.summary}</p>
                          </div>
                        )}

                        {/* Education */}
                        {mimsCvData.education?.length > 0 && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <div style={{ width: 3, height: 16, borderRadius: 2, background: "#3b82f6", flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a7a", textTransform: "uppercase", letterSpacing: 0.5 }}>Education</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {mimsCvData.education.map((edu: any, i: number) => (
                                <div key={i} style={{ paddingBottom: i < mimsCvData.education.length - 1 ? 10 : 0, borderBottom: i < mimsCvData.education.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{edu.institution}</span>
                                    <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", paddingLeft: 8 }}>{edu.period}</span>
                                  </div>
                                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{edu.degree}{edu.gpa ? ` — GPA: ${edu.gpa}` : ""}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Skills */}
                        {mimsCvData.skills?.length > 0 && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <div style={{ width: 3, height: 16, borderRadius: 2, background: "#3b82f6", flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a7a", textTransform: "uppercase", letterSpacing: 0.5 }}>Skills</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {mimsCvData.skills.map((group: any, i: number) => (
                                <div key={i}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{group.category}: </span>
                                  <span style={{ fontSize: 12, color: "#334155" }}>{group.items?.join(", ")}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Projects */}
                        {mimsCvData.projects?.length > 0 && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <div style={{ width: 3, height: 16, borderRadius: 2, background: "#3b82f6", flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a7a", textTransform: "uppercase", letterSpacing: 0.5 }}>Projects</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              {mimsCvData.projects.map((proj: any, i: number) => (
                                <div key={i} style={{ paddingBottom: i < mimsCvData.projects.length - 1 ? 12 : 0, borderBottom: i < mimsCvData.projects.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{proj.title}</div>
                                  <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5, marginBottom: 6 }}>{proj.description}</div>
                                  {(Array.isArray(proj.technologies) ? proj.technologies : []).length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                      {(Array.isArray(proj.technologies) ? proj.technologies : []).map((t: string) => (
                                        <span key={t} style={{ background: "#eff6ff", color: "#1e3a7a", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{t}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Work Experience */}
                        {mimsCvData.experience?.length > 0 && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <div style={{ width: 3, height: 16, borderRadius: 2, background: "#3b82f6", flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a7a", textTransform: "uppercase", letterSpacing: 0.5 }}>Work Experience</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              {mimsCvData.experience.map((exp: any, i: number) => (
                                <div key={i} style={{ paddingBottom: i < mimsCvData.experience.length - 1 ? 12 : 0, borderBottom: i < mimsCvData.experience.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", flex: 1 }}>{exp.role} — {exp.company}</span>
                                    <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", paddingLeft: 8 }}>{exp.period}</span>
                                  </div>
                                  {exp.description && <div style={{ fontSize: 12, color: "#334155", marginTop: 4, lineHeight: 1.5 }}>{exp.description}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Hobbies */}
                        {mimsCvData.hobbies?.length > 0 && (
                          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <div style={{ width: 3, height: 16, borderRadius: 2, background: "#3b82f6", flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a7a", textTransform: "uppercase", letterSpacing: 0.5 }}>Hobbies & Interests</span>
                            </div>
                            <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>{mimsCvData.hobbies.join("  ·  ")}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>Student used a generated CV, but it could not be loaded.</p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 14, color: "#64748b", margin: 0, fontStyle: "italic" }}>No CV provided.</p>
                )}
              </div>
            </div>

            <div style={{ padding: 20, borderTop: "1px solid rgba(0,0,0,0.1)", display: "flex", gap: 12, background: "#f8fafc" }}>
              {selectedApp.status !== "Accepted" && (
                <button onClick={() => handleUpdateStatus(selectedApp.id, "Accepted")} disabled={actionId === selectedApp.id} style={{ flex: 1, padding: 12, background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                  <Check size={18} /> Accept
                </button>
              )}
              {selectedApp.status !== "Rejected" && (
                <button onClick={() => handleUpdateStatus(selectedApp.id, "Rejected")} disabled={actionId === selectedApp.id} style={{ flex: 1, padding: 12, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                  <X size={18} /> Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
