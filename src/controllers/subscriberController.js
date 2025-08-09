const Subscriber = require('../models/Subscriber');
const emailService = require('../services/emailService');
const { validateSubscriber } = require('../utils/validation');
const crypto = require('crypto');

// @desc    Subscribe to newsletter
// @route   POST /api/subscribers/subscribe
// @access  Public
exports.subscribe = async (req, res) => {
  try {
    const { error, value } = validateSubscriber(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check if already subscribed
    const existingSubscriber = await Subscriber.findOne({ email: value.email });
    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Email already subscribed'
        });
      } else {
        // Reactivate subscription
        existingSubscriber.isActive = true;
        existingSubscriber.interests = value.interests || existingSubscriber.interests;
        existingSubscriber.subscribedAt = new Date();
        existingSubscriber.unsubscribedAt = null;
        existingSubscriber.ipAddress = req.ip;
        existingSubscriber.userAgent = req.get('User-Agent');
        await existingSubscriber.save();

        // Send welcome email
        try {
          await emailService.sendSubscriptionConfirmation(existingSubscriber);
        } catch (emailError) {
          console.error('Subscription confirmation email failed:', emailError);
        }

        return res.status(200).json({
          success: true,
          message: 'Subscription reactivated successfully',
          data: existingSubscriber
        });
      }
    }

    // Add metadata
    value.ipAddress = req.ip;
    value.userAgent = req.get('User-Agent');
    value.verificationToken = crypto.randomBytes(32).toString('hex');

    const subscriber = await Subscriber.create(value);

    // Send confirmation email
    try {
      await emailService.sendSubscriptionConfirmation(subscriber);
    } catch (emailError) {
      console.error('Subscription confirmation email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Subscribed successfully! Please check your email to confirm.',
      data: subscriber
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify email subscription
// @route   GET /api/subscribers/verify/:token
// @access  Public
exports.verifySubscription = async (req, res) => {
  try {
    const subscriber = await Subscriber.findOne({
      verificationToken: req.params.token
    });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    subscriber.isVerified = true;
    subscriber.verificationToken = undefined;
    await subscriber.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Unsubscribe from newsletter
// @route   GET /api/subscribers/unsubscribe/:token
// @access  Public
exports.unsubscribe = async (req, res) => {
  try {
    const subscriber = await Subscriber.findOne({
      unsubscribeToken: req.params.token
    });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Invalid unsubscribe token'
      });
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all subscribers
// @route   GET /api/subscribers
// @access  Private (Admin)
exports.getSubscribers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      isActive,
      interests,
      search
    } = req.query;

    // Build query
    let query = {};
    
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (interests) query.interests = { $in: interests.split(',') };
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const subscribers = await Subscriber.find(query)
      .sort({ subscribedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Subscriber.countDocuments(query);

    res.status(200).json({
      success: true,
      count: subscribers.length,
      total,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      },
      data: subscribers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get subscriber statistics
// @route   GET /api/subscribers/stats
// @access  Private (Admin)
exports.getSubscriberStats = async (req, res) => {
  try {
    const totalSubscribers = await Subscriber.countDocuments();
    const activeSubscribers = await Subscriber.countDocuments({ isActive: true });
    const verifiedSubscribers = await Subscriber.countDocuments({ isVerified: true });
    
    // Subscribers by interests
    const interestStats = await Subscriber.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$interests' },
      { $group: { _id: '$interests', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Subscribers by month for the last 12 months
    const subscribersByMonth = await Subscriber.aggregate([
      {
        $match: {
          subscribedAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$subscribedAt' },
            month: { $month: '$subscribedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalSubscribers,
        active: activeSubscribers,
        verified: verifiedSubscribers,
        byInterests: interestStats,
        monthlyData: subscribersByMonth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update subscriber
// @route   PUT /api/subscribers/:id
// @access  Private (Admin)
exports.updateSubscriber = async (req, res) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'interests', 'isActive'];
    const updateData = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    const subscriber = await Subscriber.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subscriber
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete subscriber
// @route   DELETE /api/subscribers/:id
// @access  Private (Admin)
exports.deleteSubscriber = async (req, res) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found'
      });
    }

    await Subscriber.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Subscriber deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};