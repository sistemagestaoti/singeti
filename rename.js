const fs = require('fs');
const path = require('path');

function replaceInFolder(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      replaceInFolder(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.css') || fullPath.endsWith('.md')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      if (content.includes('SISGETI')) {
        content = content.replace(/SISGETI/g, 'SINGETI');
        changed = true;
      }
      if (content.includes('sisgeti')) {
        content = content.replace(/sisgeti/g, 'singeti');
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}

replaceInFolder(path.join(__dirname, 'src'));
