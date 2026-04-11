const mongoose = require('mongoose');
const StudyItem = require('../models/StudyItem');
const AdminStudyMaterial = require('../models/AdminStudyMaterial');

const toObjectId = (value) => {
  if (!value) return null;
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
};

const sanitizeType = (value) => {
  const type = String(value || '').trim().toLowerCase();
  return ['note', 'bookmark', 'highlight'].includes(type) ? type : null;
};

const sanitizeTargetType = (value) => {
  const targetType = String(value || '').trim().toLowerCase();
  return ['course', 'module', 'content', 'quiz'].includes(targetType) ? targetType : null;
};

const sanitizeMaterialType = (value) => {
  const materialType = String(value || '').trim().toLowerCase();
  return ['past-paper', 'short-note', 'reference'].includes(materialType) ? materialType : null;
};

const mapStudyItem = (item) => ({
  _id: item._id,
  user: item.user,
  courseId: item.courseId,
  moduleId: item.moduleId,
  contentId: item.contentId,
  type: item.type,
  targetType: item.targetType || (item.contentId ? 'content' : item.moduleId ? 'module' : 'course'),
  targetId: item.targetId || item.contentId || item.moduleId || item.courseId,
  title: item.title || '',
  text: item.text || '',
  excerpt: item.excerpt || '',
  highlightMeta: item.highlightMeta || null,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const mapAdminMaterial = (item) => ({
  _id: item._id,
  title: item.title,
  materialType: item.materialType,
  description: item.description || '',
  linkUrl: item.linkUrl || '',
  fileUrl: item.fileUrl || '',
  fileName: item.fileName || '',
  fileMimeType: item.fileMimeType || '',
  fileSize: Number(item.fileSize || 0),
  isPublished: Boolean(item.isPublished),
  createdBy: item.createdBy,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const getStudyItems = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { type, courseId, moduleId, contentId, targetType } = req.query;

    const filter = { user: userId };
    const safeType = sanitizeType(type);
    if (type && !safeType) {
      return res.status(400).json({ success: false, message: 'Invalid type filter' });
    }

    if (safeType) filter.type = safeType;
    const safeTargetType = sanitizeTargetType(targetType);
    if (targetType && !safeTargetType) {
      return res.status(400).json({ success: false, message: 'Invalid targetType filter' });
    }
    if (safeTargetType) filter.targetType = safeTargetType;
    if (courseId) {
      const id = toObjectId(courseId);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid courseId' });
      filter.courseId = id;
    }
    if (moduleId) {
      const id = toObjectId(moduleId);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid moduleId' });
      filter.moduleId = id;
    }
    if (contentId) {
      const id = toObjectId(contentId);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid contentId' });
      filter.contentId = id;
    }

    const items = await StudyItem.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, count: items.length, data: items.map(mapStudyItem) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load study items', error: error.message });
  }
};

const createStudyItem = async (req, res) => {
  try {
    const userId = req.user?._id;
    const {
      type,
      courseId,
      moduleId,
      contentId,
      title,
      text,
      excerpt,
      highlightMeta,
      targetType,
      targetId
    } = req.body;

    const safeType = sanitizeType(type);
    if (!safeType) {
      return res.status(400).json({ success: false, message: 'Valid type is required' });
    }

    const courseObjectId = toObjectId(courseId);
    const moduleObjectId = moduleId ? toObjectId(moduleId) : null;
    const contentObjectId = contentId ? toObjectId(contentId) : null;
    const targetObjectId = targetId ? toObjectId(targetId) : null;
    let safeTargetType = sanitizeTargetType(targetType);

    if (safeType !== 'bookmark' && (!courseObjectId || !moduleObjectId || !contentObjectId)) {
      return res.status(400).json({ success: false, message: 'moduleId and contentId are required for notes/highlights' });
    }

    if (safeType !== 'bookmark') {
      safeTargetType = 'content';
    }

    const inferredTargetType = safeTargetType
      || (contentObjectId ? 'content' : moduleObjectId ? 'module' : courseObjectId ? 'course' : null);

    const inferredTargetId = targetObjectId
      || (inferredTargetType === 'content' ? contentObjectId : inferredTargetType === 'module' ? moduleObjectId : courseObjectId);

    if (safeType === 'bookmark') {
      if (!inferredTargetType || !inferredTargetId) {
        return res.status(400).json({ success: false, message: 'targetType and targetId are required for bookmarks' });
      }

      if (inferredTargetType !== 'quiz' && !courseObjectId) {
        return res.status(400).json({ success: false, message: 'courseId is required for course/module/content bookmarks' });
      }
    }

    if (safeType === 'bookmark') {
      const existing = await StudyItem.findOne({
        user: userId,
        type: 'bookmark',
        targetType: inferredTargetType,
        targetId: inferredTargetId
      });

      if (existing) {
        return res.status(200).json({ success: true, data: mapStudyItem(existing), message: 'Bookmark already exists' });
      }
    }

    if (safeType !== 'bookmark' && !String(text || excerpt || '').trim()) {
      return res.status(400).json({ success: false, message: 'Text or excerpt is required for notes/highlights' });
    }

    const created = await StudyItem.create({
      user: userId,
      type: safeType,
      targetType: inferredTargetType || 'content',
      targetId: inferredTargetId || contentObjectId,
      courseId: courseObjectId,
      moduleId: moduleObjectId,
      contentId: contentObjectId,
      title: String(title || '').trim(),
      text: String(text || '').trim(),
      excerpt: String(excerpt || '').trim(),
      highlightMeta: {
        startOffset: Number.isFinite(Number(highlightMeta?.startOffset)) ? Number(highlightMeta.startOffset) : null,
        endOffset: Number.isFinite(Number(highlightMeta?.endOffset)) ? Number(highlightMeta.endOffset) : null,
        color: String(highlightMeta?.color || '#fff59d')
      }
    });

    return res.status(201).json({ success: true, data: mapStudyItem(created) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create study item', error: error.message });
  }
};

const deleteStudyItem = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const item = await StudyItem.findOne({ _id: id, user: userId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Study item not found' });
    }

    await item.deleteOne();
    return res.json({ success: true, message: 'Study item removed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete study item', error: error.message });
  }
};

const getAdminStudyItems = async (req, res) => {
  try {
    const { type, targetType, userId, limit = 200 } = req.query;
    const filter = {};

    const safeType = sanitizeType(type);
    if (type && !safeType) {
      return res.status(400).json({ success: false, message: 'Invalid type filter' });
    }

    if (safeType) filter.type = safeType;

    const safeTargetType = sanitizeTargetType(targetType);
    if (targetType && !safeTargetType) {
      return res.status(400).json({ success: false, message: 'Invalid targetType filter' });
    }
    if (safeTargetType) filter.targetType = safeTargetType;

    if (userId) {
      const id = toObjectId(userId);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid userId' });
      filter.user = id;
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);

    const [items, countsByType] = await Promise.all([
      StudyItem.find(filter)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(safeLimit),
      StudyItem.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    const counts = { note: 0, bookmark: 0, highlight: 0 };
    countsByType.forEach((entry) => {
      if (counts[entry._id] !== undefined) counts[entry._id] = entry.count;
    });

    return res.json({
      success: true,
      summary: {
        total: counts.note + counts.bookmark + counts.highlight,
        ...counts
      },
      count: items.length,
      data: items.map(mapStudyItem)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load admin study items', error: error.message });
  }
};

const getPublishedStudyMaterials = async (req, res) => {
  try {
    const { materialType, search } = req.query;
    const filter = { isPublished: true };

    const safeMaterialType = sanitizeMaterialType(materialType);
    if (materialType && !safeMaterialType) {
      return res.status(400).json({ success: false, message: 'Invalid materialType filter' });
    }
    if (safeMaterialType) filter.materialType = safeMaterialType;

    if (String(search || '').trim()) {
      const q = String(search).trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    const items = await AdminStudyMaterial.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(300);

    return res.json({ success: true, count: items.length, data: items.map(mapAdminMaterial) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load published study materials', error: error.message });
  }
};

const createAdminStudyMaterial = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const { title, materialType, description, linkUrl, isPublished } = req.body;

    const safeMaterialType = sanitizeMaterialType(materialType);
    if (!safeMaterialType) {
      return res.status(400).json({ success: false, message: 'Valid materialType is required' });
    }

    const safeTitle = String(title || '').trim();
    if (!safeTitle) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const created = await AdminStudyMaterial.create({
      title: safeTitle,
      materialType: safeMaterialType,
      description: String(description || '').trim(),
      linkUrl: String(linkUrl || '').trim(),
      fileUrl: req.file ? `/uploads/materials/${req.file.filename}` : '',
      fileName: req.file?.originalname || '',
      fileMimeType: req.file?.mimetype || '',
      fileSize: Number(req.file?.size || 0),
      createdBy: adminId,
      isPublished: typeof isPublished === 'boolean' ? isPublished : true
    });

    const populated = await AdminStudyMaterial.findById(created._id).populate('createdBy', 'name email');
    return res.status(201).json({ success: true, data: mapAdminMaterial(populated) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create study material', error: error.message });
  }
};

const deleteAdminStudyMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await AdminStudyMaterial.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Study material not found' });
    }

    await item.deleteOne();
    return res.json({ success: true, message: 'Study material removed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete study material', error: error.message });
  }
};

const updateAdminStudyMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, materialType, description, linkUrl, isPublished } = req.body;

    const item = await AdminStudyMaterial.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Study material not found' });
    }

    const nextTitle = String(title ?? item.title ?? '').trim();
    if (!nextTitle) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if (materialType !== undefined) {
      const safeMaterialType = sanitizeMaterialType(materialType);
      if (!safeMaterialType) {
        return res.status(400).json({ success: false, message: 'Valid materialType is required' });
      }
      item.materialType = safeMaterialType;
    }

    item.title = nextTitle;
    item.description = String(description ?? item.description ?? '').trim();
    item.linkUrl = String(linkUrl ?? item.linkUrl ?? '').trim();

    if (typeof isPublished === 'boolean') {
      item.isPublished = isPublished;
    }

    const saved = await item.save();
    const populated = await AdminStudyMaterial.findById(saved._id).populate('createdBy', 'name email');
    return res.json({ success: true, data: mapAdminMaterial(populated) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update study material', error: error.message });
  }
};

module.exports = {
  getStudyItems,
  createStudyItem,
  deleteStudyItem,
  getAdminStudyItems,
  getPublishedStudyMaterials,
  createAdminStudyMaterial,
  updateAdminStudyMaterial,
  deleteAdminStudyMaterial
};
