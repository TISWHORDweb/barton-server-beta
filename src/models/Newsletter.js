const mongoose = require('mongoose');
const slugify = require('slugify');

const newsletterSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, unique: true },
  content: { type: String, required: true },
  excerpt: { type: String, maxlength: 500 },
  type: { type: String, enum: ['photos', 'press', 'videos', 'general'], default: 'general', required: true },
  featuredImage: String,
  gallery: [{ url: String, alt: String, caption: String }],
  videoUrl: String,
  tags: [String],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  publishDate: Date,
  views: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
  emailSentDate: Date,
  subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subscriber' }],
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String]
  }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Indexes
newsletterSchema.index({ type: 1 });
newsletterSchema.index({ status: 1 });
newsletterSchema.index({ publishDate: -1 });
newsletterSchema.index({ tags: 1 });
newsletterSchema.index({ featured: 1 });

// Slug generation
newsletterSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  }
  next();
});

// Auto-populate author
newsletterSchema.pre(/^find/, function (next) {
  this.populate({ path: 'author', select: 'firstName lastName fullName avatar' });
  next();
});

// Reading time
newsletterSchema.virtual('readingTime').get(function () {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Static find by type
newsletterSchema.statics.findByType = function (type) {
  return this.find({ type, status: 'published' }).sort({ publishDate: -1 });
};

module.exports = mongoose.model('Newsletter', newsletterSchema);
