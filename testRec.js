import { generateRecommendation } from './src/lib/recommendationEngine.js';
import { TAXONOMIE_COMPETENCES } from './src/lib/constants/taxonomie.js';

const jobData = {
  hard_skills: [
    { name: "Prospection téléphonique", priority: "must_have", taxonomy_id: "C001" },
    { name: "React.js", priority: "nice_to_have" }
  ],
  soft_skills: [
    { name: "Communication verbale", priority: "must_have" }
  ]
};

try {
  const rec = generateRecommendation(jobData, true);
  console.log(JSON.stringify(rec, null, 2));
} catch (err) {
  console.error("Error:", err);
}
