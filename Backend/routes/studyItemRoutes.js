const express = require('express');
const {
  getStudyItems,
  createStudyItem,
  deleteStudyItem,
  getAdminStudyItems,
  getPublishedStudyMaterials,
  createAdminStudyMaterial,
  deleteAdminStudyMaterial
} = require('../controllers/studyItemController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSessionMaterial } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.get('/', getStudyItems);
router.post('/', createStudyItem);
router.delete('/:id', deleteStudyItem);
router.get('/admin/all', authorize('admin', 'teacher'), getAdminStudyItems);
router.get('/materials', getPublishedStudyMaterials);
router.post('/materials/admin', authorize('admin', 'teacher'), uploadSessionMaterial.single('materialFile'), createAdminStudyMaterial);
router.delete('/materials/admin/:id', authorize('admin', 'teacher'), deleteAdminStudyMaterial);

module.exports = router;
