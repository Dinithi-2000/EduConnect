const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/materials');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExt = /pdf|jpeg|jpg|png|webp|gif|doc|docx|ppt|pptx|txt/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isValidExt = allowedExt.test(ext);

  if (isValidExt) {
    cb(null, true);
  } else {
    cb(new Error('Only pdf, image, doc/docx, ppt/pptx, and txt files are allowed.'), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});
