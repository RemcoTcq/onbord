const fs = require('fs'); 
const file = 'src/components/jobs/JobFormStepRecommendation.js'; 
let content = fs.readFileSync(file, 'utf8'); 
content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$'); 
fs.writeFileSync(file, content);
