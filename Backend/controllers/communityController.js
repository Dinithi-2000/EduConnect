const CommunityPost = require('../models/CommunityPost');
const User = require('../models/User');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Create a new community post
exports.createPost = async (req, res) => {
  try {
    const { title, description, type, category, tags, location, contactInfo, eventDate, eventTime } = req.body;
    const userId = req.user?._id || req.body.userId;
    let userName = req.user?.name || req.body.userName;
    let userEmail = req.user?.email || req.body.userEmail;

    let parsedTags = [];
    if (Array.isArray(tags)) {
      parsedTags = tags;
    } else if (typeof tags === 'string' && tags.trim()) {
      try {
        const maybeArray = JSON.parse(tags);
        parsedTags = Array.isArray(maybeArray)
          ? maybeArray
          : tags.split(',').map((tag) => tag.trim());
      } catch (error) {
        parsedTags = tags.split(',').map((tag) => tag.trim());
      }
    }

    const normalizedTags = parsedTags.filter(Boolean);
    const uploadedFiles = [
      ...(req.file ? [req.file] : []),
      ...(Array.isArray(req.files)
        ? req.files
        : [
            ...((req.files && Array.isArray(req.files.image)) ? req.files.image : []),
            ...((req.files && Array.isArray(req.files.images)) ? req.files.images : [])
          ])
    ];

    const uploadedImageUrls = uploadedFiles.map(
      (file) => `${req.protocol}://${req.get('host')}/uploads/community/${file.filename}`
    );

    if (uploadedImageUrls.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'You can upload up to 5 images per post.'
      });
    }

    if (type === 'event' && !eventDate) {
      return res.status(400).json({
        success: false,
        message: 'Event date is required for event posts.'
      });
    }

    const parsedEventDate = eventDate ? new Date(eventDate) : undefined;
    if (eventDate && Number.isNaN(parsedEventDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Event date is invalid.'
      });
    }

    const imageUrls = uploadedImageUrls;

    const imageUrl = imageUrls[0];

    if (!title || !description || !type || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, type, and userId are required'
      });
    }

    if (!userName || !userEmail) {
      const author = await User.findById(userId).select('name email');
      if (author) {
        userName = userName || author.name;
        userEmail = userEmail || author.email;
      }
    }

    if (!userName || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'userName and userEmail are required'
      });
    }

    const post = new CommunityPost({
      title,
      description,
      type,
      author: userId,
      authorName: userName,
      authorEmail: userEmail,
      category,
      tags: normalizedTags,
      imageUrl,
      imageUrls,
      location,
      contactInfo,
      eventDate: parsedEventDate,
      eventTime: eventTime || ''
    });

    await post.save();

    return res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
  }
};

// Get all posts with optional filtering
exports.getPosts = async (req, res) => {
  try {
    const { type, status, search, limit = 20, skip = 0 } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) {
      filter.status = status;
    } else {
      // Hide removed posts unless a status is explicitly requested.
      filter.status = { $ne: 'removed' };
    }

    if (search) {
      const safeSearch = escapeRegex(String(search).trim());
      const searchRegex = new RegExp(safeSearch, 'i');

      filter.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } }
      ];
    }

    const posts = await CommunityPost.find(filter)
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CommunityPost.countDocuments(filter);

    return res.json({
      success: true,
      data: posts,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

// Get single post
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await CommunityPost.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'name email avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    return res.json({
      success: true,
      data: post
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};

// Update post
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, tags, imageUrl, location, contactInfo, eventDate, eventTime } = req.body;
    const userId = req.user?._id || req.body.userId;
    const requestRole = String(req.user?.role || req.body.userRole || '').toLowerCase();
    const isRoleAdmin = requestRole === 'admin' || requestRole === 'teacher';

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isAuthor = userId && post.author.toString() === String(userId);

    if (!isAuthor && !isRoleAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    if (title) post.title = title;
    if (description) post.description = description;
    if (category) post.category = category;
    if (tags) post.tags = tags;
    if (imageUrl) post.imageUrl = imageUrl;
    if (location) post.location = location;
    if (contactInfo) post.contactInfo = contactInfo;
    if (eventDate) {
      const parsedEventDate = new Date(eventDate);
      if (Number.isNaN(parsedEventDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Event date is invalid.'
        });
      }
      post.eventDate = parsedEventDate;
    }
    if (typeof eventTime === 'string') post.eventTime = eventTime;
    post.updatedAt = new Date();

    await post.save();

    return res.json({
      success: true,
      message: 'Post updated successfully',
      data: post
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: error.message
    });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.body?.userId || req.query?.userId;
    const requestRole = String(req.user?.role || req.body?.userRole || req.query?.userRole || '').toLowerCase();
    const isAdminRole = requestRole === 'admin' || requestRole === 'teacher';

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isAuthor = userId ? post.author.toString() === String(userId) : false;

    if (!isAuthor && !isAdminRole) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    await CommunityPost.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
};

// Add reply to post
exports.addReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?._id || req.body.userId;
    const userName = req.user?.name || req.body.userName || req.body.authorName || 'Community Member';

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const reply = {
      id: `reply-${Date.now()}`,
      authorId: userId || undefined,
      authorName: userName,
      content,
      createdAt: new Date()
    };

    post.replies.push(reply);
    await post.save();

    return res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: post
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to add reply',
      error: error.message
    });
  }
};

// Flag post (admin moderator)
exports.flagPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Flag reason is required'
      });
    }

    const post = await CommunityPost.findByIdAndUpdate(
      id,
      {
        flagged: true,
        flagReason: reason,
        status: 'flagged'
      },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    return res.json({
      success: true,
      message: 'Post flagged successfully',
      data: post
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to flag post',
      error: error.message
    });
  }
};

// Admin: Approve flagged post
exports.approveFlaggedPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await CommunityPost.findByIdAndUpdate(
      id,
      {
        flagged: false,
        flagReason: null,
        status: 'active'
      },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    return res.json({
      success: true,
      message: 'Post approved successfully',
      data: post
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to approve post',
      error: error.message
    });
  }
};

// Admin: Remove post
exports.removePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await CommunityPost.findByIdAndUpdate(
      id,
      { status: 'removed' },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    return res.json({
      success: true,
      message: 'Post removed successfully',
      data: post
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to remove post',
      error: error.message
    });
  }
};

// Get admin stats
exports.getStats = async (req, res) => {
  try {
    const totalPosts = await CommunityPost.countDocuments();
    const activeHere = await CommunityPost.countDocuments({ status: 'active' });
    const flaggedPosts = await CommunityPost.countDocuments({ flagged: true });
    const removedPosts = await CommunityPost.countDocuments({ status: 'removed' });

    const postsByType = await CommunityPost.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    return res.json({
      success: true,
      data: {
        totalPosts,
        activePosts: activeHere,
        flaggedPosts,
        removedPosts,
        postsByType
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
};

// Upvote post
exports.upvotePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.body?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to vote'
      });
    }

    const post = await CommunityPost.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const alreadyUpvoted = post.upvotedBy.some(
      (voterId) => voterId.toString() === userId.toString()
    );

    if (alreadyUpvoted) {
      return res.status(409).json({
        success: false,
        message: 'You have already upvoted this post'
      });
    }

    const updatedPost = await CommunityPost.findByIdAndUpdate(
      id,
      {
        $inc: { upvotes: 1 },
        $addToSet: { upvotedBy: userId }
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: 'Post upvoted successfully',
      data: updatedPost
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to upvote post',
      error: error.message
    });
  }
};
