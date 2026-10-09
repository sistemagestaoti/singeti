const http = require('http');

const data = JSON.stringify({
  title: "API Test",
  description: "Testing POST api/tickets",
  type: "INCIDENT",
  priority: "MEDIUM",
  urgency: "MEDIUM",
  impact: "MEDIUM",
  category_id: "",
  asset_id: "",
  group_id: ""
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/tickets',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', console.error);
req.write(data);
req.end();
