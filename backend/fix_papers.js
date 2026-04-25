require('dotenv').config();
const mongoose = require('mongoose');
const Paper = require('./models/Paper');
const https = require('https');

const checkUrl = (url) => {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res.statusCode);
    }).on('error', () => resolve(0));
  });
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const papers = await Paper.find();
  
  for (const paper of papers) {
    console.log(`Checking ${paper.fileName}...`);
    let statusCode = await checkUrl(paper.fileUrl);
    console.log(`URL: ${paper.fileUrl} -> Status: ${statusCode}`);
    
    if (statusCode === 404 && paper.fileUrl.endsWith('.pdf')) {
      const doubleUrl = paper.fileUrl + '.pdf';
      const doubleStatus = await checkUrl(doubleUrl);
      console.log(`Trying double ext: ${doubleUrl} -> Status: ${doubleStatus}`);
      
      if (doubleStatus === 200) {
        paper.fileUrl = doubleUrl;
        await paper.save();
        console.log(`Fixed URL in DB for ${paper.fileName}`);
      }
    }
  }
  process.exit();
}

run();
