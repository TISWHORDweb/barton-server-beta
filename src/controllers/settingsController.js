const Settings = require('../models/Settings');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private (Admin)
exports.getSettings = async (req, res) => {
  try {
    const { category, isPublic } = req.query;
    
    let query = {};
    if (category) query.category = category;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';

    const settings = await Settings.find(query).sort({ category: 1, key: 1 });

    // Group by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: groupedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get public settings
// @route   GET /api/settings/public
// @access  Public
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await Settings.find({ isPublic: true }).sort({ category: 1, key: 1 });

    // Convert to key-value pairs
    const publicSettings = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: publicSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get setting by key
// @route   GET /api/settings/:key
// @access  Private (Admin)
exports.getSetting = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.status(200).json({
      success: true,
      data: setting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create or update setting
// @route   POST /api/settings
// @access  Private (Admin)
exports.createOrUpdateSetting = async (req, res) => {
  try {
    const { key, value, type, description, category, isPublic } = req.body;

    if (!key || value === undefined || !type) {
      return res.status(400).json({
        success: false,
        message: 'Key, value, and type are required'
      });
    }

    const setting = await Settings.setSetting(
      key,
      value,
      type,
      description || '',
      category || 'general'
    );

    if (isPublic !== undefined) {
      setting.isPublic = isPublic;
      await setting.save();
    }

    res.status(200).json({
      success: true,
      data: setting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update multiple settings
// @route   PUT /api/settings/bulk
// @access  Private (Admin)
exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: 'Settings must be an array'
      });
    }

    const updatePromises = settings.map(setting => {
      const { key, value, type, description, category, isPublic } = setting;
      return Settings.findOneAndUpdate(
        { key },
        { value, type, description, category, isPublic },
        { upsert: true, new: true }
      );
    });

    const updatedSettings = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete setting
// @route   DELETE /api/settings/:key
// @access  Private (Admin)
exports.deleteSetting = async (req, res) => {
  try {
    const setting = await Settings.findOneAndDelete({ key: req.params.key });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Initialize default settings
// @route   POST /api/settings/initialize
// @access  Private (Admin)
exports.initializeSettings = async (req, res) => {
  try {
    const defaultSettings = [
      // General settings
      { key: 'site_name', value: 'Newsletter Website', type: 'string', description: 'Website name', category: 'general', isPublic: true },
      { key: 'site_description', value: 'Stay updated with our latest news', type: 'string', description: 'Website description', category: 'general', isPublic: true },
      { key: 'admin_email', value: 'admin@example.com', type: 'string', description: 'Admin email address', category: 'general', isPublic: false },
      
      // Email settings
      { key: 'email_from_name', value: 'Newsletter Team', type: 'string', description: 'Email sender name', category: 'email', isPublic: false },
      { key: 'email_notifications', value: true, type: 'boolean', description: 'Enable email notifications', category: 'email', isPublic: false },
      
      // Newsletter settings
      { key: 'newsletter_frequency', value: 'weekly', type: 'string', description: 'Newsletter frequency', category: 'newsletter', isPublic: true },
      { key: 'max_newsletters_per_batch', value: 100, type: 'number', description: 'Max newsletters per batch send', category: 'newsletter', isPublic: false },
      
      // SEO settings
      { key: 'meta_keywords', value: 'newsletter, news, updates', type: 'string', description: 'Default meta keywords', category: 'seo', isPublic: true },
      { key: 'google_analytics_id', value: '', type: 'string', description: 'Google Analytics tracking ID', category: 'seo', isPublic: true }
    ];

    const createPromises = defaultSettings.map(setting => 
      Settings.findOneAndUpdate(
        { key: setting.key },
        setting,
        { upsert: true, new: true }
      )
    );

    await Promise.all(createPromises);

    res.status(200).json({
      success: true,
      message: 'Default settings initialized successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};