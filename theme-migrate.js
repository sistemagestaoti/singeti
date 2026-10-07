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
  'bg-white': 'bg-card',
  'bg-gray-50': 'bg-background',
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',
  'text-gray-900': 'text-foreground',
  'text-gray-800': 'text-card-foreground',
  'text-gray-700': 'text-muted-foreground',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-gray-400': 'text-muted-foreground',
  'bg-gray-100': 'bg-muted',
  'bg-gray-200': 'bg-border',
  'text-blue-600': 'text-primary',
  'bg-blue-600': 'bg-primary',
  'hover:bg-blue-500': 'hover:bg-primary/90',
  'hover:text-blue-500': 'hover:text-primary/90',
  'bg-blue-100 text-blue-800': 'bg-accent text-accent-foreground',
  'bg-blue-50': 'bg-accent',
  'text-blue-700': 'text-accent-foreground',
};

pages.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;

  for (const [search, replace] of Object.entries(replaceMap)) {
    // Regex matching class names roughly
    const regex = new RegExp(`\\b${search}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(file, content);
    console.log(`Themed ${file}`);
  }
});
