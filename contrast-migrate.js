const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      filelist = walkSync(filePath, filelist);
    } else {
      if (file.endsWith('.tsx')) {
        filelist.push(filePath);
      }
    }
  });
  return filelist;
};

const pages = walkSync('src/app');

const replaceMap = {
  'bg-primary text-white': 'bg-primary text-primary-foreground',
  'text-white': 'text-primary-foreground',
  'bg-white': 'bg-surface',
  'text-black': 'text-foreground',
};

pages.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;

  for (const [search, replace] of Object.entries(replaceMap)) {
    const regex = new RegExp(`\\b${search}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      updated = true;
    }
  }

  // Handle ring-gray-X
  if (content.match(/\bring-gray-\d+\b/g)) {
     content = content.replace(/\bring-gray-\d+\b/g, 'ring-input');
     updated = true;
  }
  
  // Handle text-gray-X that might have been missed
  if (content.match(/\btext-gray-900\b/g)) {
     content = content.replace(/\btext-gray-900\b/g, 'text-foreground');
     updated = true;
  }
  if (content.match(/\btext-gray-800\b/g) || content.match(/\btext-gray-700\b/g)) {
     content = content.replace(/\btext-gray-[87]00\b/g, 'text-foreground');
     updated = true;
  }
  if (content.match(/\btext-gray-600\b/g) || content.match(/\btext-gray-500\b/g) || content.match(/\btext-gray-400\b/g)) {
     content = content.replace(/\btext-gray-[654]00\b/g, 'text-muted-foreground');
     updated = true;
  }
  if (content.match(/\bdivide-gray-200\b/g)) {
     content = content.replace(/\bdivide-gray-\d+\b/g, 'divide-border');
     updated = true;
  }

  // fix focus:ring-blue-600
  if (content.match(/\bfocus:ring-blue-600\b/g)) {
     content = content.replace(/\bfocus:ring-blue-600\b/g, 'focus:ring-primary');
     updated = true;
  }
  
  // fix text-blue-800 or text-blue-600
  if (content.match(/\btext-blue-600\b/g)) {
     content = content.replace(/\btext-blue-600\b/g, 'text-primary');
     updated = true;
  }
  if (content.match(/\btext-blue-800\b/g)) {
     content = content.replace(/\btext-blue-800\b/g, 'text-primary');
     updated = true;
  }
  
  if (content.match(/\bbg-blue-100\b/g)) {
     content = content.replace(/\bbg-blue-100\b/g, 'bg-primary/20');
     updated = true;
  }

  if (updated) {
    fs.writeFileSync(file, content);
    console.log(`Cleaned up hardcoded styles in ${file}`);
  }
});
