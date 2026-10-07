const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      filelist = walkSync(filePath, filelist);
    } else {
      if (file.endsWith('.tsx') && filePath.includes('page.tsx')) {
        filelist.push(filePath);
      }
    }
  });
  return filelist;
};

const pages = walkSync('src/app/(authenticated)');

pages.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Remove the <nav> block completely
  content = content.replace(/<nav[\s\S]*?<\/nav>/g, '');
  // Remove the min-h-screen background since it's in layout
  content = content.replace(/<div className="min-h-screen bg-gray-50">/g, '<div className="flex-1">');
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
