const mongoose = require('mongoose');
const crypto = require('crypto');

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'] },
  firstName: String,
  lastName: String,
  interests: [{ type: String, enum: ['photos', 'press', 'videos', 'general'] }],
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  unsubscribeToken: { type: String, unique: true },
  source: { type: String, enum: ['website', 'mobile', 'import', 'api'], default: 'website' },
  ipAddress: String,
  userAgent: String,
  subscribedAt: { type: Date, default: Date.now },
  unsubscribedAt: Date,
  lastEmailSent: Date,
  emailsSent: { type: Number, default: 0 },
  emailsOpened: { type: Number, default: 0 },
  emailsClicked: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtuals
subscriberSchema.virtual('fullName').get(function () {
  return this.firstName && this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName || this.email;
});
subscriberSchema.virtual('engagementRate').get(function () {
  if (this.emailsSent === 0) return 0;
  return ((this.emailsOpened + this.emailsClicked) / (this.emailsSent * 2)) * 100;
});

// Indexes
subscriberSchema.index({ isActive: 1 });
subscriberSchema.index({ interests: 1 });
subscriberSchema.index({ subscribedAt: -1 });

// Unsubscribe token generation
subscriberSchema.pre('save', function (next) {
  if (this.isNew && !this.unsubscribeToken) {
    this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

module.exports = mongoose.model('Subscriber', subscriberSchema);
