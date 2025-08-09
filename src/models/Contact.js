const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  email: { type: String, required: true, lowercase: true, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'] },
  phone: String,
  company: String,
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ['new', 'in-progress', 'resolved', 'closed'], default: 'new' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  ipAddress: String,
  userAgent: String,
  source: { type: String, enum: ['website', 'mobile', 'api'], default: 'website' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual
contactSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes
contactSchema.index({ status: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ assignedTo: 1 });

// Auto-populate
contactSchema.pre(/^find/, function (next) {
  this.populate({ path: 'assignedTo', select: 'firstName lastName fullName' })
      .populate({ path: 'notes.user', select: 'firstName lastName fullName' });
  next();
});

module.exports = mongoose.model('Contact', contactSchema);
