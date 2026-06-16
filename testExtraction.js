require('dotenv').config({ path: '.env.local' });
const { analyzeJobDescription } = require('./src/lib/actions/job.js');

(async () => {
  const text = "Recherche un développeur Next.js. Maîtrise de la Plomberie exigée. Fortes compétences en gestion du stress.";
  try {
    const res = await analyzeJobDescription(text);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
