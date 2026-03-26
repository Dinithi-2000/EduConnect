const fs = require('fs');
const path = require('path');
const multer = require('multer');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const communityUploadDir = path.join(__dirname, '..', 'uploads', 'community');
const courseUploadDir = path.join(__dirname, '..', 'uploads', 'courses');

ensureDir(communityUploadDir);
ensureDir(courseUploadDir);

const communityStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, communityUploadDir);
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

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

const coursePdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, courseUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    cb(null, `${Date.now()}-${base || 'lecture'}${ext || '.pdf'}`);
  }
});

const pdfFileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';

  if (!isPdfMime && !isPdfExt) {
    return cb(new Error('Only PDF files are allowed'));
  }

  cb(null, true);
};

const uploadCommunityImage = multer({
  storage: communityStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const uploadCoursePdf = multer({
  storage: coursePdfStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

module.exports = {
  uploadCommunityImage,
  uploadCoursePdf
};
