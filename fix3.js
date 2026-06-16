const fs = require('fs'); 
const file = 'src/lib/recommendationEngine.js'; 
let content = fs.readFileSync(file, 'utf8'); 
content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$'); 
fs.writeFileSync(file, content);
