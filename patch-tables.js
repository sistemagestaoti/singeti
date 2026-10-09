const fs = require('fs');
const path = require('path');

const modules = [
  { varName: 'problem', route: 'problems' },
  { varName: 'change', route: 'changes' },
  { varName: 'contract', route: 'contracts' },
  { varName: 'supplier', route: 'suppliers' },
  { varName: 'project', route: 'projects' },
  { varName: 'article', route: 'knowledge' },
  { varName: 'booking', route: 'bookings' },
];

const appDir = path.join(__dirname, 'src', 'app', '(authenticated)');

modules.forEach(mod => {
  const pagePath = path.join(appDir, mod.route, 'page.tsx');
  if (fs.existsSync(pagePath)) {
    let content = fs.readFileSync(pagePath, 'utf8');
    
    // Add import
    if (!content.includes('import RowActions')) {
      content = content.replace('export default', 'import RowActions from "./RowActions";\n\nexport default');
    }

    // Add TH
    if (!content.includes('>Ações</th>')) {
      content = content.replace(/<\/tr>\s*<\/thead>/, '  <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>\n              </tr>\n            </thead>');
    }

    // Add TD
    if (!content.includes('<RowActions')) {
      const tdRegex = new RegExp(`(<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{${mod.varName}.*?|<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">.*?)(<\/td>)`, 'g');
      
      // We'll just replace the last </td> of the row with itself + the new action column
      // To be safe, we find the tr mapping:
      const trRegex = new RegExp(`(<tr key={${mod.varName}\\.id}[^>]*>[\\s\\S]*?)(<\\/tr>)`, 'g');
      content = content.replace(trRegex, (match, p1, p2) => {
        return p1 + `  <td className="px-6 py-4 whitespace-nowrap text-right">
                        <RowActions id={${mod.varName}.id} route="${mod.route}" />
                      </td>\n                    ` + p2;
      });
    }

    fs.writeFileSync(pagePath, content);
  }
});
console.log("Pages patched with RowActions.");
