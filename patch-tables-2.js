const fs = require('fs');
const path = require('path');

const modules = [
  { varName: 'ticket', route: 'service-desk', idProp: 'id' },
  { varName: 'asset', route: 'cmdb', idProp: 'id' },
];

const appDir = path.join(__dirname, 'src', 'app', '(authenticated)');

modules.forEach(mod => {
  const pagePath = path.join(appDir, mod.route, 'page.tsx');
  if (fs.existsSync(pagePath)) {
    let content = fs.readFileSync(pagePath, 'utf8');
    
    // Add import
    if (!content.includes('import RowActions')) {
      content = content.replace('export default', 'import RowActions from "../problems/RowActions";\n\nexport default');
    }

    // Add TH
    if (!content.includes('>Ações</th>')) {
      content = content.replace(/<\/tr>\s*<\/thead>/, '  <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>\n              </tr>\n            </thead>');
    }

    // Add TD
    if (!content.includes('<RowActions')) {
      const trRegex = new RegExp(`(<tr key={${mod.varName}\\.id}[^>]*>[\\s\\S]*?)(<\\/tr>)`, 'g');
      content = content.replace(trRegex, (match, p1, p2) => {
        // Find the last </td> and insert right after it
        const lastTdIndex = p1.lastIndexOf('</td>');
        if (lastTdIndex !== -1) {
            const before = p1.substring(0, lastTdIndex + 5);
            const after = p1.substring(lastTdIndex + 5);
            const routeName = mod.route === 'service-desk' ? 'tickets' : (mod.route === 'cmdb' ? 'assets' : mod.route);
            return before + `\n                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <RowActions id={${mod.varName}.id} route="${routeName}" />
                  </td>` + after + p2;
        }
        return match;
      });
    }

    fs.writeFileSync(pagePath, content);
  }
});
console.log("Service Desk and CMDB Pages patched with RowActions.");
