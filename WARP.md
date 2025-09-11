# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a product label structured information extraction tool that compares Gemini 2.5 Pro and Baidu OCR models for extracting product names and prices from images and videos. The application uses Next.js 15 with TypeScript and is designed for Vercel deployment.

## Core Architecture

### Frontend Structure
- **Main UI** (`web/app/page.tsx`): Single-page application with upload area and model comparison cards
- **Components**: 
  - `UploadArea`: Handles file uploads (images/videos) and triggers API calls
  - `ModelCard`: Displays individual model results with structured data and raw text
- **UI Library**: Shadcn/UI components with Radix primitives and Tailwind CSS

### Backend Architecture
- **API Endpoint**: `/api/process` - Main processing route for all model calls
- **Parallel Processing**: All models are called simultaneously using `Promise.allSettled`
- **Model Integrations**:
  - **LLM Models**: Gemini 2.5 Pro (structured JSON extraction)
  - **OCR Models**: Baidu OCR (raw text extraction)
- **Video Processing**: Uses FFmpeg.wasm for frame extraction (1 fps default, max 10 frames)

### Key Libraries
- `@google/genai`: Google Gemini API integration
- `@ffmpeg/ffmpeg`: Client-side video frame extraction
- `zod`: Schema validation for extracted product data

## Common Development Commands

```bash
# Navigate to web directory first
cd web

# Development
npm run dev --turbopack        # Start development server with Turbopack
npm run build --turbopack      # Build for production with Turbopack  
npm start                      # Start production server

# Linting
npm run lint                   # Run ESLint

# Environment setup
# Set up environment variables in Vercel dashboard or .env.local:
# - GOOGLE_API_KEY (for Gemini models)
# - BAIDU_OCR_API_KEY, BAIDU_OCR_SECRET_KEY (for Baidu OCR)
```

## Environment Configuration

### Required Environment Variables
```bash
# Google Gemini API
GOOGLE_API_KEY=your_google_api_key

# Baidu OCR API
BAIDU_OCR_API_KEY=your_baidu_api_key
BAIDU_OCR_SECRET_KEY=your_baidu_secret_key

# Optional video processing settings
EXTRACT_FPS=1                  # Frames per second extraction rate
EXTRACT_MAX_FRAMES=10          # Maximum frames to extract
FRAME_CONCURRENCY=3            # Frame processing concurrency
```

## Data Flow & Processing

### Image Processing Flow
1. File upload → `/api/process` endpoint
2. Parallel API calls to Gemini 2.5 Pro and Baidu OCR using `Promise.allSettled`
3. Gemini model uses structured prompts to extract JSON: `[{"product_name": "...", "price": "..."}]`
4. Results aggregated and deduplicated by `name+price` combination
5. Frontend displays structured results in model comparison cards

### Video Processing Flow  
1. Video upload → FFmpeg.wasm extracts frames (1 fps, max 10 frames)
2. Each frame processed in batches of 3 concurrent frames
3. Per-frame results from all models are aggregated across frames
4. Final deduplication produces unified product list from entire video

### Model Integration Patterns
- **Gemini 2.5 Pro**: Use Google GenerativeAI SDK with inline data format
- **Baidu OCR**: OAuth token-based authentication with form-encoded requests

## Product Data Schema

```typescript
type ProductItem = {
  product_name: string;
  price: string;
  source?: string;
  bbox?: number[]; // [x1,y1,x2,y2] optional
};
```

## Deployment Notes

- **Platform**: Vercel with Next.js serverless functions
- **Runtime**: Node.js (specified in API route)
- **Region**: Configurable via `preferredRegion` (default: iad1)
- **Root Configuration**: `vercel.json` routes all requests to `web/` subdirectory
- **No Database**: Stateless processing, no persistent storage required

## Testing & Development

### Local Development
1. Ensure all environment variables are set in `.env.local`
2. Use supported file formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.mp4`, `.mov`, `.webm`
3. Test both image and video uploads to verify frame extraction

### Model Response Validation
- All LLM responses are validated using Zod schema
- Failed JSON parsing fallbacks to empty array
- Individual model failures don't affect other models due to `Promise.allSettled`

## File Structure Context

```
web/
├── app/
│   ├── api/process/route.ts    # Main processing API
│   ├── page.tsx               # Main UI page
│   └── layout.tsx            # App layout
├── components/
│   ├── UploadArea.tsx        # File upload component
│   ├── ModelCard.tsx         # Model result display
│   └── ui/                   # Shadcn/UI components
├── lib/
│   ├── models/               # Model integration files
│   ├── extract.ts           # JSON parsing & deduplication
│   ├── video.ts             # FFmpeg video processing
│   └── types.ts             # TypeScript definitions
└── package.json             # Dependencies & scripts
```
