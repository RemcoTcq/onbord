"use server";

import { createClient } from "@/lib/supabase/server";
import anthropic from "../anthropic";
import { deductCredits } from "../utils/limits";

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

export async function scoreCandidate(jobId, cvText, jobData, candidateName, existingCandidateId = null) {
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
Expérience requise : ${jobData.experience_level} ${jobData.years_of_experience ? `(${jobData.years_of_experience})` : ''}
Diplôme requis : ${jobData.education_level}
${jobData.contract_type ? `Type de contrat : ${jobData.contract_type}` : ''}

Hard Skills :
${jobData.hard_skills ? jobData.hard_skills.map(s => `- ${s.name} (${s.priority})`).join('\n') : 'Non spécifié'}

Soft Skills :
${jobData.soft_skills ? jobData.soft_skills.map(s => `- ${s.name} (${s.priority})`).join('\n') : 'Non spécifié'}

Langues :
${jobData.languages ? jobData.languages.map(l => `- ${l.name} (Niveau ${l.level})`).join('\n') : 'Non spécifié'}

CRITÈRES DE SÉLECTION (Utilisez UNIQUEMENT ces critères pour calculer le score final) :
${jobData.selection_criteria ? jobData.selection_criteria.map(c => `- ${c.name} (Poids: ${c.weight}%)`).join('\n') : 'Non spécifié'}

IMPORTANT : Le score final doit être la moyenne pondérée des scores de 0 à 100 attribués à chaque critère ci-dessus.

Retournez l'évaluation sous forme de JSON strict avec cette structure exacte :
{
  "first_name": "Prénom du candidat (Extrait du profil, ou inconnu)",
  "last_name": "Nom de famille (Extrait du profil, ou inconnu)",
  "email": "Adresse email si trouvée, sinon null",
  "score": nombre entier de 0 à 100 (moyenne pondérée),
  "criteria_breakdown": [
    { "name": "Nom du critère 1", "score": 0-100, "reason": "Pourquoi cette note ?" },
    { "name": "Nom du critère 2", "score": 0-100, "reason": "Pourquoi cette note ?" }
  ],
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

    let candidate;
    let candidateError;

    if (existingCandidateId) {
      // UPDATE existing candidate (self-serve flow: candidate uploaded their own CV)
      const { data, error } = await supabase
        .from('candidates')
        .update({
          cv_raw_text: cvText,
          score_cv: evaluation.score,
          green_flags: evaluation.green_flags,
          yellow_flags: evaluation.yellow_flags,
          red_flags: evaluation.red_flags,
          ai_summary: evaluation.ai_summary,
          cv_score_breakdown: evaluation.criteria_breakdown,
          status: 'scored',
        })
        .eq('id', existingCandidateId)
        .select()
        .single();
      candidate = data;
      candidateError = error;
    } else {
      // INSERT new candidate (legacy flow: recruiter imports CSV)
      const { data, error } = await supabase
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
          cv_score_breakdown: evaluation.criteria_breakdown,
          status: 'scored'
        })
        .select()
        .single();
      candidate = data;
      candidateError = error;
    }

    if (candidateError) {
      console.error("Supabase Error:", candidateError);
      throw new Error("Impossible d'enregistrer le candidat en base de données.");
    }

    // ★ Déduire 1 crédit CV (idempotent via flag credits_charged_cv)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await deductCredits(user.id, candidate.id, "cv_screening");
    }

    return { success: true, candidate };
  } catch (error) {
    console.error("Score Candidate Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create an empty candidate "shell" with a unique token for the self-serve flow.
 * The recruiter sends the link; the candidate fills their info via the assessment page.
 */
export async function createCandidateShell(jobId, firstName, lastName, email) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    // Generate a unique interview token
    const token = crypto.randomUUID().replace(/-/g, '');

    // 5 days from now
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert({
        job_id: jobId,
        first_name: firstName || 'Candidat',
        last_name: lastName || '',
        email: email || null,
        interview_token: token,
        interview_expires_at: expiresAt,
        status: 'invited',
        assessment_status: 'pending',
        score_cv: null,
        score_global: null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, candidate };
  } catch (err) {
    console.error("createCandidateShell error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Public action for candidates to apply for a job.
 * Does not require authentication.
 */
export async function applyForJob(jobId, firstName, lastName, email) {
  try {
    const supabase = await createClient();

    // Verify job exists
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) throw new Error("Offre d'emploi introuvable");

    // Generate a unique interview token
    const token = crypto.randomUUID().replace(/-/g, '');

    // 5 days from now
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert({
        job_id: jobId,
        first_name: firstName || 'Candidat',
        last_name: lastName || '',
        email: email || null,
        interview_token: token,
        interview_expires_at: expiresAt,
        status: 'invited',
        assessment_status: 'pending',
        score_cv: null,
        score_global: null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, candidate };
  } catch (err) {
    console.error("applyForJob error:", err);
    return { success: false, error: err.message };
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

    // Get messages from transcript field
    let messages = [];
    if (candidate && candidate.interview_transcript) {
      try {
        messages = typeof candidate.interview_transcript === 'string' 
          ? JSON.parse(candidate.interview_transcript) 
          : candidate.interview_transcript;
      } catch (e) {
        console.error("Error parsing transcript:", e);
        messages = [];
      }
    }

    // Fetch test sessions
    let testSessions = [];
    const { data: tests } = await supabase
      .from('candidate_test_sessions')
      .select('*, assessment_tests(name, category)')
      .eq('candidate_id', candidateId);
    if (tests) testSessions = tests;

    return { 
      success: true, 
      candidate: { 
        ...candidate, 
        interview_messages: messages,
        test_sessions: testSessions
      } 
    };
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
