## Agentic Voice Studio

Adaptive Gemini Live assistant crafted for mobile-first web deployment. Compose new agentic modes, register MCP/API connectors, and speak with Gemini using live voice capture.

### Features
- Voice console with MediaRecorder capture and optional synthetic playback
- Strategic, creative, engineering, and mentoring starter modes with gradient UI
- Agentic designer that drafts new modes (persists via `localStorage`)
- Connector registry to attach MCP servers / HTTP APIs per mode
- Gemini-backed conversation stack that adapts to mode persona + connectors

### Setup
Create a Google AI Studio API key and add it to `.env.local`:
```bash
GEMINI_API_KEY=your_key_here
```
Restart the dev server after changing environment variables.

### Development
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Lint & Build
```bash
npm run lint
npm run build
```

### Deploy
```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-d8c65ef3
curl https://agentic-d8c65ef3.vercel.app
```
