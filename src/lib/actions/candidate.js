"use server";

import { createClient } from "@/lib/supabase/server";
import anthropic from "../anthropic";

export async function deleteJob(jobId) {
  try {
    const supabase = await createClient();
    
    // Check if user owns the job
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // 1. Get all candidates to cleanup their storage files
    const { data: candidates } = await supabase
      .from('candidates')
      .select('cv_storage_path')
      .eq('job_id', jobId);

    if (candidates && candidates.length > 0) {
      const filePaths = candidates
        .map(c => c.cv_storage_path)
        .filter(path => !!path);
      
      if (filePaths.length > 0) {
        // Delete from storage
        await supabase.storage.from('resumes').remove(filePaths);
      }
    }

    // 2. Delete related data (CASCADE usually handles this but we're being explicit)
    // mail_logs, interviews, etc. are linked via ON DELETE CASCADE in the DB
    await supabase.from('candidates').delete().eq('job_id', jobId);
    await supabase.from('job_skills').delete().eq('job_id', jobId);
    
    // 3. Delete the job and verify RLS
    const { error, count } = await supabase
      .from('jobs')
      .delete({ count: 'exact' })
      .eq('id', jobId)
      .eq('user_id', user.id);
      
    if (error) throw error;
    
    if (count === 0) {
      return { 
        success: false, 
        error: "Suppression impossible ou permission refusée." 
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Delete Job Error:", error);
    return { success: false, error: error.message };
  }
}

export async function scoreCandidate(jobId, cvText, jobData, candidateName) {
  try {
    const prompt = `Voici le texte extrait du profil candidat à analyser :\n\n${cvText}`;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      temperature: 0.1,
      system: `Vous êtes un recruteur expert très rigoureux. Votre mission est d'évaluer un CV candidat face à une offre d'emploi précise.
Vous devez être particulièrement strict sur les 'Must Have' techniques. Si un 'Must Have' technique est manquant, le score doit être fortement pénalisé et cela doit apparaître dans les 'red_flags'.
ATTENTION SOFT SKILLS : Si les soft skills ne sont pas mentionnées dans le CV ou très peu, ne les mettez PAS en 'red_flags'. Classifiez-les comme 'Points d'attention' dans les 'yellow_flags' afin que le recruteur puisse les vérifier en entretien.

L'offre d'emploi :
Titre : ${jobData.title}
Domaine : ${jobData.category}
Expérience requise : ${jobData.experience_level}
Diplôme requis : ${jobData.education_level}
${jobData.talent_type === 'etudiant' ? "\nATTENTION CRITIQUE : Il s'agit d'un JOB ÉTUDIANT. Vous ne devez en aucun cas pénaliser le candidat pour un manque d'expérience professionnelle préalable. Évaluez plutôt son adéquation via ses études, ses projets académiques, ses soft skills et sa motivation." : ""}

Hard Skills :
${jobData.hard_skills ? jobData.hard_skills.map(s => `- ${s.name} (${s.priority})`).join('\n') : 'Non spécifié'}

Soft Skills :
${jobData.soft_skills ? jobData.soft_skills.map(s => `- ${s.name} (${s.priority})`).join('\n') : 'Non spécifié'}

Langues :
${jobData.languages ? jobData.languages.map(l => `- ${l.name} (Niveau ${l.level})`).join('\n') : 'Non spécifié'}

Retournez l'évaluation sous forme de JSON strict avec cette structure exacte :
{
  "first_name": "Prénom du candidat (Extrait du profil, ou inconnu)",
  "last_name": "Nom de famille (Extrait du profil, ou inconnu)",
  "email": "Adresse email si trouvée, sinon null",
  "score": nombre entier de 0 à 100,
  "ai_summary": "Un résumé de 3-4 lignes de l'adéquation du profil.",
  "green_flags": ["point fort 1", "point fort 2"],
  "yellow_flags": ["point d'attention 1", "point d'attention 2"],
  "red_flags": ["critère éliminatoire 1"]
}`,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const messageContent = response.content[0].text;
    
    // Log the raw response to help debugging
    console.log("Raw AI Response:", messageContent);
    
    // Extract JSON from response
    const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", messageContent);
      throw new Error("L'IA n'a pas renvoyé un format JSON valide. Réponse brute : " + messageContent.substring(0, 100) + "...");
    }

    let evaluation;
    try {
      // Nettoyer d'éventuels caractères de contrôle invalides avant de parser
      const cleanJsonStr = jsonMatch[0].replace(/[\u0000-\u001F]+/g, " ");
      evaluation = JSON.parse(cleanJsonStr);
    } catch (parseError) {
      console.error("JSON Parse error:", parseError, "for string:", jsonMatch[0]);
      throw new Error("Le JSON renvoyé par l'IA est mal formaté.");
    }

    // Save to Supabase
    const supabase = await createClient();
    
    // Extract first/last name if the AI couldn't find it but we have the filename
    let finalFirstName = evaluation.first_name && evaluation.first_name !== 'inconnu' ? evaluation.first_name : candidateName.split(' ')[0] || 'Candidat';
    let finalLastName = evaluation.last_name && evaluation.last_name !== 'inconnu' ? evaluation.last_name : candidateName.split(' ').slice(1).join(' ') || 'Inconnu';

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        job_id: jobId,
        first_name: finalFirstName,
        last_name: finalLastName,
        email: evaluation.email,
        cv_raw_text: cvText,
        score_cv: evaluation.score,
        score_global: evaluation.score,
        green_flags: evaluation.green_flags,
        yellow_flags: evaluation.yellow_flags,
        red_flags: evaluation.red_flags,
        ai_summary: evaluation.ai_summary,
        status: 'scored'
      })
      .select()
      .single();

    if (candidateError) {
      console.error("Supabase Error:", candidateError);
      throw new Error("Impossible d'enregistrer le candidat en base de données.");
    }

    return { success: true, candidate };
  } catch (error) {
    console.error("Score Candidate Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getCandidatesForJob(jobId) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('job_id', jobId)
      .order('score_cv', { ascending: false });
    
    if (error) throw error;
    return { success: true, candidates: data };
  } catch (error) {
    console.error("Get Candidates Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getCandidateDetail(candidateId) {
  try {
    const supabase = await createClient();
    const { data: candidate, error } = await supabase
      .from('candidates')
      .select('*, jobs(*)')
      .eq('id', candidateId)
      .single();
    
    if (error) throw error;

    // Fetch messages if there are any
    let messages = [];
    if (candidate && ['interview_started', 'interview_completed'].includes(candidate.status)) {
      const { data: msgs } = await supabase
        .from('interview_messages')
        .select('*')
        .eq('interview_id', candidateId)
        .order('sequence_order', { ascending: true });
      if (msgs) messages = msgs;
    }

    return { success: true, candidate: { ...candidate, interview_messages: messages } };
  } catch (error) {
    console.error("Get Candidate Detail Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getJobDetail(jobId) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) throw error;
    return { success: true, job: data };
  } catch (error) {
    console.error("Get Job Detail Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCandidateStatus(candidateId, status) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', candidateId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, candidate: data };
  } catch (error) {
    console.error("Update Candidate Status Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCandidate(candidateId) {
  try {
    const supabase = await createClient();

    // 1. Get candidate to find storage path
    const { data: candidate } = await supabase
      .from('candidates')
      .select('cv_storage_path')
      .eq('id', candidateId)
      .single();

    if (candidate?.cv_storage_path) {
      await supabase.storage.from('resumes').remove([candidate.cv_storage_path]);
    }
    
    // 2. Delete candidate record
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Delete Candidate Error:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkUpdateCandidateStatus(candidateIds, status) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('candidates')
      .update({ status })
      .in('id', candidateIds);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Bulk Update Error:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkDeleteCandidates(candidateIds) {
  try {
    const supabase = await createClient();

    // 1. Get all storage paths
    const { data: candidates } = await supabase
      .from('candidates')
      .select('cv_storage_path')
      .in('id', candidateIds);

    if (candidates && candidates.length > 0) {
      const filePaths = candidates
        .map(c => c.cv_storage_path)
        .filter(path => !!path);
      
      if (filePaths.length > 0) {
        await supabase.storage.from('resumes').remove(filePaths);
      }
    }
    
    // 2. Delete database records
    const { error } = await supabase
      .from('candidates')
      .delete()
      .in('id', candidateIds);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Bulk Delete Error:", error);
    return { success: false, error: error.message };
  }
}

export async function logMailSent(candidateId, jobId, mailType) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const { error } = await supabase
      .from('mail_logs')
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        user_id: user.id,
        mail_type: mailType
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Log Mail Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMailLogs(jobId) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('mail_logs')
      .select('*')
      .eq('job_id', jobId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return { success: true, logs: data };
  } catch (error) {
    console.error("Get Mail Logs Error:", error);
    return { success: false, error: error.message };
  }
}
