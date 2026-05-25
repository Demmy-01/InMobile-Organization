import { useState, useEffect, useCallback } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCheck,
  PlusCircle,
  Settings as SettingsIcon,
  Search,
  Bell,
  HelpCircle,
  MoreHorizontal,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Megaphone,
  TrendingUp,
} from "lucide-react";
import { PostListingModal } from "./PostListingModal";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

interface OrgNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  listing_id: string | null;
  read: boolean;
  created_at: string;
}

const PAGE_TITLES: Record<string, { title: string; crumb: string }> = {
  "/": { title: "Dashboard", crumb: "Dashboard" },
  "/listings": { title: "My Listings", crumb: "My Listings" },
  "/applications": { title: "Applications", crumb: "Applications" },
  "/interns": { title: "Current Interns", crumb: "Current Interns" },
  "/settings": { title: "Settings", crumb: "Settings" },
};

const navItems = [
  {
    section: "MAIN",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "My Listings", icon: Briefcase, path: "/listings" },
      { label: "Applications", icon: Users, path: "/applications", badge: null as number | null },
    ],
  },
  {
    section: "INTERNS",
    items: [
      { label: "Current Interns", icon: UserCheck, path: "/interns" },
      { label: "Post Listing", icon: PlusCircle, path: "#", isAction: true },
    ],
  },
  {
    section: "ACCOUNT",
    items: [{ label: "Settings", icon: SettingsIcon, path: "/settings" }],
  },
];

const DISMISSED_KEY = "il_dismissed_announcements";
const READ_KEY = "il_read_announcements";

function getDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

// Context-free prop drilling via outlet context
export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, orgProfile, signOut } = useAuth();
  const [showPostModal, setShowPostModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  // Admin announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getDismissedIds());
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds());

  // Org-specific in-app notifications (application milestones)
  const [orgNotifs, setOrgNotifs] = useState<OrgNotification[]>([]);

  const activeBanners = announcements.filter(a => !dismissedIds.has(a.id));
  const dismissedAnnouncements = announcements.filter(a => dismissedIds.has(a.id));
  // Badge = dismissed announcements not read + unread org notifications
  const unreadOrgNotifs = orgNotifs.filter(n => !n.read).length;
  const unreadCount = dismissedAnnouncements.filter(a => !readIds.has(a.id)).length + unreadOrgNotifs;

  const markAsRead = (id: string) => {
    const next = new Set(readIds).add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  const markAllAsRead = () => {
    const next = new Set(readIds);
    dismissedAnnouncements.forEach(a => next.add(a.id));
    setReadIds(next);
    saveReadIds(next);
  };

  const fetchOrgNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("org_notifications")
        .select("id, type, title, body, listing_id, read, created_at")
        .eq("org_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setOrgNotifs(data as OrgNotification[]);
    } catch {
      // table may not exist yet — silently ignore
    }
  }, [user]);

  const markOrgNotifRead = async (id: string) => {
    setOrgNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase.from("org_notifications").update({ read: true }).eq("id", id);
  };

  const markAllOrgNotifsRead = async () => {
    const unreadIds = orgNotifs.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setOrgNotifs(prev => prev.map(n => ({ ...n, read: true })));
    await supabase.from("org_notifications").update({ read: true }).in("id", unreadIds);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("announcements")
          .select("id, title, body, created_at")
          .eq("target_organisations", true)
          .order("created_at", { ascending: false })
          .limit(10);
        if (data) setAnnouncements(data);
      } catch {
        // table may not exist yet
      }
    })();

    fetchOrgNotifs();

    if (!user) return;
    // Realtime: refresh org_notifications when new rows arrive
    const channel = supabase
      .channel("org-notifs-layout")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "org_notifications", filter: `org_id=eq.${user.id}` },
        () => fetchOrgNotifs()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchOrgNotifs]);

  const dismissAnnouncement = (id: string) => {
    const next = new Set(dismissedIds).add(id);
    setDismissedIds(next);
    saveDismissedIds(next);
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const currentPage = PAGE_TITLES[location.pathname] ?? PAGE_TITLES["/"];
  const closeSidebar = () => setSidebarOpen(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const orgName = orgProfile?.name ?? "Organisation";
  const hrName = orgProfile?.hr_manager_name ?? orgName;
  const initials = hrName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const logoUrl = orgProfile?.logo_url ?? null;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <>
      <style>{`
        :root { --sidebar-w: 240px; }
        .il-layout { display: flex; height: 100vh; background: #c8d5e8; overflow: hidden; }
        .il-sidebar {
          width: var(--sidebar-w);
          background: #0d1b3e;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          height: 100%;
          z-index: 40;
          transition: transform 0.28s cubic-bezier(.4,0,.2,1);
        }
        .il-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        .il-backdrop {
          display: none;
          position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          z-index: 35;
        }
        @media (max-width: 1023px) {
          .il-sidebar {
            position: fixed;
            inset-y: 0; left: 0;
            transform: translateX(-100%);
          }
          .il-sidebar.open { transform: translateX(0); }
          .il-backdrop.open { display: block; }
        }
        .il-search-bar { width: 200px; }
        @media (max-width: 767px) { .il-search-bar { display: none; } }
        @media (max-width: 479px) { .il-help-btn { display: none; } }
        .user-menu {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0; right: 0;
          background: #162d6e;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          z-index: 50;
        }
        .user-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          color: rgba(255,255,255,0.7);
          font-size: 13px;
          cursor: pointer;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          transition: background 0.15s;
        }
        .user-menu-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .user-menu-item.danger { color: #f87171; }
        .user-menu-item.danger:hover { background: rgba(248,113,113,0.1); }

        /* Bell dropdown */
        .bell-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 340px;
          background: #0f2150;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.5);
          z-index: 60;
          overflow: hidden;
        }
        .bell-dropdown-header {
          padding: 14px 16px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bell-item {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .bell-item:last-child { border-bottom: none; }
        .bell-item:hover { background: rgba(255,255,255,0.04); }
      `}</style>

      <div className="il-layout">
        <div className={`il-backdrop ${sidebarOpen ? "open" : ""}`} onClick={closeSidebar} />

        <aside className={`il-sidebar ${sidebarOpen ? "open" : ""}`}>
          {/* Logo row */}
          <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#1e3a7a" }}>
              <img src="/images/logo.png" alt="InternLink" className="w-7 h-7 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Intern Link</p>
              <p className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>Organisation Portal</p>
            </div>
            <button onClick={closeSidebar} className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }} aria-label="Close sidebar">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
            {navItems.map((section) => (
              <div key={section.section}>
                <p className="text-xs font-bold tracking-widest mb-2 px-2" style={{ color: "rgba(255,255,255,0.35)" }}>{section.section}</p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    if ((item as any).isAction) {
                      return (
                        <button key={item.label} onClick={() => { setShowPostModal(true); closeSidebar(); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                          style={{ color: "rgba(255,255,255,0.7)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}>
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    }
                    return (
                      <Link key={item.label} to={item.path} onClick={closeSidebar}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                        style={active ? { background: "#1aaf6b", color: "#fff", fontWeight: 600 } : { color: "rgba(255,255,255,0.7)" }}
                        onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#fff"; } }}
                        onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; } }}>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {(item as any).badge !== undefined && (item as any).badge !== null && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#e53e3e", color: "#fff", minWidth: 20, textAlign: "center" }}>
                            {(item as any).badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User profile */}
          <div className="px-4 py-4 relative" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {showUserMenu && (
              <div className="user-menu">
                <Link to="/settings" onClick={() => setShowUserMenu(false)}>
                  <button className="user-menu-item"><SettingsIcon style={{ width: 15, height: 15 }} /> Settings</button>
                </Link>
                <button className="user-menu-item danger" onClick={handleSignOut}>
                  <LogOut style={{ width: 15, height: 15 }} /> Sign Out
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowUserMenu((v) => !v)}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "#2d6bcf", overflow: "hidden" }}>
                {logoUrl ? <img src={logoUrl} alt={orgName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{hrName}</p>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{orgName}</p>
              </div>
              <button className="text-white/40 hover:text-white/80"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="il-main">
          {/* Top Bar */}
          <header className="flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0 gap-3" style={{ background: "#0d1b3e", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3 min-w-0">
              <button className="lg:hidden text-white/70 hover:text-white flex-shrink-0" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-white font-bold text-base sm:text-xl leading-tight truncate">{currentPage.title}</h1>
                <div className="hidden sm:flex items-center gap-1 mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <span className="text-xs">InternLink</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-xs">{orgName}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-xs">{currentPage.crumb}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="il-search-bar relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                <input type="text" placeholder="Search listings, applicants..." className="pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none w-full" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)" }} />
              </div>

              {/* Bell with badge + dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowBellDropdown(v => !v)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative"
                  style={{ background: showBellDropdown ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <Bell className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
                  {/* Badge: dismissed but unread */}
                  {unreadCount > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      background: "#f87171", color: "#fff",
                      fontSize: 10, fontWeight: 700,
                      width: 18, height: 18, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "2px solid #0d1b3e",
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Bell dropdown */}
                {showBellDropdown && (
                  <div className="bell-dropdown">
                    <div className="bell-dropdown-header">
                      <p style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Notifications</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => { markAllAsRead(); markAllOrgNotifsRead(); }}
                            style={{ background: "rgba(26,175,107,0.15)", border: "1px solid rgba(26,175,107,0.3)", borderRadius: 6, cursor: "pointer", color: "#1aaf6b", fontSize: 11, fontWeight: 700, padding: "3px 8px" }}
                          >
                            Mark all as read
                          </button>
                        )}
                        <button onClick={() => setShowBellDropdown(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {dismissedAnnouncements.length === 0 && orgNotifs.length === 0 ? (
                      <div style={{ padding: "28px 16px", textAlign: "center" }}>
                        <Bell style={{ width: 28, height: 28, color: "rgba(255,255,255,0.2)", margin: "0 auto 10px" }} />
                        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>No notifications yet</p>
                      </div>
                    ) : (
                      <div style={{ maxHeight: 360, overflowY: "auto" }}>
                        {/* ── Application milestone notifications ── */}
                        {orgNotifs.map(n => (
                          <div key={n.id} className="bell-item" style={{ background: n.read ? "transparent" : "rgba(59,107,212,0.07)" }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: n.read ? "rgba(255,255,255,0.06)" : "rgba(59,107,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <TrendingUp style={{ width: 15, height: 15, color: n.read ? "rgba(255,255,255,0.3)" : "#93c5fd" }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: n.read ? "rgba(255,255,255,0.5)" : "#fff", fontSize: 13, fontWeight: n.read ? 400 : 600, marginBottom: 2 }}>{n.title}</p>
                              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5, marginBottom: 4 }}>{n.body}</p>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{timeAgo(n.created_at)} · Application Alert</p>
                                {!n.read && (
                                  <button
                                    onClick={() => markOrgNotifRead(n.id)}
                                    style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 600, padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0 }}
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* ── Admin announcements (dismissed ones) ── */}
                        {dismissedAnnouncements.map(a => {
                          const isRead = readIds.has(a.id);
                          return (
                            <div key={a.id} className="bell-item" style={{ background: isRead ? "transparent" : "rgba(26,175,107,0.05)" }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: isRead ? "rgba(255,255,255,0.06)" : "rgba(26,175,107,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Megaphone style={{ width: 15, height: 15, color: isRead ? "rgba(255,255,255,0.3)" : "#1aaf6b" }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: isRead ? "rgba(255,255,255,0.5)" : "#fff", fontSize: 13, fontWeight: isRead ? 400 : 600, marginBottom: 2 }}>{a.title}</p>
                                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5, marginBottom: 4 }}>{a.body}</p>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                  <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{timeAgo(a.created_at)} · InternLink Admin</p>
                                  {!isRead && (
                                    <button
                                      onClick={() => markAsRead(a.id)}
                                      style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 600, padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0 }}
                                    >
                                      Mark as read
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button className="il-help-btn w-9 h-9 rounded-lg items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <HelpCircle className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
              </button>

              <button onClick={() => setShowPostModal(true)} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-white text-xs sm:text-sm font-semibold hover:opacity-90 flex-shrink-0" style={{ background: "#1aaf6b" }}>
                <PlusCircle className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">+ Post Listing</span>
              </button>
            </div>
          </header>

          {/* Active announcement banners (before they're dismissed) */}
          {activeBanners.length > 0 && (
            <div style={{ padding: "10px 16px 0", background: "#c8d5e8", display: "flex", flexDirection: "column", gap: 8 }}>
              {activeBanners.map(a => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  background: "linear-gradient(135deg, #1e3a7a 0%, #0f2150 100%)",
                  borderRadius: 12, padding: "12px 16px",
                  border: "1px solid rgba(26,175,107,0.3)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(26,175,107,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <Megaphone style={{ width: 16, height: 16, color: "#1aaf6b" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{a.title}</p>
                    <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.6, margin: 0 }}>{a.body}</p>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 5 }}>
                      {timeAgo(a.created_at)} · From InternLink Admin
                    </p>
                  </div>
                  <button
                    onClick={() => dismissAnnouncement(a.id)}
                    title="Dismiss (moves to notifications)"
                    style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700, transition: "all 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ background: "#c8d5e8" }}>
            <Outlet />
          </main>
        </div>
      </div>

      {showPostModal && <PostListingModal onClose={() => setShowPostModal(false)} />}
    </>
  );
}
