const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads', 'community');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    cb(null, `${Date.now()}-${base || 'image'}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

const uploadCommunityImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = {
  uploadCommunityImage
};
