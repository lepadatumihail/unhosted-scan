# YouTube Transcript Analyzer

An Express server that fetches YouTube video transcripts and generates AI-powered crypto analysis using OpenAI GPT-4.

## Features

- Fetch transcripts from YouTube videos
- Generate AI analysis using GPT-4
- Send formatted email summaries via Loops
- Easy deployment to Railway

## Prerequisites

- Node.js >= 18.0.0
- OpenAI API Key
- Loops API Key

## Environment Variables

```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key
LOOPS_API_KEY=your_loops_api_key
```

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/youtube-transcript-server.git
cd youtube-transcript-server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your API keys

4. Start the development server:
```bash
npm run dev
```

## Deployment to Railway

1. Create a new project on [Railway](https://railway.app)

2. Connect your GitHub repository

3. Add environment variables in Railway:
   - `OPENAI_API_KEY`
   - `LOOPS_API_KEY`

4. Deploy! Railway will automatically:
   - Install dependencies
   - Build the project
   - Start the server

## API Usage

### Get Video Analysis

```bash
curl "https://your-railway-url/transcript/VIDEO_ID?summary=true&sendEmail=true"
```

Parameters:
- `VIDEO_ID`: YouTube video ID
- `summary`: Set to "true" to generate AI analysis
- `sendEmail`: Set to "true" to send email via Loops

## Email Template Setup

1. Create a "crypto_analysis" event in Loops
2. Use these variables in your template:
   - `{{title}}`
   - `{{overview}}`
   - `{{hotTokens}}`
   - `{{marketPulse}}`
   - `{{technicalCorner}}`
   - `{{keyInsights}}`
   - `{{projectSpotlight}}`
   - `{{conclusion}}`
   - `{{videoId}}`
   - `{{timestamp}}`

## License

MIT 