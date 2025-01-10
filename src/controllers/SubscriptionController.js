import logger from '../config/logger.js';

class SubscriptionController {
  constructor(firebaseService) {
    this.firebaseService = firebaseService;
  }

  async addSubscriber(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email is required',
        });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
        });
      }

      const result = await this.firebaseService.addEmailSubscriber(email);

      return res.status(201).json({
        message: 'Subscription successful',
        data: result,
      });
    } catch (error) {
      logger.error('Error in addSubscriber:', error);

      if (error.message === 'Email already subscribed') {
        return res.status(409).json({
          error: 'Email already subscribed',
        });
      }

      return res.status(500).json({
        error: 'Failed to add subscriber',
      });
    }
  }
}

export default SubscriptionController;
