const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true, // Automatically creates a unique index
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['general', 'email', 'newsletter', 'social', 'seo', 'security'],
    default: 'general'
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Keep only necessary extra indexes (no duplicate for key)
settingsSchema.index({ category: 1 });
settingsSchema.index({ isPublic: 1 });

// Static method to get setting by key
settingsSchema.statics.getSetting = async function (key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set setting
settingsSchema.statics.setSetting = async function (key, value, type = 'string', description = '', category = 'general') {
  return this.findOneAndUpdate(
    { key },
    { value, type, description, category },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Settings', settingsSchema);