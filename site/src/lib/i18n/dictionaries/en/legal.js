// English legal pages. Same shape as fr/legal.js — read the comment there
// first: these three URLs are opened by the APPLICATION from the candidate's
// consent screen, so renaming a path here breaks links over there.

const legal = {
  draftNotice:
    "Working draft. The text below describes the service accurately, but it has not yet been reviewed by a lawyer and some details are still missing.",
  todoLabel: "To be completed",
  updatedLabel: "Last updated",
  backToHome: "Back to home",
  tocLabel: "On this page",

  terms: {
    title: "Terms of service",
    updated: "15 September 2026",
    intro:
      "These terms govern the use of Onbord, a platform that assesses candidates through work simulations. They apply both to the client who subscribes and to the candidate invited to take an assessment.",
    sections: [
      {
        h: "1. Who operates the service",
        p: [
          "todo:Legal name, legal form, registered office, company number and VAT number of the operating company.",
          "For any question about these terms: hello@onbord.be.",
        ],
      },
      {
        h: "2. What the service does",
        p: [
          "Onbord turns a job posting into an assessment: it extracts the expected skills, generates a matching work simulation, then scores candidate answers against criteria the client has reviewed and approved.",
          "The client remains solely responsible for the hiring decision. Onbord provides an assessment and the evidence behind it; it does not hire on the client's behalf and guarantees no hiring outcome.",
        ],
      },
      {
        h: "3. Accounts",
        p: [
          "Access to the application is by named account. Accounts are created by Onbord at the client's request; there is no open self-service sign-up.",
          "The client is responsible for keeping its team's credentials confidential and for actions taken from its accounts. Any suspicious use must be reported without delay.",
        ],
      },
      {
        h: "4. Subscription and credits",
        p: [
          "A subscription grants a number of credits per period. A credit is consumed at four moments: generating a simulation (the first time and on every full regeneration), regenerating one step of that simulation, a candidate completing that simulation, and correcting it. All other features are unlimited.",
          "todo:Length of the period, rollover or expiry rule for unused credits, renewal, plan change and cancellation terms, notice period.",
          "todo:Billing and payment terms: due date, payment method, late payment interest, refund policy.",
        ],
      },
      {
        h: "5. Acceptable use",
        p: [
          "The client undertakes to use Onbord only to assess real applications for real openings, and not to discriminate against a candidate on any ground protected by law.",
          "Prohibited: reselling the service, bulk automated extraction of its content, attempts to circumvent subscription limits, and uploading unlawful content in job postings or company profiles.",
        ],
      },
      {
        h: "6. Intellectual property",
        p: [
          "The platform, its code, its assessment models and its interface remain the property of Onbord. A subscription grants a right of use, not a transfer of ownership.",
          "Job postings, company content and candidate data uploaded by the client remain the client's property. Onbord uses them only to deliver the service, within the limits set by the privacy policy.",
        ],
      },
      {
        h: "7. Availability and liability",
        p: [
          "Onbord uses reasonable means to keep the service available, without guaranteeing uninterrupted operation. Maintenance windows may be required.",
          "todo:Liability cap, exclusions (indirect damages, loss of opportunity) and any service level commitment.",
        ],
      },
      {
        h: "8. Governing law",
        p: [
          "These terms are governed by Belgian law.",
          "todo:Competent court in the event of a dispute, and the prior amicable resolution step.",
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy policy",
    updated: "15 September 2026",
    intro:
      "This page explains which personal data Onbord processes, why, for how long, and what you can require. It concerns two very different audiences: the recruiter using the platform, and the candidate taking an assessment.",
    sections: [
      {
        h: "1. Data controller",
        p: [
          "todo:Full identity and contact details of the data controller and, where applicable, of the data protection officer.",
          "For any question, or to exercise your rights: hello@onbord.be.",
          "One distinction that matters: when a client company assesses its candidates with Onbord, that company is the controller for those applications. Onbord then acts as a processor, on its behalf and on its instructions.",
        ],
      },
      {
        h: "2. Data processed",
        p: [
          "Recruiter side: name, work email address, company, interface preferences, service usage logs and billing data.",
          "Candidate side: name, email address, CV and uploaded files, answers written during the simulation, audio or video recordings where an exercise calls for them, transcripts of those recordings, scores and the reasoning attached to them.",
          "No special category data within the meaning of the GDPR is requested. A candidate who spontaneously includes such data in a CV shares it of their own accord; it plays no part in the assessment.",
        ],
      },
      {
        h: "3. Purposes and legal bases",
        p: [
          "Delivering the service — generating the assessment, running it, correcting it, returning results to the recruiter: performance of the contract with the client company, and that company's legitimate interest in assessing its applicants.",
          "Sending messages tied to the process (invitation, reminder, candidate feedback): performance of the contract.",
          "Improving service quality and preventing abuse: legitimate interest, on data kept to the strict minimum.",
        ],
      },
      {
        h: "4. What is never done with your data",
        p: [
          "Candidate data is not sold, rented, or passed to third parties for advertising purposes.",
          "It is not used to train artificial intelligence models: the providers Onbord relies on are bound by contractual commitments excluding training on content submitted through their business interface.",
        ],
      },
      {
        h: "5. Processors",
        p: [
          "Onbord relies on a small number of technical providers, each under a data processing agreement: hosting of the application and the website (Vercel), database and authentication (Supabase), AI-assisted generation and correction (Anthropic), transactional email delivery (Resend).",
          "todo:Processing locations and, for transfers outside the European Economic Area, the legal mechanism relied upon (standard contractual clauses, adequacy decision).",
        ],
      },
      {
        h: "6. Retention",
        p: [
          "A candidate's data is kept for the duration of the hiring process concerned, then deleted or anonymised. An automatic purge runs every night on items that have reached their term.",
          "todo:Exact retention period after a hiring process closes, and retention period for inactive recruiter accounts.",
        ],
      },
      {
        h: "7. Your rights",
        p: [
          "You have the right to access, rectify, erase, restrict, object to and port your data, as well as the right not to be subject to a decision based solely on automated processing (see the AI transparency page).",
          "A candidate should address their request to the company running the assessment, or directly to hello@onbord.be, and we will pass it on.",
          "You may lodge a complaint with the Belgian Data Protection Authority (dataprotectionauthority.be).",
        ],
      },
      {
        h: "8. Cookies",
        p: [
          "The public website uses a single cookie, which remembers the language chosen in the switcher. It is strictly necessary for the site to work and serves no advertising tracking.",
          "todo:To be completed if analytics or marketing tools are added to the site — their presence would make a consent banner mandatory.",
        ],
      },
    ],
  },

  ai: {
    title: "AI transparency",
    updated: "15 September 2026",
    intro:
      "Onbord uses artificial intelligence at several points. This page says which ones, what the machine decides, what it does not decide, and what you can require if an assessment strikes you as unfair.",
    sections: [
      {
        h: "1. Where AI is involved",
        p: [
          "Reading the job posting: a language model extracts the expected skills, the level required and the context of the role.",
          "Building the assessment: the same kind of model writes the scenarios, the instructions and the scoring criteria that follow from it.",
          "Correction: candidate answers are compared against those criteria and produce a score with written reasoning, tied to specific extracts of the answer.",
        ],
      },
      {
        h: "2. What AI does not decide",
        p: [
          "No candidate is ever automatically rejected by Onbord. Onbord only builds a shortlist: the recruiter always makes the final call. The assessment produces the score and the supporting evidence behind that decision, nothing more.",
          "Scoring criteria are reviewed and approved by the recruiter before the first candidate takes the assessment. An assessment never goes live on the model's choices alone.",
        ],
      },
      {
        h: "3. Candidates using AI",
        p: [
          "Simulations allow the use of AI tools, because real work allows them. Trying to ban them would mean assessing a situation that no longer exists.",
          "How well those tools are used is part of what is assessed: knowing what to ask, checking what comes back and fixing what is wrong is a professional skill, treated as one.",
        ],
      },
      {
        h: "4. Known limits",
        p: [
          "A language model can get things wrong: misread an answer written in an unusual style, mistranscribe an audio recording, or apply a criterion too literally.",
          "That is exactly why every score comes with its reasoning and the extract it rests on: a score you cannot trace back to its source should never weigh on a decision.",
        ],
      },
      {
        h: "5. Requesting human review",
        p: [
          "Any candidate may ask for a person to review their assessment, obtain the reasons behind the score, and put their point of view.",
          "The request goes to the company running the hiring process, or to hello@onbord.be, which will pass it on.",
        ],
      },
      {
        h: "6. Model providers",
        p: [
          "The models used are Anthropic's (the Claude family), called through their business interface.",
          "Content submitted is not used to train those models. See the privacy policy for the full list of processors.",
        ],
      },
    ],
  },
};

export default legal;
