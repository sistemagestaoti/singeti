const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let c = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let initial = content;
  content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
  if (content !== initial) {
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
    c++;
  }
});
console.log('Total Fixed files:', c);
