const Newsletter = require('../models/Newsletter');
const emailService = require('../services/emailService');
const { validateNewsletter } = require('../utils/validation');

// @desc    Get all newsletters
// @route   GET /api/newsletters
// @access  Public
exports.getNewsletters = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      featured,
      author,
      search
    } = req.query;
    
    // Build query
    let query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (featured !== undefined) query.featured = featured === 'true';
    if (author) query.author = author;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const newsletters = await Newsletter.find(query)
      .populate('author', 'firstName lastName fullName avatar')
      .sort({ publishDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Newsletter.countDocuments(query);

    res.status(200).json({
      success: true,
      count: newsletters.length,
      total,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      },
      data: newsletters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single newsletter
// @route   GET /api/newsletters/:id
// @access  Public
exports.getNewsletter = async (req, res) => {
  try {
    let newsletter;
    
    // Check if it's a slug or ID
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      newsletter = await Newsletter.findById(req.params.id);
    } else {
      newsletter = await Newsletter.findOne({ slug: req.params.id });
    }

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter not found'
      });
    }

    // Increment views
    newsletter.views += 1;
    await newsletter.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      data: newsletter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create newsletter
// @route   POST /api/newsletters
// @access  Private (Admin/Editor)
exports.createNewsletter = async (req, res) => {
  try {
    const { error, value } = validateNewsletter(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const newsletter = await Newsletter.create(value);

    res.status(201).json({
      success: true,
      data: newsletter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update newsletter
// @route   PUT /api/newsletters/:id
// @access  Private (Admin/Editor)
exports.updateNewsletter = async (req, res) => {
  try {
    let newsletter = await Newsletter.findById(req.params.id);

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter not found'
      });
    }

    // // Check ownership (unless admin)
    // if (newsletter.author.toString() !== req.user.id && req.user.role !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Not authorized to update this newsletter'
    //   });
    // }

    // const { error, value } = validateNewsletter(req.body, true);
    // if (error) {
    //   return res.status(400).json({
    //     success: false,
    //     message: error.details[0].message
    //   });
    // }
    const value = req.body

    newsletter = await Newsletter.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: newsletter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete newsletter
// @route   DELETE /api/newsletters/:id
// @access  Private (Admin/Editor)
exports.deleteNewsletter = async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter not found'
      });
    }

    // Check ownership (unless admin)
    if (newsletter.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this newsletter'
      });
    }

    await Newsletter.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Newsletter deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Send newsletter to subscribers
// @route   POST /api/newsletters/:id/send
// @access  Private (Admin/Editor)
exports.sendNewsletter = async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);

    if (!newsletter) {
      return res.status(404).json({
        success: false,
        message: 'Newsletter not found'
      });
    }

    if (newsletter.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Newsletter must be published before sending'
      });
    }

    // Send newsletter via email service
    const result = await emailService.sendNewsletterToSubscribers(newsletter);

    // Update newsletter
    newsletter.emailSent = true;
    newsletter.emailSentDate = new Date();
    await newsletter.save();

    res.status(200).json({
      success: true,
      message: 'Newsletter sent successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get newsletters by type
// @route   GET /api/newsletters/type/:type
// @access  Public
exports.getNewslettersByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const newsletters = await Newsletter.findByType(type)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Newsletter.countDocuments({ 
      type, 
      status: 'published' 
    });

    res.status(200).json({
      success: true,
      count: newsletters.length,
      total,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      },
      data: newsletters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};