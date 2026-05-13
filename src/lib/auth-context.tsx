import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface OrgProfile {
  id: string;
  name: string;
  contact_email: string;
  hr_manager_name: string | null;
  logo_url: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  notif_new_apps: boolean;
  notif_deadlines: boolean;
  notif_acceptances: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  orgProfile: OrgProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  orgProfile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [orgProfile, setOrgProfile] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from("organisation_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        setOrgProfile(data);
        return;
      }

      // No profile row exists — auto-create a minimal one so FK constraints
      // on internship_listings (organisation_id) are always satisfiable.
      // This handles accounts created before the ConfirmOtp fix was applied.
      if (error?.code === "PGRST116" || !data) {
        const fallbackEmail = userEmail ?? "";
        const { data: created } = await supabase
          .from("organisation_profiles")
          .upsert(
            {
              id: userId,
              name: "My Organisation",
              contact_email: fallbackEmail,
            },
            { onConflict: "id" }
          )
          .select()
          .single();
        setOrgProfile(created ?? null);
      }
    } catch {
      setOrgProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchOrgProfile(session.user.id, session.user.email ?? "").finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchOrgProfile(session.user.id, session.user.email ?? "");
      else setOrgProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchOrgProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, orgProfile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
