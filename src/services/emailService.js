const nodemailer = require('nodemailer');
const Subscriber = require('../models/Subscriber');
const Settings = require('../models/Settings');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Send welcome email to new user
  async sendWelcomeEmail(user) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Welcome to Our Newsletter!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Welcome ${user.fullName}!</h2>
          <p>Thank you for joining our newsletter community.</p>
          <p>We're excited to keep you updated with our latest news and updates.</p>
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p><strong>Your Account Details:</strong></p>
            <ul>
              <li>Email: ${user.email}</li>
              <li>Name: ${user.fullName}</li>
              <li>Member since: ${new Date().toLocaleDateString()}</li>
            </ul>
          </div>
          <p>Best regards,<br>Newsletter Team</p>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }

  // Send subscription confirmation email
  async sendSubscriptionConfirmation(subscriber) {
    const siteName = await Settings.getSetting('site_name', 'Newsletter Website');
    const verifyUrl = `${process.env.FRONTEND_URL}/verify/${subscriber.verificationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: subscriber.email,
      subject: `Welcome to ${siteName}! Please confirm your subscription`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Welcome to ${siteName}!</h2>
          <p>Hi ${subscriber.fullName || 'there'},</p>
          <p>Thank you for subscribing to our newsletter. To complete your subscription, please confirm your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Confirm Subscription
            </a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${verifyUrl}</p>
          
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p><strong>Your Subscription Details:</strong></p>
            <ul>
              <li>Email: ${subscriber.email}</li>
              <li>Interests: ${subscriber.interests.join(', ') || 'All topics'}</li>
              <li>Subscribed: ${new Date().toLocaleDateString()}</li>
            </ul>
          </div>
          
          <p>Best regards,<br>The ${siteName} Team</p>
          
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            If you didn't subscribe to this newsletter, please ignore this email.
          </p>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }

  // Send contact form confirmation
  async sendContactConfirmation(contact) {
    const siteName = await Settings.getSetting('site_name', 'Newsletter Website');

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: contact.email,
      subject: `Thank you for contacting ${siteName}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Thank you for contacting us!</h2>
          <p>Hi ${contact.fullName},</p>
          <p>We've received your message and will get back to you as soon as possible.</p>
          
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p><strong>Your Message Details:</strong></p>
            <ul>
              <li><strong>Subject:</strong> ${contact.subject}</li>
              <li><strong>Message:</strong></li>
            </ul>
            <div style="margin: 10px 0; padding: 15px; background-color: white; border-left: 4px solid #007bff;">
              ${contact.message}
            </div>
            <ul>
              <li><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</li>
              <li><strong>Reference ID:</strong> ${contact._id}</li>
            </ul>
          </div>
          
          <p>We typically respond within 24-48 hours during business days.</p>
          <p>Best regards,<br>The ${siteName} Team</p>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }

  // Send contact notification to admins
  async sendContactNotification(contact) {
    const siteName = await Settings.getSetting('site_name', 'Newsletter Website');
    const adminEmail = await Settings.getSetting('admin_email', process.env.EMAIL_USER);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: adminEmail,
      subject: `New Contact Form Submission - ${siteName}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>New Contact Form Submission</h2>
          
          <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p><strong>Contact Details:</strong></p>
            <ul>
              <li><strong>Name:</strong> ${contact.fullName}</li>
              <li><strong>Email:</strong> ${contact.email}</li>
              <li><strong>Phone:</strong> ${contact.phone || 'Not provided'}</li>
              <li><strong>Company:</strong> ${contact.company || 'Not provided'}</li>
              <li><strong>Subject:</strong> ${contact.subject}</li>
              <li><strong>Priority:</strong> ${contact.priority}</li>
            </ul>
            
            <p><strong>Message:</strong></p>
            <div style="margin: 10px 0; padding: 15px; background-color: white; border-left: 4px solid #007bff;">
              ${contact.message}
            </div>
            
            <ul>
              <li><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</li>
              <li><strong>IP Address:</strong> ${contact.ipAddress || 'Not recorded'}</li>
              <li><strong>Reference ID:</strong> ${contact._id}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/admin/contacts/${contact._id}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View in Admin Panel
            </a>
          </div>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }

  // Send newsletter to all active subscribers
  async sendNewsletterToSubscribers(newsletter) {
    try {
      // Get subscribers based on newsletter type and general subscribers
      const interests = newsletter.type === 'general' ? ['general'] : [newsletter.type, 'general'];
      
      const subscribers = await Subscriber.find({
        isActive: true,
        isVerified: true,
        interests: { $in: interests }
      });

      if (subscribers.length === 0) {
        return { sent: 0, failed: 0, message: 'No active subscribers found' };
      }

      const siteName = await Settings.getSetting('site_name', 'Newsletter Website');
      const batchSize = await Settings.getSetting('max_newsletters_per_batch', 100);
      
      let sent = 0;
      let failed = 0;

      // Send emails in batches
      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        const emailPromises = batch.map(subscriber => this.sendNewsletterEmail(newsletter, subscriber, siteName));
        
        const results = await Promise.allSettled(emailPromises);
        
        results.forEach((result, index) => {
          const subscriber = batch[index];
          if (result.status === 'fulfilled') {
            sent++;
            // Update subscriber stats
            subscriber.emailsSent += 1;
            subscriber.lastEmailSent = new Date();
            subscriber.save({ validateBeforeSave: false });
          } else {
            failed++;
            console.error(`Failed to send newsletter to ${subscriber.email}:`, result.reason);
          }
        });

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < subscribers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return { sent, failed, total: subscribers.length };
    } catch (error) {
      console.error('Newsletter sending error:', error);
      throw error;
    }
  }

  // Send newsletter email to individual subscriber
  async sendNewsletterEmail(newsletter, subscriber, siteName) {
    const unsubscribeUrl = `${process.env.FRONTEND_URL}/unsubscribe/${subscriber.unsubscribeToken}`;
    const newsletterUrl = `${process.env.FRONTEND_URL}/newsletters/${newsletter.slug}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: subscriber.email,
      subject: newsletter.title,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">${siteName}</h1>
            <p style="color: #666; margin: 5px 0;">Newsletter</p>
          </div>
          
          <div style="padding: 20px;">
            <h2 style="color: #333;">${newsletter.title}</h2>
            
            ${newsletter.featuredImage ? `
              <img src="${newsletter.featuredImage}" 
                   alt="${newsletter.title}" 
                   style="width: 100%; max-width: 600px; height: auto; margin: 20px 0; border-radius: 5px;">
            ` : ''}
            
            <div style="color: #666; margin: 10px 0;">
              <p><strong>Type:</strong> ${newsletter.type.charAt(0).toUpperCase() + newsletter.type.slice(1)}</p>
              <p><strong>Published:</strong> ${new Date(newsletter.publishDate).toLocaleDateString()}</p>
              <p><strong>Reading time:</strong> ${newsletter.readingTime} min</p>
            </div>
            
            ${newsletter.excerpt ? `
              <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff;">
                <p style="margin: 0; font-style: italic;">${newsletter.excerpt}</p>
              </div>
            ` : ''}
            
            <div style="margin: 20px 0; line-height: 1.6;">
              ${newsletter.content.substring(0, 500)}${newsletter.content.length > 500 ? '...' : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${newsletterUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Read Full Newsletter
              </a>
            </div>
            
            ${newsletter.tags && newsletter.tags.length > 0 ? `
              <div style="margin: 20px 0;">
                <p><strong>Tags:</strong></p>
                <div>
                  ${newsletter.tags.map(tag => `
                    <span style="display: inline-block; background-color: #e9ecef; color: #495057; padding: 4px 8px; border-radius: 3px; margin: 2px; font-size: 12px;">
                      ${tag}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>You're receiving this email because you subscribed to our newsletter.</p>
            <p>
              <a href="${unsubscribeUrl}" style="color: #007bff; text-decoration: none;">
                Unsubscribe from this newsletter
              </a>
            </p>
            <p style="margin: 10px 0;">
              © ${new Date().getFullYear()} ${siteName}. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();