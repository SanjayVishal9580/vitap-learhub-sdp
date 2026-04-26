const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const path = require('path');

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'vitap-learnhub';
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const nameOnly = path.parse(file.originalname).name;
    const cleanName = nameOnly.replace(/[^a-zA-Z0-9.-]/g, '_');

    if (file.mimetype.startsWith('image')) {
      return { 
        folder: folder + '/images', 
        resource_type: 'image',
        public_id: `${Date.now()}-${cleanName}`
      };
    }

    if (file.mimetype === 'application/pdf' || ext === 'pdf') {
      return {
        folder: folder + '/documents',
        resource_type: 'image', // Cloudinary handles PDFs as images for better support
        public_id: `${Date.now()}-${cleanName}`,
        format: 'pdf'
      };
    }

    // All other non-image files (DOCX, PPTX, etc.) go as raw
    return {
      folder: folder + '/documents',
      resource_type: 'raw',
      public_id: `${Date.now()}-${cleanName}.${ext}`
    };
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx', '.pptx', '.doc', '.ppt', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Allowed: ${allowedExtensions.join(', ')}`), false);
    }
  },
});

module.exports = upload;
