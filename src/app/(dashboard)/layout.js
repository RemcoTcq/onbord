"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }) {
  const [userData, setUserData] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      // Load user data from DB
      const { data } = await supabase
        .from("users")
        .select("id, plan, beta_expires_at, onboarding_completed_at, first_name, last_name, company_name, email")
        .eq("id", authUser.id)
        .single();

      if (data) {
        setUserData(data);
      } else {
        // Fallback if user row doesn't exist yet
        setUserData({ id: authUser.id, email: authUser.email, plan: "core" });
      }

      setAuthChecked(true);
    }

    checkSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="spin" size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--background)" }}>
        <Sidebar user={userData} />
        <main style={{ flex: 1, padding: "2rem", paddingLeft: "calc(var(--sidebar-width) + 2rem)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {children}
          </div>
        </main>
        {userData && <OnboardingChecklist user={userData} />}
      </div>
    </ToastProvider>
  );
}
