import express from 'express';
import dotenv from 'dotenv';
import logger from './config/logger.js';
import YoutubeService from './services/YoutubeService.js';
import OpenAIService from './services/OpenAIService.js';
import LoopsService from './services/LoopsService.js';
import FirebaseService from './services/FirebaseService.js';
import YoutubeMonitorService from './services/YoutubeMonitorService.js';
import TranscriptController from './controllers/TranscriptController.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize services
const youtubeService = new YoutubeService();
const openaiService = new OpenAIService(process.env.OPENAI_API_KEY);
const loopsService = new LoopsService(process.env.LOOPS_API_KEY);
const firebaseService = new FirebaseService();

// Initialize YouTube monitor
const youtubeMonitor = new YoutubeMonitorService(
  youtubeService,
  openaiService,
  loopsService,
  firebaseService
);

// Initialize controller
const transcriptController = new TranscriptController(
  youtubeService,
  openaiService,
  loopsService,
  firebaseService
);

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      youtube: !!youtubeService,
      openai: !!process.env.OPENAI_API_KEY,
      loops: !!process.env.LOOPS_API_KEY,
      firebase: !!firebaseService,
      monitor: !!youtubeMonitor,
    },
  });
});

// Routes
app.get('/transcript/:videoId', (req, res) =>
  transcriptController.getTranscript(req, res)
);

// Channel check endpoint (supports both GET and POST)
const handleChannelCheck = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { summary, sendEmail } = req.query;
    logger.info(
      `Channel check requested for channel: ${channelId}, summary: ${summary}, sendEmail: ${sendEmail}`
    );

    const result = await youtubeMonitor.checkNewVideosForChannel(channelId, {
      forceSummary: summary === 'true',
      forceSendEmail: sendEmail === 'true',
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in channel check:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

app.get('/check-channel/:channelId', handleChannelCheck);
app.post('/check-channel/:channelId', handleChannelCheck);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

// Start server and YouTube monitor
app.listen(port, '0.0.0.0', () => {
  logger.info(`Server is running on port ${port}`);

  // Start monitoring YouTube channels (check every  6 hours)
  youtubeMonitor.startMonitoring(6 * 60);
  logger.info('YouTube channel monitoring started');
});
