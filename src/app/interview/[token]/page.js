// Legacy interview route — redirects to the unified assessment page.
// Old links (sent before the assessment module) still work via this redirect.
"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LegacyInterviewPage() {
  const { token } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (token) router.replace(`/assessment/${token}`);
  }, [token]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <Loader2 size={28} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
    </div>
  );
}
