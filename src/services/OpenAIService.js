import OpenAI from 'openai';
import logger from '../config/logger.js';

class OpenAIService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }
  title;
  overview;
  marketUpdate;
  technicalCorner;
  projectSpotlight;
  keyTakeaway;
  disclaimer;
  mentionedTokens;

  async generateSummary(transcript) {
    try {
      const fullText = transcript.map((entry) => entry.text).join(' ');

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a seasoned cryptocurrency expert analyst providing a concise, yet comprehensive video analysis. Break down the video content and provide a structured analysis in JSON format with the following sections:

{
  "title": "🎯 <strong>Create a compelling and descriptive title with relevant emojis</strong>",
  "overview": "📝 <strong>Overview:</strong> Provide a concise 2-3 sentence summary capturing the main points, arguments, and any significant predictions",
  "marketUpdate": "📊 <strong>Market Update:</strong> Offer relevant data on price action, sentiment, or noteworthy market shifts in up to 4 sentences",
  "technicalCorner": "📈 <strong>Technical Corner:</strong> Summarize chart patterns, indicators, or signals in up to 4 sentences",
  "projectSpotlight": "💡 <strong>Project Spotlight:</strong> Provide an overview of newly introduced or spotlighted projects in up to 4 sentences",
  "keyTakeaway": "🎯 <strong>Key Takeaway:</strong> Distill the main insight, key takeaways, or actionable advice in up to 4 sentences",
  "disclaimer": "⚠️ <strong>Disclaimer:</strong> This analysis is for informational purposes only and should not be considered financial advice. Always do your own research.",
  "mentionedTokens": "💎 <strong>Mentioned Tokens:</strong> Present each mentioned token as bullet points:\\n• BTC (🟢 Bullish): Short reason\\n• ETH (🔴 Bearish): Short reason\\nProvide a brief, one-sentence explanation for each sentiment. Each token should be on a new line."
}

IMPORTANT: 
1. Each section response MUST start with its corresponding emoji
2. Provide your response as a raw JSON object without any markdown formatting or code blocks
3. Do not mention the process of summarizing or referencing missing information
4. Add subheadings in bold to make it more readable
`,
          },
          {
            role: 'user',
            content: `Analyze this cryptocurrency video transcript and provide a structured summary in JSON format:\n\n${fullText}`,
          },
        ],
        max_tokens: 3000,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      let formattedSummary;
      try {
        const content = completion.choices[0].message.content;
        logger.info('OpenAI response content:', content);

        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        formattedSummary = JSON.parse(cleanContent);
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
        'technicalCorner',
        'projectSpotlight',
        'keyTakeaway',
        'disclaimer',
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
