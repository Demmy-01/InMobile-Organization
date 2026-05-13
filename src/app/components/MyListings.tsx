import { useEffect, useState } from "react";
import { PlusCircle, Eye, Trash2, Loader2, Pencil, MapPin, Clock, Monitor, AlertTriangle } from "lucide-react";
import { PostListingModal } from "./PostListingModal";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

interface Listing {
  id: string;
  title: string;
  status: string;
  location: string;
  duration: string;
  work_mode: string;
  required_skills: string[];
  slots: number;
  deadline: string;
  description: string;
  is_siwes: boolean;
  created_at: string;
  application_count: number;
  salary_min: number | null;
  salary_max: number | null;
  category: string;
}

export function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadListings = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    try {
      const { data } = await supabase
        .from("internship_listings")
        .select("*")
        .eq("organisation_id", user.id)
        .order("created_at", { ascending: false });

      const withCounts = await Promise.all(
        (data ?? []).map(async (l: any) => {
          const { count } = await supabase
            .from("applications")
            .select("*", { count: "exact", head: true })
            .eq("listing_id", l.id);
          return { ...l, application_count: count ?? 0 };
        })
      );
      setListings(withCounts);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
    if (!user) return;

    const channel = supabase
      .channel('org-listings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => loadListings(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'internship_listings' },
        () => loadListings(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getDaysLeft = (deadline: string) => {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleClose = async (id: string) => {
    setClosingId(id);
    await supabase.from("internship_listings").update({ status: "CLOSED" }).eq("id", id);
    await loadListings();
    setClosingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await supabase.from("internship_listings").delete().eq("id", id);
      await loadListings();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <style>{`
        .listings-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 768px) { .listings-grid { grid-template-columns: repeat(2, 1fr); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .listing-action-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 12px; border-radius: 8px;
          font-size: 12px; font-weight: 600; border: none; cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }
        .listing-action-btn:hover { opacity: 0.82; transform: translateY(-1px); }
        .listing-action-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
            <Loader2 style={{ width: 24, height: 24, color: "#1aaf6b", animation: "spin 1s linear infinite" }} />
            <span style={{ color: "#0d1b3e", fontWeight: 600 }}>Loading listings...</span>
          </div>
        ) : (
          <div className="listings-grid">
            {listings.map((listing) => {
              const isActive = listing.status === "ACTIVE";
              const daysLeft = getDaysLeft(listing.deadline);
              const isConfirmingDelete = confirmDeleteId === listing.id;

              return (
                <div key={listing.id} style={{
                  background: isActive ? "#1e3a7a" : "#2d3748",
                  borderRadius: 16, padding: "18px 20px",
                  display: "flex", flexDirection: "column", gap: 12,
                  border: isActive ? "1px solid rgba(26,175,107,0.2)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0, lineHeight: 1.3 }}>{listing.title}</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 10px", marginTop: 6, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                        {listing.location && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin style={{ width: 12, height: 12 }} />{listing.location}
                          </span>
                        )}
                        {listing.duration && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock style={{ width: 12, height: 12 }} />{listing.duration}
                          </span>
                        )}
                        {listing.work_mode && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Monitor style={{ width: 12, height: 12 }} />{listing.work_mode}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        background: isActive ? "#1aaf6b" : "rgba(255,255,255,0.15)", color: "#fff",
                      }}>{listing.status}</span>
                      {listing.is_siwes && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>SIWES</span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {listing.description && (
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>{listing.description}</p>
                  )}

                  {/* Skills */}
                  {(listing.required_skills ?? []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {listing.required_skills.map((skill) => (
                        <span key={skill} style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 6,
                          background: isActive ? "rgba(59,107,212,0.5)" : "rgba(255,255,255,0.1)",
                          color: isActive ? "#93c5fd" : "rgba(255,255,255,0.6)",
                        }}>{skill}</span>
                      ))}
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 4 }}>
                    <div style={{ display: "flex", gap: 20 }}>
                      <div>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 2px" }}>Applications</p>
                        <p style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>{listing.application_count}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 2px" }}>Slots</p>
                        <p style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>{listing.slots}</p>
                      </div>
                    </div>
                    {isActive && daysLeft !== null && (
                      <p style={{ fontWeight: 800, fontSize: 16, margin: 0, color: daysLeft <= 5 ? "#f87171" : "rgba(255,255,255,0.7)" }}>{daysLeft}d left</p>
                    )}
                  </div>

                  {/* Delete confirmation banner */}
                  {isConfirmingDelete && (
                    <div style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <AlertTriangle style={{ width: 15, height: 15, color: "#f87171", flexShrink: 0 }} />
                      <span style={{ color: "#fca5a5", fontSize: 12, flex: 1 }}>Delete this listing? This cannot be undone.</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="listing-action-btn" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        <button
                          className="listing-action-btn"
                          style={{ background: "#7f1d1d", color: "#fca5a5" }}
                          disabled={deletingId === listing.id}
                          onClick={() => handleDelete(listing.id)}
                        >
                          {deletingId === listing.id ? <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />Deleting...</> : "Yes, Delete"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    {isActive ? (
                      <>
                        <a href="/applications" style={{ textDecoration: "none" }}>
                          <button className="listing-action-btn" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                            <Eye style={{ width: 13, height: 13 }} /> View Applications
                          </button>
                        </a>
                        <button
                          className="listing-action-btn"
                          style={{ background: "rgba(59,107,212,0.3)", color: "#93c5fd" }}
                          onClick={() => setEditingListing(listing)}
                        >
                          <Pencil style={{ width: 13, height: 13 }} /> Edit
                        </button>
                        <button
                          className="listing-action-btn"
                          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                          onClick={() => handleClose(listing.id)}
                          disabled={closingId === listing.id}
                        >
                          {closingId === listing.id ? <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />Closing...</> : "Close Listing"}
                        </button>
                        <button
                          className="listing-action-btn"
                          style={{ background: "rgba(248,113,113,0.12)", color: "#f87171", marginLeft: "auto" }}
                          onClick={() => setConfirmDeleteId(listing.id)}
                          disabled={deletingId === listing.id}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} /> Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="listing-action-btn" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                          <Eye style={{ width: 13, height: 13 }} /> View Archive
                        </button>
                        <button
                          className="listing-action-btn"
                          style={{ background: "rgba(248,113,113,0.12)", color: "#f87171", marginLeft: "auto" }}
                          onClick={() => setConfirmDeleteId(listing.id)}
                          disabled={deletingId === listing.id}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Post New card */}
            <div
              style={{ background: "rgba(255,255,255,0.35)", border: "2px dashed rgba(0,0,0,0.15)", borderRadius: 16, minHeight: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", transition: "opacity 0.2s" }}
              onClick={() => setShowPostModal(true)}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PlusCircle style={{ width: 28, height: 28, color: "#0d1b3e" }} />
              </div>
              <p style={{ fontWeight: 700, color: "#0d1b3e", margin: 0 }}>Post New Listing</p>
            </div>
          </div>
        )}

        {showPostModal && <PostListingModal onClose={() => { setShowPostModal(false); loadListings(); }} />}
        {editingListing && <PostListingModal listing={editingListing} onClose={() => { setEditingListing(null); loadListings(); }} />}
      </div>
    </>
  );
}
