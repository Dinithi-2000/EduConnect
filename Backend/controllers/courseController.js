const Course = require('../models/Course');

const isManager = (user) => Boolean(user && ['admin', 'teacher'].includes(user.role));

const normalizeOrder = (arr = []) => {
  return arr
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((item, idx) => ({ ...item, order: idx + 1 }));
};

const normalizeFaqs = (items = []) => {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim()
    }))
    .filter((item) => item.question && item.answer);
};

const sanitizeForStudent = (course) => {
  const plain = course.toObject ? course.toObject() : course;
  plain.modules = (plain.modules || []).map((module) => ({
    ...module,
    contents: module.contents || []
  }));
  return plain;
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Authenticated
const getCourses = async (req, res) => {
  try {
    const { search, subject, level, published } = req.query;
    const manager = isManager(req.user);
    const filter = {};

    if (!manager) {
      filter.isPublished = true;
    } else if (published === 'true') {
      filter.isPublished = true;
    } else if (published === 'false') {
      filter.isPublished = false;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (level) filter.level = level;

    const query = Course.find(filter).sort({ updatedAt: -1 }).lean();

    // Instructor info is used on student pages, but manager pages do not require populate.
    if (!manager) {
      query.populate('createdBy', 'name email role');
    }

    const courses = await query.exec();

    const data = manager ? courses : courses.map((course) => sanitizeForStudent(course));
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Authenticated
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('createdBy', 'name email role');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const manager = isManager(req.user);
    if (!manager && !course.isPublished) {
      return res.status(403).json({ success: false, message: 'Course is not published' });
    }

    const data = manager ? course : sanitizeForStudent(course);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create a course
// @route   POST /api/courses
// @access  Admin/Teacher
const createCourse = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      subject: req.body.subject,
      level: req.body.level,
      description: req.body.description,
      thumbnailUrl: req.body.thumbnailUrl,
      isPublished: Boolean(req.body.isPublished),
      modules: normalizeOrder((req.body.modules || []).map((module) => ({
        ...module,
        faqs: normalizeFaqs(module.faqs),
        contents: normalizeOrder(module.contents || [])
      }))),
      faqs: normalizeFaqs(req.body.faqs),
      createdBy: req.user._id
    };

    const course = await Course.create(payload);
    return res.status(201).json({ success: true, data: course });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Failed to create course', error: error.message });
  }
};

// @desc    Update course meta
// @route   PUT /api/courses/:id
// @access  Admin/Teacher
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    course.title = req.body.title ?? course.title;
    course.subject = req.body.subject ?? course.subject;
    course.level = req.body.level ?? course.level;
    course.description = req.body.description ?? course.description;
    course.thumbnailUrl = req.body.thumbnailUrl ?? course.thumbnailUrl;
    if (Array.isArray(req.body.faqs)) {
      course.faqs = normalizeFaqs(req.body.faqs);
    }

    if (typeof req.body.isPublished === 'boolean') {
      course.isPublished = req.body.isPublished;
    }

    await course.save();
    return res.json({ success: true, data: course });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Failed to update course', error: error.message });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Admin/Teacher
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    return res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Add module to a course
// @route   POST /api/courses/:id/modules
// @access  Admin/Teacher
const addModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const nextOrder = course.modules.length + 1;
    course.modules.push({
      title: req.body.title,
      description: req.body.description || '',
      order: Number(req.body.order) || nextOrder,
      faqs: normalizeFaqs(req.body.faqs),
      contents: []
    });

    course.modules = normalizeOrder(course.modules);
    await course.save();

    return res.status(201).json({ success: true, data: course });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Failed to add module', error: error.message });
  }
};

// @desc    Update module
// @route   PUT /api/courses/:id/modules/:moduleId
// @access  Admin/Teacher
const updateModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const module = course.modules.id(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    module.title = req.body.title ?? module.title;
    module.description = req.body.description ?? module.description;
    if (Array.isArray(req.body.faqs)) {
      module.faqs = normalizeFaqs(req.body.faqs);
    }
    if (typeof req.body.order !== 'undefined') {
      module.order = Number(req.body.order) || module.order;
    }

    course.modules = normalizeOrder(course.modules);
    await course.save();

    return res.json({ success: true, data: course });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Failed to update module', error: error.message });
  }
};

// @desc    Delete module
// @route   DELETE /api/courses/:id/modules/:moduleId
// @access  Admin/Teacher
const deleteModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const module = course.modules.id(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    module.deleteOne();
    course.modules = normalizeOrder(course.modules);
    await course.save();

    return res.json({ success: true, data: course });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Add content item to module
// @route   POST /api/courses/:id/modules/:moduleId/contents
// @access  Admin/Teacher
const addContent = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const module = course.modules.id(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const nextOrder = module.contents.length + 1;
    module.contents.push({
      title: req.body.title,
      contentType: req.body.contentType,
      url: req.body.url || '',
      textContent: req.body.textContent || '',
      durationMinutes: Number(req.body.durationMinutes) || 0,
      order: Number(req.body.order) || nextOrder,
      isPreview: Boolean(req.body.isPreview)
    });

    module.contents = normalizeOrder(module.contents);
    await course.save();

    return res.status(201).json({ success: true, data: course });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Failed to add content', error: error.message });
  }
};

// @desc    Update content item
// @route   PUT /api/courses/:id/modules/:moduleId/contents/:contentId
// @access  Admin/Teacher
const updateContent = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const module = course.modules.id(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const content = module.contents.id(req.params.contentId);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    content.title = req.body.title ?? content.title;
    content.contentType = req.body.contentType ?? content.contentType;
    content.url = req.body.url ?? content.url;
    content.textContent = req.body.textContent ?? content.textContent;
    if (typeof req.body.durationMinutes !== 'undefined') {
      content.durationMinutes = Number(req.body.durationMinutes) || 0;
    }
    if (typeof req.body.order !== 'undefined') {
      content.order = Number(req.body.order) || content.order;
    }
    if (typeof req.body.isPreview === 'boolean') {
      content.isPreview = req.body.isPreview;
    }

    module.contents = normalizeOrder(module.contents);
    await course.save();

    return res.json({ success: true, data: course });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Failed to update content', error: error.message });
  }
};

// @desc    Delete content item
// @route   DELETE /api/courses/:id/modules/:moduleId/contents/:contentId
// @access  Admin/Teacher
const deleteContent = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const module = course.modules.id(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const content = module.contents.id(req.params.contentId);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    content.deleteOne();
    module.contents = normalizeOrder(module.contents);
    await course.save();

    return res.json({ success: true, data: course });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Upload module PDF and add as content
// @route   POST /api/courses/:id/modules/:moduleId/upload-pdf
// @access  Admin/Teacher
const uploadModulePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'PDF file is required' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const module = course.modules.id(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const nextOrder = module.contents.length + 1;
    const fileUrl = `/uploads/courses/${req.file.filename}`;

    module.contents.push({
      title: req.body.title || req.file.originalname.replace(/\.pdf$/i, ''),
      contentType: 'LecturePDF',
      url: fileUrl,
      textContent: req.body.textContent || '',
      durationMinutes: Number(req.body.durationMinutes) || 0,
      order: Number(req.body.order) || nextOrder,
      isPreview: req.body.isPreview === 'true' || req.body.isPreview === true
    });

    module.contents = normalizeOrder(module.contents);
    await course.save();

    return res.status(201).json({ success: true, data: course, fileUrl });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Failed to upload PDF', error: error.message });
  }
};

// @desc    Upload module image and add as content
// @route   POST /api/courses/:id/modules/:moduleId/upload-image
// @access  Admin/Teacher
const uploadModuleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const module = course.modules.id(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const nextOrder = module.contents.length + 1;
    const fileUrl = `/uploads/courses/${req.file.filename}`;

    module.contents.push({
      title: req.body.title || req.file.originalname.replace(/\.[^/.]+$/i, ''),
      contentType: 'Image',
      url: fileUrl,
      textContent: req.body.textContent || '',
      durationMinutes: Number(req.body.durationMinutes) || 0,
      order: Number(req.body.order) || nextOrder,
      isPreview: req.body.isPreview === 'true' || req.body.isPreview === true
    });

    module.contents = normalizeOrder(module.contents);
    await course.save();

    return res.status(201).json({ success: true, data: course, fileUrl });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Failed to upload image', error: error.message });
  }
};

// @desc    Upload module video and add as content
// @route   POST /api/courses/:id/modules/:moduleId/upload-video
// @access  Admin/Teacher
const uploadModuleVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Video file is required' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const module = course.modules.id(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const nextOrder = module.contents.length + 1;
    const fileUrl = `/uploads/courses/${req.file.filename}`;

    module.contents.push({
      title: req.body.title || req.file.originalname.replace(/\.[^/.]+$/i, ''),
      contentType: 'LectureVideo',
      url: fileUrl,
      textContent: req.body.textContent || '',
      durationMinutes: Number(req.body.durationMinutes) || 0,
      order: Number(req.body.order) || nextOrder,
      isPreview: req.body.isPreview === 'true' || req.body.isPreview === true
    });

    module.contents = normalizeOrder(module.contents);
    await course.save();

    return res.status(201).json({ success: true, data: course, fileUrl });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Failed to upload video', error: error.message });
  }
};

module.exports = {
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
  uploadModulePdf,
  uploadModuleImage,
  uploadModuleVideo
};
