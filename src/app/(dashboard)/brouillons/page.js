"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileEdit, Loader2, Trash2, MapPin, Briefcase, Calendar, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteJob } from "@/lib/actions/candidate";
import { useToast } from "@/components/ui/Toast";

export default function BrouillonsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDrafts();
  }, []);

  async function loadDrafts() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (data) setDrafts(data);
    }
    setLoading(false);
  }

  async function handleDelete(e, jobId) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Supprimer ce brouillon ?")) return;
    setDeletingId(jobId);
    const res = await deleteJob(jobId);
    if (res.success) {
      setDrafts(prev => prev.filter(d => d.id !== jobId));
      toast("Brouillon supprimé");
    } else {
      toast(res.error || "Erreur lors de la suppression", "error");
    }
    setDeletingId(null);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Brouillons</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Reprenez vos demandes en cours de création.</p>
      </div>

      {drafts.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', marginBottom: '1.5rem' }}>
            <FileEdit size={32} style={{ color: 'var(--muted-foreground)' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Aucun brouillon</h2>
          <p style={{ color: 'var(--muted-foreground)', maxWidth: '400px', margin: '0 auto' }}>
            Quand vous enregistrez une demande sans l'envoyer, elle apparaîtra ici.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {drafts.map(draft => {
            const isDeleting = deletingId === draft.id;
            return (
              <Link
                key={draft.id}
                href={`/demandes/${draft.id}`}
                style={{ textDecoration: 'none', opacity: isDeleting ? 0.5 : 1 }}
              >
                <div className="card card-hover" style={{ height: '100%', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: '#f1f5f9', color: 'var(--muted-foreground)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <PenLine size={20} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge badge-muted">Brouillon</span>
                      <button
                        onClick={(e) => handleDelete(e, draft.id)}
                        title="Supprimer"
                        style={{ background: 'transparent', border: 'none', padding: '4px', color: 'var(--muted-foreground)', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--destructive)'; e.currentTarget.style.background = '#fee2e2'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        {isDeleting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--foreground)', marginBottom: '0.5rem' }}>
                    {draft.title || "Sans titre"}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
                    {draft.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                        <MapPin size={14} /> {draft.location}
                      </div>
                    )}
                    {draft.contract_type && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                        <Briefcase size={14} /> {draft.contract_type}
                      </div>
                    )}
                  </div>

                  <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                    <Calendar size={14} />
                    Créé le {new Date(draft.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
