import { useEffect, useState } from "react";
import { CheckCircle2, TrendingUp, AlertCircle, Loader2, MapPin, Clock, Monitor, Hand } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

interface Listing {
  id: string;
  title: string;
  location: string;
  duration: string;
  work_mode: string;
  required_skills: string[];
  slots: number;
  deadline: string;
  status: string;
  application_count: number;
}

interface Activity {
  id: string;
  text: string;
  time: string;
  icon: typeof CheckCircle2;
  color: string;
}

export function Dashboard() {
  const { user, orgProfile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState({ totalApplications: 0, activeListings: 0, pendingReviews: 0, currentInterns: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // organisation_profiles.id = auth.users.id
      const { data: listingsData } = await supabase
        .from("internship_listings")
        .select("*")
        .eq("organisation_id", user!.id)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(3);

      const activeListings = listingsData ?? [];
      const listingIds = activeListings.map((l: any) => l.id);

      // Application counts per listing
      const listingsWithCounts = await Promise.all(
        activeListings.map(async (l: any) => {
          const { count } = await supabase
            .from("applications")
            .select("*", { count: "exact", head: true })
            .eq("listing_id", l.id);
          return { ...l, application_count: count ?? 0 };
        })
      );
      setListings(listingsWithCounts);

      // Stats
      const { count: totalListings } = await supabase
        .from("internship_listings")
        .select("*", { count: "exact", head: true })
        .eq("organisation_id", user!.id)
        .eq("status", "ACTIVE");

      let totalApps = 0, pendingApps = 0, acceptedApps = 0;
      if (listingIds.length > 0) {
        const { count: ta } = await supabase.from("applications").select("*", { count: "exact", head: true }).in("listing_id", listingIds);
        const { count: pa } = await supabase.from("applications").select("*", { count: "exact", head: true }).in("listing_id", listingIds).eq("status", "Pending");
        const { count: aa } = await supabase.from("applications").select("*", { count: "exact", head: true }).in("listing_id", listingIds).eq("status", "Accepted");
        totalApps = ta ?? 0;
        pendingApps = pa ?? 0;
        acceptedApps = aa ?? 0;
      }

      setStats({ totalApplications: totalApps, activeListings: totalListings ?? 0, pendingReviews: pendingApps, currentInterns: acceptedApps });

      // Recent activity
      if (listingIds.length > 0) {
        const { data: recentApps } = await supabase
          .from("applications")
          .select("*, internship_listings(title), student_profiles(first_name, last_name)")
          .in("listing_id", listingIds)
          .order("applied_at", { ascending: false })
          .limit(5);

        const activityList: Activity[] = (recentApps ?? []).map((app: any) => {
          const studentName = app.student_profiles ? `${app.student_profiles.first_name} ${app.student_profiles.last_name}` : "A student";
          const listingTitle = app.internship_listings?.title ?? "a role";
          const timeAgo = getTimeAgo(app.applied_at);
          if (app.status === "Accepted") return { id: app.id, text: `${studentName} accepted for ${listingTitle}`, time: timeAgo, icon: CheckCircle2, color: "#1aaf6b" };
          if (app.status === "Rejected") return { id: app.id, text: `${studentName} was rejected for ${listingTitle}`, time: timeAgo, icon: AlertCircle, color: "#f87171" };
          return { id: app.id, text: `New application from ${studentName} for ${listingTitle}`, time: timeAgo, icon: TrendingUp, color: "#3b82f6" };
        });
        setActivities(activityList);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadDashboard();

    const channel = supabase
      .channel('org-dash-apps')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => loadDashboard(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  };

  const getDaysLeft = (deadline: string) => {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const statCards = [
    { label: "TOTAL APPLICATIONS", value: stats.totalApplications.toString(), highlight: true },
    { label: "ACTIVE LISTINGS", value: stats.activeListings.toString(), highlight: false },
    { label: "PENDING REVIEWS", value: stats.pendingReviews.toString(), highlight: false },
    { label: "CURRENT INTERNS", value: stats.currentInterns.toString(), highlight: false },
  ];

  return (
    <>
      <style>{`
        .dash-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 1024px) { .dash-stats { grid-template-columns: repeat(4, 1fr); } }
        .dash-body { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 1024px) { .dash-body { grid-template-columns: 2fr 1fr; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
          <Loader2 style={{ width: 24, height: 24, color: "#1aaf6b", animation: "spin 1s linear infinite" }} />
          <span style={{ color: "#0d1b3e", fontWeight: 600 }}>Loading dashboard...</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {orgProfile && (
            <div className="rounded-xl px-5 py-4" style={{ background: "linear-gradient(135deg, #1e3a7a 0%, #0d1b3e 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <Hand style={{ width: 13, height: 13 }} /> Welcome back
              </p>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: 0 }}>{orgProfile.name}</p>
            </div>
          )}

          <div className="dash-stats">
            {statCards.map((stat) => (
              <div key={stat.label} className="rounded-xl px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-1" style={{ background: stat.highlight ? "#3b6fd4" : "rgba(255,255,255,0.55)", backdropFilter: "blur(8px)" }}>
                <p className="text-xs font-bold tracking-wider" style={{ color: stat.highlight ? "rgba(255,255,255,0.85)" : "#1e3a7a" }}>{stat.label}</p>
                <p className="text-3xl sm:text-4xl font-black mt-1" style={{ color: stat.highlight ? "#fff" : "#0d1b3e", fontFamily: "'Courier New', monospace", letterSpacing: "-1px" }}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="dash-body">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm sm:text-base" style={{ color: "#0d1b3e" }}>ACTIVE LISTINGS</h2>
                <a href="/listings" className="text-xs sm:text-sm font-semibold" style={{ color: "#3b6fd4" }}>View All &gt;</a>
              </div>

              {listings.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: "rgba(255,255,255,0.55)" }}>
                  <p style={{ color: "#0d1b3e", fontWeight: 600, marginBottom: 4 }}>No active listings yet</p>
                  <p style={{ color: "rgba(13,27,62,0.5)", fontSize: 13 }}>Post your first internship to get started</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {listings.map((listing) => (
                    <div key={listing.id} className="rounded-xl p-4 sm:p-5" style={{ background: "#1e3a7a" }}>
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="min-w-0">
                          <h3 className="text-white font-bold text-sm sm:text-base leading-snug">{listing.title}</h3>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <MapPin style={{ width: 12, height: 12 }} />{listing.location}
                            </span>
                            {listing.duration && <>
                              <span>·</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Clock style={{ width: 12, height: 12 }} />{listing.duration}
                              </span>
                            </>}
                            {listing.work_mode && <>
                              <span>·</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Monitor style={{ width: 12, height: 12 }} />{listing.work_mode}
                              </span>
                            </>}
                          </div>
                        </div>
                        <span className="text-xs font-bold px-2 sm:px-3 py-1 rounded-full flex-shrink-0" style={{ background: "#1aaf6b", color: "#fff" }}>ACTIVE</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 my-3">
                        {(listing.required_skills ?? []).map((skill) => (
                          <span key={skill} className="text-xs px-2 sm:px-2.5 py-1 rounded" style={{ background: "rgba(59,107,212,0.55)", color: "#93c5fd" }}>{skill}</span>
                        ))}
                      </div>

                      <div className="flex items-end justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                        <div className="flex gap-4 sm:gap-6">
                          <div>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Applications</p>
                            <p className="text-white font-bold text-base sm:text-lg">{listing.application_count}</p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Slots</p>
                            <p className="text-white font-bold text-base sm:text-lg">{listing.slots}</p>
                          </div>
                        </div>
                        {getDaysLeft(listing.deadline) !== null && (
                          <p className="font-black text-base sm:text-lg" style={{ color: "#f87171" }}>{getDaysLeft(listing.deadline)}d left</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="rounded-xl p-4 sm:p-5" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}>
                <h2 className="font-black text-center text-sm sm:text-base mb-4" style={{ color: "#0d1b3e" }}>Recent Activities</h2>
                {activities.length === 0 ? (
                  <p style={{ color: "rgba(13,27,62,0.4)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No recent activity yet</p>
                ) : (
                  <div>
                    {activities.map((activity, idx) => {
                      const Icon = activity.icon;
                      return (
                        <div key={activity.id} className="flex gap-3 py-3" style={idx < activities.length - 1 ? { borderBottom: "1px solid rgba(0,0,0,0.07)" } : {}}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: activity.color + "22" }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: activity.color }} />
                          </div>
                          <div>
                            <p className="text-xs font-medium leading-snug" style={{ color: "#0d1b3e" }}>{activity.text}</p>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(0,0,0,0.38)" }}>{activity.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
