import logger from '../config/logger.js';

class TranscriptController {
  constructor(youtubeService, openaiService, loopsService) {
    this.youtubeService = youtubeService;
    this.openaiService = openaiService;
    this.loopsService = loopsService;
  }

  async getTranscript(req, res) {
    const { videoId } = req.params;
    const { summary, format, sendEmail } = req.query;

    try {
      const transcript = await this.youtubeService.getTranscript(videoId);
      
      // Generate summary if requested
      let summaryData = null;
      let apiResponse = null;
      if (summary === 'true') {
        try {
          const result = await this.openaiService.generateSummary(transcript);
          summaryData = result.summary;
          apiResponse = result.apiResponse;
          logger.info('Summary generated successfully');

          // Send email if requested
          if (sendEmail === 'true') {
            await this.loopsService.sendEmail(summaryData, videoId);
          }
        } catch (summaryError) {
          logger.error('Error generating summary:', summaryError);
          return res.status(500).json({
            error: 'Failed to generate summary',
            details: summaryError.message
          });
        }
      }
      
      // Handle different response formats
      if (format === 'markdown') {
        return res.send(summaryData);
      }

      if (format === 'html') {
        return res
          .type('html')
          .send(`<pre style="font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; line-height: 1.6;">${summaryData}</pre>`);
      }

      // Default JSON response
      const response = {
        videoId,
        metadata: {
          totalEntries: transcript.length,
          totalDuration: transcript.reduce((sum, entry) => sum + entry.duration, 0)
        }
      };

      if (summaryData) {
        response.summary = summaryData;
        response.openai = apiResponse;
      }

      return res.json(response);

    } catch (error) {
      logger.error('Error processing request:', error);

      if (error.message === 'No captions available for this video') {
        return res.status(404).json({
          error: 'No captions available for this video'
        });
      }

      if (error.message === 'Failed to parse captions') {
        return res.status(500).json({
          error: 'Failed to parse video captions'
        });
      }

      if (error.message === 'Invalid YouTube video ID format') {
        return res.status(400).json({
          error: 'Invalid YouTube video ID format'
        });
      }

      return res.status(500).json({
        error: 'An error occurred while processing the request'
      });
    }
  }
}

export default TranscriptController; 