import { LoopsClient } from 'loops';
import logger from '../config/logger.js';

class LoopsService {
  constructor(apiKey) {
    this.client = new LoopsClient(apiKey);
  }

  async sendEmail(summary, videoId) {
    try {
      logger.info('Attempting to send email via Loops...');
      logger.info('Summary:', summary);

      // Ensure summary is an object and handle potential parsing errors
      let summaryObj;
      try {
        summaryObj =
          typeof summary === 'string' ? JSON.parse(summary) : summary;
      } catch (parseError) {
        logger.error('Error parsing summary:', parseError);
        throw new Error('Failed to parse summary data');
      }

      await this.client.sendEvent({
        email: 'lepadatu.mihail1@gmail.com',
        eventName: 'crypto_analysis',
        eventProperties: {
          ...summaryObj,
          videoId,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('Email sent successfully via Loops');
      return { success: true };
    } catch (error) {
      logger.error('Error sending email via Loops:', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

export default LoopsService;
