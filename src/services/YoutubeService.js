import fetch from 'node-fetch';
import xml2js from 'xml2js';
import logger from '../config/logger.js';

class YoutubeService {
  async getTranscript(videoId) {
    try {
      // Validate video ID format
      if (!this.isValidVideoId(videoId)) {
        throw new Error('Invalid YouTube video ID format');
      }

      const transcript = await this.fetchCaptions(videoId);
      return transcript;
    } catch (error) {
      logger.error('Error fetching transcript:', error);
      throw error;
    }
  }

  async fetchCaptions(videoId) {
    try {
      // First try to get the caption tracks
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const html = await response.text();
      
      // Extract caption track URL from the video page
      const captionTrackPattern = /"captionTracks":\[.*?"baseUrl":"([^"]+)"/;
      const match = html.match(captionTrackPattern);
      
      if (!match) {
        throw new Error('No captions available for this video');
      }

      // Get the first caption track URL (usually English)
      const captionUrl = match[1].replace(/\\u0026/g, '&');
      
      // Fetch the actual captions
      const captionsResponse = await fetch(captionUrl);
      const captionsXML = await captionsResponse.text();
      
      // Parse XML to JSON
      const transcript = await this.parseXMLCaptions(captionsXML);
      return transcript;
    } catch (error) {
      logger.error('Error fetching captions:', error);
      throw error;
    }
  }

  async parseXMLCaptions(xml) {
    try {
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false
      });
      
      const result = await parser.parseStringPromise(xml);
      
      // Extract and format captions
      return result.transcript.text.map(entry => ({
        text: entry._,
        start: Number.parseFloat(entry.$.start),
        duration: Number.parseFloat(entry.$.dur)
      }));
    } catch (error) {
      logger.error('Error parsing XML:', error);
      throw new Error('Failed to parse captions');
    }
  }

  isValidVideoId(videoId) {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }
}

export default YoutubeService; 