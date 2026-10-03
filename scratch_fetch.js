const http = require('http');

const data = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const loginReq = http.request({
  hostname: 'localhost',
  port: 8081,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const token = JSON.parse(body).token;

    const mapReq = http.request({
      hostname: 'localhost',
      port: 8081,
      path: '/api/inicio/mapa-docente',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res2) => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => {
        console.log("BACKEND RESPONSE:", body2);
      });
    });
    mapReq.end();
  });
});

loginReq.write(data);
loginReq.end();
