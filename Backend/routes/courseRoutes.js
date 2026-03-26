const express = require('express');
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  addModule,
  updateModule,
  deleteModule,
  addContent,
  updateContent,
  deleteContent,
  uploadModulePdf
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/auth');
const { uploadCoursePdf } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCourses)
  .post(authorize('admin', 'teacher'), createCourse);

router.route('/:id')
  .get(getCourseById)
  .put(authorize('admin', 'teacher'), updateCourse)
  .delete(authorize('admin', 'teacher'), deleteCourse);

router.post('/:id/modules', authorize('admin', 'teacher'), addModule);
router.put('/:id/modules/:moduleId', authorize('admin', 'teacher'), updateModule);
router.delete('/:id/modules/:moduleId', authorize('admin', 'teacher'), deleteModule);

router.post('/:id/modules/:moduleId/contents', authorize('admin', 'teacher'), addContent);
router.post('/:id/modules/:moduleId/upload-pdf', authorize('admin', 'teacher'), uploadCoursePdf.single('file'), uploadModulePdf);
router.put('/:id/modules/:moduleId/contents/:contentId', authorize('admin', 'teacher'), updateContent);
router.delete('/:id/modules/:moduleId/contents/:contentId', authorize('admin', 'teacher'), deleteContent);

module.exports = router;
