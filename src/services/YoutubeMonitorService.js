import { google } from 'googleapis';
import logger from '../config/logger.js';

class YoutubeMonitorService {
  constructor(youtubeService, openaiService, loopsService, firebaseService) {
    this.youtube = google.youtube('v3');
    this.youtubeService = youtubeService;
    this.openaiService = openaiService;
    this.loopsService = loopsService;
    this.firebaseService = firebaseService;
    this.channels = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      const channelsToMonitor = [
        // {
        //   id: 'UCL-QLzGmf468WAL1U-9g0qA',
        //   displayName: 'Perico',
        // },
        // {
        //   id: 'UC7B3Y1yrg4S7mmgoR-NsfxA',
        //   displayName: 'Taiki Maeda',
        // },
        // {
        //   id: 'UCKc3w9FKFGdBR9PIkfngzPg',
        //   displayName: 'Shift',
        // },
        {
          id: 'UClgJyzwGs-GyaNxUHcLZrkg',
          displayName: 'Invest Answers',
        },
        {
          id: 'UC_Wcg4f22Zhf2tU8oD-LK4w',
          displayName: 'Trader XO',
        },
      ];

      // Initialize each channel
      for (const channel of channelsToMonitor) {
        try {
          // Verify channel exists and get details
          const response = await this.youtube.channels.list({
            key: process.env.YOUTUBE_API_KEY,
            part: 'snippet',
            id: channel.id,
          });

          if (!response.data.items || response.data.items.length === 0) {
            logger.error(`Channel not found: ${channel.id}`);
            continue;
          }

          const channelData = {
            id: channel.id,
            displayName: channel.displayName,
            actualName: response.data.items[0].snippet.title,
            lastChecked: new Date(),
          };

          this.channels.push(channelData);
          logger.info(
            `Initialized monitoring for channel: ${channelData.displayName} (${channelData.id})`
          );

          // Store or update channel info in Firestore
          await this.firebaseService.updateChannel(channelData);
        } catch (error) {
          logger.error(
            `Error initializing channel ${channel.displayName}:`,
            error
          );
        }
      }

      if (this.channels.length === 0) {
        throw new Error('No channels could be initialized');
      }

      this.initialized = true;
      logger.info(
        `Initialized YouTube monitor for ${this.channels.length} channels`
      );
    } catch (error) {
      logger.error('Error initializing YouTube monitor:', error);
      throw error;
    }
  }

  async checkNewVideosForChannel(channelId) {
    try {
      // Ensure monitor is initialized
      if (!this.initialized) {
        logger.info('Monitor not initialized, initializing now...');
        await this.initialize();
      }

      // Find channel in our monitored list
      const channel = this.channels.find((c) => c.id === channelId);

      if (!channel) {
        throw new Error(`Channel ${channelId} not found in monitored channels`);
      }

      logger.info(
        `Manually checking videos for channel: ${channel.displayName} (${channel.id})`
      );

      // Prepare search parameters
      const searchParams = {
        key: process.env.YOUTUBE_API_KEY,
        channelId: channel.id,
        part: 'snippet',
        order: 'date',
        maxResults: 1,
        type: 'video',
      };

      // Get latest videos from channel
      const response = await this.youtube.search.list(searchParams);

      logger.info(
        `Found ${response.data.items?.length || 0} videos for channel ${
          channel.displayName
        }`
      );

      const processedVideos = [];

      for (const item of response.data.items) {
        const videoId = item.id.videoId;
        const publishDate = new Date(item.snippet.publishedAt);

        logger.info(
          `Found video: ${videoId}, Title: "${
            item.snippet.title
          }", Published: ${publishDate.toISOString()}`
        );

        // Check if we've already processed this video
        const existingSummary = await this.firebaseService.getSummaryByVideoId(
          videoId
        );
        if (existingSummary) {
          logger.info(`Video ${videoId} already processed, skipping`);
          continue;
        }

        logger.info(
          `Processing new video: ${videoId} from ${channel.displayName}`
        );

        try {
          // Get transcript
          const transcript = await this.youtubeService.getTranscript(videoId);

          // Generate summary
          const result = await this.openaiService.generateSummary(transcript);
          const summaryData = {
            ...result.summary,
            channelId: channel.id,
            channelName: channel.displayName,
            videoTitle: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnailUrl:
              item.snippet.thumbnails?.maxres?.url ||
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url ||
              item.snippet.thumbnails?.default?.url,
          };

          // Save to Firebase
          const summaryId = await this.firebaseService.saveSummary(
            videoId,
            summaryData
          );

          // Send email notification
          if (process.env.NOTIFICATION_EMAIL) {
            await this.loopsService.sendEmail(
              summaryData,
              videoId,
              process.env.NOTIFICATION_EMAIL
            );
            logger.info(
              `Notification sent to ${process.env.NOTIFICATION_EMAIL}`
            );
          }

          logger.info(`Successfully processed video ${videoId}`);
          processedVideos.push({
            videoId,
            summaryId,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
          });
        } catch (error) {
          logger.error(`Error processing video ${videoId}:`, error);
        }
      }

      // Update last checked timestamp
      channel.lastChecked = new Date();
      await this.firebaseService.updateChannel(channel);

      return {
        channelId: channel.id,
        channelName: channel.displayName,
        videosChecked: response.data.items?.length || 0,
        videosProcessed: processedVideos,
        lastChecked: channel.lastChecked,
      };
    } catch (error) {
      logger.error('Error checking channel:', error);
      throw error;
    }
  }

  // Start monitoring with a specified interval (in minutes)
  startMonitoring(intervalMinutes = 360) {
    this.initialize()
      .then(async () => {
        // Run immediate first check
        for (const channel of this.channels) {
          await this.checkNewVideosForChannel(channel.id).catch((error) =>
            logger.error(
              `Error in initial check for channel ${channel.id}:`,
              error
            )
          );
        }

        // Start interval for subsequent checks
        setInterval(() => {
          for (const channel of this.channels) {
            this.checkNewVideosForChannel(channel.id).catch((error) =>
              logger.error(
                `Error in periodic check for channel ${channel.id}:`,
                error
              )
            );
          }
        }, intervalMinutes * 60 * 1000);

        logger.info(
          `YouTube monitor started, checking every ${intervalMinutes} minute(s)`
        );
      })
      .catch((error) => {
        logger.error('Failed to start YouTube monitor:', error);
      });
  }
}

export default YoutubeMonitorService;
