const Joi = require('joi');

// User registration validation
const validateRegister = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).required().trim(),
    lastName: Joi.string().min(2).max(50).required().trim(),
    email: Joi.string().email().required().lowercase(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().required()
  });

  return schema.validate(data);
};

// User login validation
const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().lowercase(),
    password: Joi.string().required()
  });

  return schema.validate(data);
};

// User update validation
const validateUserUpdate = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).trim(),
    lastName: Joi.string().min(2).max(50).trim(),
    email: Joi.string().email().lowercase(),
    role: Joi.string().valid('admin', 'editor', 'user'),
    isActive: Joi.boolean(),
    avatar: Joi.string().uri()
  });

  return schema.validate(data);
};

// Newsletter validation
const validateNewsletter = (data, isUpdate = false) => {
  const schema = Joi.object({
    title: Joi.string().min(5).max(200).required().trim(),
    content: Joi.string().min(10).required(),
    excerpt: Joi.string().max(500).trim(),
    type: Joi.string().valid('photos', 'press', 'videos', 'general').default('general'),
    featuredImage: Joi.string().uri(),
    gallery: Joi.array().items(Joi.object({
      url: Joi.string().uri().required(),
      alt: Joi.string().trim(),
      caption: Joi.string().trim()
    })),
    videoUrl: Joi.string().uri(),
    tags: Joi.array().items(Joi.string().trim()),
    status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
    publishDate: Joi.date(),
    featured: Joi.boolean().default(false),
    seo: Joi.object({
      metaTitle: Joi.string().max(60).trim(),
      metaDescription: Joi.string().max(160).trim(),
      metaKeywords: Joi.array().items(Joi.string().trim())
    })
  });

  return schema.validate(data, { allowUnknown: isUpdate });
};

// Contact form validation
const validateContact = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).required().trim(),
    lastName: Joi.string().min(2).max(50).required().trim(),
    email: Joi.string().email().required().lowercase(),
    phone: Joi.string().trim(),
    company: Joi.string().trim(),
    subject: Joi.string().min(5).max(200).required().trim(),
    message: Joi.string().min(10).max(2000).required().trim(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium')
  });

  return schema.validate(data);
};

// Subscriber validation
const validateSubscriber = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().lowercase(),
    firstName: Joi.string().min(2).max(50).trim(),
    lastName: Joi.string().min(2).max(50).trim(),
    interests: Joi.array().items(
      Joi.string().valid('photos', 'press', 'videos', 'general')
    ).default(['general'])
  });

  return schema.validate(data);
};

module.exports = {
  validateRegister,
  validateLogin,
  validateUserUpdate,
  validateNewsletter,
  validateContact,
  validateSubscriber
};