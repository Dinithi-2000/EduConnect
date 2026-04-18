const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');

/**
 * @desc    Get detailed information for a single course including its module/lesson
 *          hierarchy, content items, access flags, and (if authenticated) progress.
 * @route   GET /api/courses/:id
 * @access  Public (progress & access flags require a valid Bearer token)
 */
const getCourseDetail = async (req, res) => {
    try {
        // ------------------------------------------------------------------
        // 1. Fetch the course (published only for non-admins/non-instructors)
        // ------------------------------------------------------------------
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'name email');

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        if (!course.isPublished) {
            // Only the instructor or an admin may view unpublished courses
            const requestingUser = req.user;
            const isInstructor =
                requestingUser &&
                course.instructor._id.toString() === requestingUser._id.toString();
            const isAdmin = requestingUser && requestingUser.role === 'admin';

            if (!isInstructor && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'This course is not yet published'
                });
            }
        }

        // ------------------------------------------------------------------
        // 2. Fetch enrollment record for the requesting user (if logged in)
        // ------------------------------------------------------------------
        let enrollment = null;
        if (req.user) {
            enrollment = await Enrollment.findOne({
                student: req.user._id,
                course: course._id
            });
        }

        const isEnrolled = enrollment !== null;

        // ------------------------------------------------------------------
        // 3. Build the module / lesson hierarchy
        // ------------------------------------------------------------------
        const modules = await Module.find({ course: course._id })
            .sort('order')
            .lean();

        // Collect all module IDs for a single Lesson query
        const moduleIds = modules.map((m) => m._id);

        const lessons = await Lesson.find({
            module: { $in: moduleIds },
            isPublished: true
        })
            .sort('order')
            .lean();

        // Group lessons by module ID for O(n) assembly
        const lessonsByModule = {};
        for (const lesson of lessons) {
            const key = lesson.module.toString();
            if (!lessonsByModule[key]) lessonsByModule[key] = [];
            lessonsByModule[key].push(lesson);
        }

        // Set of completed lesson IDs for fast lookup
        const completedSet = new Set(
            (enrollment ? enrollment.completedLessons : []).map((id) =>
                id.toString()
            )
        );

        // Assemble the hierarchy and decorate each lesson with access & progress
        let totalLessons = 0;
        let totalDuration = 0;

        const moduleHierarchy = modules
            .filter((m) => m.isPublished)
            .map((mod) => {
                const moduleLessons = (lessonsByModule[mod._id.toString()] || []).map(
                    (lesson) => {
                        totalLessons += 1;
                        totalDuration += lesson.duration || 0;

                        const lessonId = lesson._id.toString();
                        const isAccessible = isEnrolled || lesson.isPreview;

                        // Strip content item URLs for inaccessible lessons
                        const contentItems = isAccessible
                            ? lesson.contentItems
                            : lesson.contentItems.map((item) => ({
                                  _id: item._id,
                                  title: item.title,
                                  type: item.type,
                                  duration: item.duration,
                                  size: item.size,
                                  order: item.order,
                                  url: null
                              }));

                        return {
                            _id: lesson._id,
                            title: lesson.title,
                            description: lesson.description,
                            order: lesson.order,
                            duration: lesson.duration,
                            isPreview: lesson.isPreview,
                            contentItems,
                            // Access & progress flags
                            isAccessible,
                            isCompleted: completedSet.has(lessonId)
                        };
                    }
                );

                return {
                    _id: mod._id,
                    title: mod.title,
                    description: mod.description,
                    order: mod.order,
                    lessons: moduleLessons
                };
            });

        // ------------------------------------------------------------------
        // 4. Build access and progress payloads
        // ------------------------------------------------------------------
        const access = {
            isEnrolled,
            enrolledAt: enrollment ? enrollment.createdAt : null,
            canAccess: isEnrolled
        };

        const progress = isEnrolled
            ? {
                  overallProgress: enrollment.overallProgress,
                  completedLessons: enrollment.completedLessons,
                  totalLessons,
                  completedCount: enrollment.completedLessons.length,
                  lastAccessedAt: enrollment.lastAccessedAt,
                  completedAt: enrollment.completedAt
              }
            : null;

        // ------------------------------------------------------------------
        // 5. Compose the response
        // ------------------------------------------------------------------
        return res.json({
            success: true,
            data: {
                course: {
                    _id: course._id,
                    title: course.title,
                    description: course.description,
                    instructor: course.instructor,
                    thumbnail: course.thumbnail,
                    category: course.category,
                    level: course.level,
                    tags: course.tags,
                    isPublished: course.isPublished,
                    totalModules: moduleHierarchy.length,
                    totalLessons,
                    totalDuration,
                    createdAt: course.createdAt,
                    updatedAt: course.updatedAt
                },
                modules: moduleHierarchy,
                access,
                progress
            }
        });
    } catch (error) {
        // Handle invalid ObjectId
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

module.exports = { getCourseDetail };
