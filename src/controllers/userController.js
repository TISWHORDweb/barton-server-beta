const Contact = require('../models/Contact');
const Newsletter = require('../models/Newsletter');
const User = require('../models/User');
const { validateUserUpdate } = require('../utils/validation');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search
    } = req.query;

    // Build query
    let query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      },
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getDashboardAnalytics = async (req, res) => {
  try {
    // ---- Get counts ----
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    const totalContacts = await Contact.countDocuments();
    const newContacts = await Contact.countDocuments({ status: 'new' });

    const totalNewsletters = await Newsletter.countDocuments();
    const publishedNewsletters = await Newsletter.countDocuments({ status: 'published' });

    // ---- Recent 5 ----
    const recentContacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email subject message status createdAt");

    // Fix: Disable virtuals when querying Newsletter to avoid virtual property errors
    const recentNewsletters = await Newsletter.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title slug excerpt status createdAt")
      .lean(); // Use lean() to get plain objects without virtuals

    // ---- Chart data (generic last 7 days) ----
    const today = new Date();

    // Create the date for 6 days ago (to get last 7 days including today)
    const sixDaysAgo = new Date(today);
    sixDaysAgo.setDate(today.getDate() - 6);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));

      // Format as YYYY-MM-DD safely
      const formattedDate = date instanceof Date && !isNaN(date)
        ? date.getFullYear() +
        '-' + String(date.getMonth() + 1).padStart(2, '0') +
        '-' + String(date.getDate()).padStart(2, '0')
        : null;

      return {
        date: formattedDate,
        users: 0,
        contacts: 0,
        newsletters: 0
      };
    });

    // Aggregate daily counts for the last 7 days
    const userStats = await User.aggregate([
      { $match: { createdAt: { $gte: sixDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
    ]);

    const contactStats = await Contact.aggregate([
      { $match: { createdAt: { $gte: sixDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
    ]);

    const newsletterStats = await Newsletter.aggregate([
      { $match: { createdAt: { $gte: sixDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
    ]);

    // Merge into chart data
    last7Days.forEach(day => {
      const userDay = userStats.find(u => u._id === day.date);
      const contactDay = contactStats.find(c => c._id === day.date);
      const newsletterDay = newsletterStats.find(n => n._id === day.date);

      day.users = userDay ? userDay.count : 0;
      day.contacts = contactDay ? contactDay.count : 0;
      day.newsletters = newsletterDay ? newsletterDay.count : 0;
    });

    // ---- Response ----
    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers
        },
        contacts: {
          total: totalContacts,
          new: newContacts,
          recent: recentContacts
        },
        newsletters: {
          total: totalNewsletters,
          published: publishedNewsletters,
          recent: recentNewsletters
        },
        chart: last7Days // last 7 days chart data
      }
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin or own profile)
exports.getUser = async (req, res) => {
  try {
    // Check if user is requesting their own profile or is admin
    if (!req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this user'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or own profile)
exports.updateUser = async (req, res) => {
  try {
    // Check if user is updating their own profile or is admin
    if (!req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    const { error, value } = validateUserUpdate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Don't allow non-admin users to change role
    // if (req.user.role !== 'admin') {
    //   delete value.role;
    //   delete value.isActive;
    // }

    const user = await User.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (Admin)
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const editorUsers = await User.countDocuments({ role: 'editor' });
    const regularUsers = await User.countDocuments({ role: 'user' });

    // Users by month for the last 12 months
    const usersByMonth = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
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
        total: totalUsers,
        active: activeUsers,
        byRole: {
          admin: adminUsers,
          editor: editorUsers,
          user: regularUsers
        },
        monthlyData: usersByMonth
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