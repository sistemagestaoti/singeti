const fs = require('fs');
let c = fs.readFileSync('src/app/(authenticated)/service-desk/[id]/page.tsx', 'utf8');

c = c.replace('</span>\r\n      </div>', '</span>\n          <TicketActionClient ticketId={ticket.id} currentStatus={ticket.status} />\n        </div>\n      </div>');
c = c.replace('</span>\n      </div>', '</span>\n          <TicketActionClient ticketId={ticket.id} currentStatus={ticket.status} />\n        </div>\n      </div>');

c = c.replace('<span className={`inline-flex', '<div className="flex items-center gap-4 flex-wrap">\n          <span className={`inline-flex');

fs.writeFileSync('src/app/(authenticated)/service-desk/[id]/page.tsx', c);
