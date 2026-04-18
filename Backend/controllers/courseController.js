const Course = require('../models/Course');

/**
 * Sort modules and their lessons by the `order` field ascending.
 */
const sortCourseContent = (course) => {
    course.modules.sort((a, b) => a.order - b.order);
    course.modules.forEach((mod) => {
        mod.lessons.sort((a, b) => a.order - b.order);
    });
    return course;
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
const getCourses = async (req, res) => {
    try {
        const courses = await Course.find()
            .populate('instructor', 'name email')
            .select('-modules');

        res.json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get single course with ordered modules and lessons
// @route   GET /api/courses/:id
// @access  Public
const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'name email');

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Apply ordering so modules and lessons are returned in ascending order
        const courseObj = course.toObject();
        sortCourseContent(courseObj);

        // Apply visibility filtering: hide non-visible modules and their lessons.
        // Non-visible lessons within a visible module are also filtered out.
        courseObj.modules = courseObj.modules
            .filter((mod) => mod.isVisible)
            .map((mod) => ({
                ...mod,
                lessons: mod.lessons.filter((lesson) => lesson.isVisible)
            }));

        res.json({
            success: true,
            data: courseObj
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid course ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Public
const createCourse = async (req, res) => {
    try {
        const course = await Course.create(req.body);

        res.status(201).json({
            success: true,
            data: course
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to create course',
            error: error.message
        });
    }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Public
const updateCourse = async (req, res) => {
    try {
        // Allowlist updatable fields to prevent NoSQL operator injection
        const { title, description, thumbnail, category, level, isPublished, modules } = req.body;
        const allowedUpdates = { title, description, thumbnail, category, level, isPublished, modules };
        // Remove undefined keys so only supplied fields are updated
        Object.keys(allowedUpdates).forEach(
            (key) => allowedUpdates[key] === undefined && delete allowedUpdates[key]
        );

        const course = await Course.findByIdAndUpdate(req.params.id, allowedUpdates, {
            new: true,
            runValidators: true
        }).populate('instructor', 'name email');

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.json({
            success: true,
            data: course
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid course ID format'
            });
        }
        res.status(400).json({
            success: false,
            message: 'Failed to update course',
            error: error.message
        });
    }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Public
const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid course ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

module.exports = {
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse
};
