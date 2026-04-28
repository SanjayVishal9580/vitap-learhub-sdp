const https = require('https');

const key = 'AIzaSyAsZlfGKBL80Yf0At91yx4O2_FUQOBkSlE';
const data = JSON.stringify({
  contents: [{ parts: [{ text: "Hello" }] }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('--- Testing RAW API Call ---');
const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    console.log('Response Body:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Network Error:', error.message);
});

req.write(data);
req.end();
