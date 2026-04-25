require('dotenv').config();
const mongoose = require('mongoose');
const Paper = require('./models/Paper');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const papers = await Paper.find();
  
  let count = 0;
  for (const paper of papers) {
    // If it's a PDF in raw/upload and only has one .pdf at the end
    if (paper.fileUrl.includes('/raw/upload/') && 
        paper.fileUrl.endsWith('.pdf') && 
        !paper.fileUrl.endsWith('.pdf.pdf')) {
      
      console.log(`Fixing ${paper.fileName}: ${paper.fileUrl}`);
      paper.fileUrl = paper.fileUrl + '.pdf';
      await paper.save();
      count++;
    }
  }
  
  console.log(`Updated ${count} papers.`);
  process.exit();
}

run();
