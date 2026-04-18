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
const materialUploadDir = path.join(__dirname, '..', 'uploads', 'materials');
const contactUploadDir = path.join(__dirname, '..', 'uploads', 'contact');

ensureDir(communityUploadDir);
ensureDir(courseUploadDir);
ensureDir(materialUploadDir);
ensureDir(contactUploadDir);

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

const courseImageStorage = multer.diskStorage({
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

    cb(null, `${Date.now()}-${base || 'image'}${ext || '.jpg'}`);
  }
});

const courseVideoStorage = multer.diskStorage({
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

    cb(null, `${Date.now()}-${base || 'recording'}${ext || '.mp4'}`);
  }
});

const sessionMaterialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, materialUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    cb(null, `${Date.now()}-${base || 'material'}${ext}`);
  }
});

const contactAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, contactUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    cb(null, `${Date.now()}-${base || 'attachment'}${ext}`);
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

const courseImageFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }

  cb(null, true);
};

const courseVideoFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv'];
  const validMime = file.mimetype.startsWith('video/');

  if (!validMime && !allowedExts.includes(ext)) {
    return cb(new Error('Only video files are allowed'));
  }

  cb(null, true);
};

const sessionMaterialFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.doc', '.docx', '.ppt', '.pptx', '.txt'];
  const isMimeAllowed =
    file.mimetype.startsWith('image/')
    || file.mimetype === 'application/pdf'
    || file.mimetype === 'text/plain'
    || file.mimetype === 'application/msword'
    || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || file.mimetype === 'application/vnd.ms-powerpoint'
    || file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  if (!allowedExts.includes(ext) && !isMimeAllowed) {
    return cb(new Error('Only PDF, image, DOC/DOCX, PPT/PPTX, and TXT files are allowed'));
  }

  cb(null, true);
};

const contactAttachmentFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.doc', '.docx', '.txt', '.ppt', '.pptx'];
  const isMimeAllowed =
    file.mimetype.startsWith('image/')
    || file.mimetype === 'application/pdf'
    || file.mimetype === 'text/plain'
    || file.mimetype === 'application/msword'
    || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || file.mimetype === 'application/vnd.ms-powerpoint'
    || file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  if (!allowedExts.includes(ext) && !isMimeAllowed) {
    return cb(new Error('Only image, PDF, DOC/DOCX, PPT/PPTX, and TXT files are allowed'));
  }

  cb(null, true);
};

const uploadCommunityImage = multer({
  storage: communityStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 12 * 1024 * 1024
  }
});

const uploadCoursePdf = multer({
  storage: coursePdfStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

const uploadCourseImage = multer({
  storage: courseImageStorage,
  fileFilter: courseImageFileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

const uploadCourseVideo = multer({
  storage: courseVideoStorage,
  fileFilter: courseVideoFileFilter,
  limits: {
    fileSize: 150 * 1024 * 1024
  }
});

const uploadSessionMaterial = multer({
  storage: sessionMaterialStorage,
  fileFilter: sessionMaterialFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

const uploadContactAttachment = multer({
  storage: contactAttachmentStorage,
  fileFilter: contactAttachmentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  }
});

module.exports = {
  uploadCommunityImage,
  uploadCoursePdf,
  uploadCourseImage,
  uploadCourseVideo,
  uploadSessionMaterial,
  uploadContactAttachment,
};
