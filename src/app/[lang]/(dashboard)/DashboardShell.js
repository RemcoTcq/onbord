"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import Sidebar from "@/components/layout/Sidebar";
import CommandPalette from "@/components/layout/CommandPalette";
import { ShellProvider } from "@/components/layout/ShellContext";
import { ToastProvider } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import { claimPendingInvite } from "@/lib/actions/usage";
import { Loader2 } from "lucide-react";

export default function DashboardShell({ children }) {
  const [userData, setUserData] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Le design recruteur est scopé sous `.ds` (cf. app/recruteur.css). On le pose
  // aussi sur <html> : le fond de page et tout ce qui s'affiche en position
  // fixe (fenêtres, toasts) en dépendent. Retiré en quittant le tableau de bord.
  useEffect(() => {
    document.documentElement.classList.add("ds");
    return () => document.documentElement.classList.remove("ds");
  }, []);

  // Liste légère des jobs : menu (jobs récents, compteur) et recherche ⌘K.
  // La policy de lecture exclut d'elle-même les jobs en corbeille.
  const refreshJobs = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("jobs")
      .select("id, title, status, location, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setJobs(data || []);
  }, []);

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      // Invitation mise de côté à l'inscription (/join) et jamais réclamée,
      // faute de session à ce moment-là. C'est ici la PREMIÈRE session réelle du
      // compte : on applique le plan avant de lire la ligne `users`, sinon
      // l'invité verrait le plan par défaut jusqu'à son prochain chargement.
      //
      // Le test se fait sur les métadonnées déjà en main : aucun aller-retour
      // supplémentaire dans le cas courant, qui est l'immense majorité.
      if (authUser.user_metadata?.pending_invite_token) {
        await claimPendingInvite();
      }

      // Load user data from DB
      const { data } = await supabase
        .from("users")
        .select("id, plan, beta_expires_at, onboarding_completed_at, first_name, last_name, company_name, email")
        .eq("id", authUser.id)
        .single();

      if (data) {
        // Sync company_name depuis auth metadata (source de vérité du formulaire branding)
        const authCompanyName = authUser.user_metadata?.company_name;
        if (authCompanyName && data.company_name !== authCompanyName) {
          await supabase.from("users").update({ company_name: authCompanyName }).eq("id", authUser.id);
          data.company_name = authCompanyName;
        }
        setUserData(data);
      } else {
        // Fallback if user row doesn't exist yet
        setUserData({ id: authUser.id, email: authUser.email, plan: "core" });
      }

      setAuthChecked(true);
      refreshJobs();
    }

    checkSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ⌘K / Ctrl K, de partout dans le tableau de bord.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!authChecked) {
    return (
      <div className="ds" style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--ds-page)" }}>
        <Loader2 size={28} style={{ color: "var(--ds-blue)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <ToastProvider>
      <ShellProvider value={{ user: userData, jobs, refreshJobs, openSearch: () => setSearchOpen(true) }}>
        <div className="ds ds-shell">
          <Sidebar />
          <main className="ds-main">
            {children}
          </main>
          {userData && <OnboardingChecklist user={userData} />}
        </div>
        {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} jobs={jobs} />}
      </ShellProvider>
    </ToastProvider>
  );
}
