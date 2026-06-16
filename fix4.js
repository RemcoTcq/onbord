const fs = require('fs'); 
const file = 'src/lib/actions/job.js'; 
let content = fs.readFileSync(file, 'utf8'); 
content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$'); 
fs.writeFileSync(file, content);
