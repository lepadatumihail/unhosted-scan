import OpenAI from 'openai';
import logger from '../config/logger.js';

class OpenAIService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async generateSummary(transcript) {
    try {
      const fullText = transcript.map((entry) => entry.text).join(' ');

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a seasoned cryptocurrency expert analyst providing comprehensive video analysis. Break down the video content and provide a detailed, structured analysis in JSON format with the following sections:

{
  "title": "Create a compelling and descriptive title with relevant emojis that accurately captures the video's main topic and key themes discussed",
  "overview": "📝 Provide a comprehensive 2-3 sentence overview of the video's content, highlighting the main discussion points, key arguments presented, and any significant market predictions or analyses covered\\n",
  "marketUpdate": "📊 Deliver a thorough analysis of the current market conditions discussed, including specific price movements, overall market sentiment, trading volume trends, and any correlations with macro events or other market factors. Include relevant statistics and data points mentioned\\n",
  "featuredTokens": "🔥 Provide a detailed breakdown of each cryptocurrency discussed, including current price action, market cap, recent developments, potential catalysts, and the speaker's sentiment or predictions for each token. Include any specific price targets or technical levels mentioned\\n",
  "technicalCorner": "📈 Break down the technical analysis presented in the video, including specific chart patterns, key support/resistance levels, trading indicators discussed, and any notable trend formations or potential breakout/breakdown points identified\\n",
  "projectSpotlight": "💡 Provide an in-depth analysis of featured blockchain projects, including their technology stack, recent developments, partnerships, upcoming milestones, potential impact on the market, and any concerns or challenges discussed\\n",
  "keyTakeaway": "🎯 Distill the most crucial insight, prediction, or strategic recommendation from the video, explaining why this particular point stands out and its potential impact on the market or investors\\n",
  "disclaimer": "⚠️ This analysis is for informational purposes only and should not be considered as financial advice. Always conduct your own research and consult with financial professionals before making investment decisions."
}

IMPORTANT: Your response must be a valid JSON object containing exactly these keys. Each value should be a detailed string incorporating relevant emojis and clear, actionable explanations. Focus on accuracy and comprehensiveness while maintaining clarity.`,
          },
          {
            role: 'user',
            content: `Analyze this cryptocurrency video transcript and provide a detailed breakdown in JSON format:\n\n${fullText}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
        // response_format: { type: "json_object" }
      });

      let formattedSummary;
      try {
        const content = completion.choices[0].message.content;
        logger.info('OpenAI response content:', content);
        formattedSummary = JSON.parse(content);
      } catch (parseError) {
        logger.error('Error parsing OpenAI response:', {
          error: parseError,
          content: completion.choices[0].message.content,
        });
        throw new Error('Failed to parse OpenAI response as JSON');
      }

      // Validate the response format
      const requiredKeys = [
        'title',
        'overview',
        'marketUpdate',
        'featuredTokens',
        'technicalCorner',
        'projectSpotlight',
        'keyTakeaway',
        'disclaimer'
      ];

      const missingKeys = requiredKeys.filter(
        (key) => !(key in formattedSummary)
      );

      if (missingKeys.length > 0) {
        throw new Error(
          `Invalid response format. Missing keys: ${missingKeys.join(', ')}`
        );
      }

      return {
        summary: formattedSummary,
        apiResponse: {
          id: completion.id,
          object: completion.object,
          created: completion.created,
          model: completion.model,
          choices: completion.choices,
          usage: completion.usage,
          system_fingerprint: completion.system_fingerprint,
        },
      };
    } catch (error) {
      logger.error('Error generating summary:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }
}

export default OpenAIService;
