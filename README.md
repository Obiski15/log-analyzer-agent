# Log Analyzer Agent 🔍

An intelligent AI-powered log analysis system built with [Mastra](https://mastra.ai) that automatically analyzes server logs, detects issues, and provides actionable recommendations.

## Features ✨

- 🤖 **AI-Powered Analysis**: Uses Google Gemini 2.0 Flash for intelligent log analysis
- 📊 **Comprehensive Detection**: Identifies errors, warnings, performance issues, and security threats
- 🔄 **Workflow Orchestration**: Built-in Mastra workflow for automated log processing
- ⏰ **Flexible Scheduling**: Support for scheduled monitoring via deployment platform integration
- 🎯 **Natural Language Time Parsing**: Analyze logs using human-friendly time ranges ("last 2 hours", "yesterday", etc.)
- 💬 **Conversational Interface**: Chat with the agent to analyze logs and manage schedules
- 📈 **Severity Classification**: Automatically categorizes system health as Healthy, Warning, or Critical
- 🚨 **Smart Recommendations**: Provides specific, actionable suggestions based on log patterns

## How It Works 🛠️

### 1. One-Time Log Analysis

The agent can analyze logs from any API endpoint on-demand:

```
User: "Analyze logs from http://localhost:3000/api/logs for the last 2 hours"

Agent:
  ↓ Fetches logs from endpoint
  ↓ AI analyzes patterns, errors, warnings
  ↓ Classifies severity (Healthy/Warning/Critical)
  ↓ Returns summary + recommendations
```

**Example Output:**

```json
{
  "status": "Warning",
  "summary": "System shows moderate issues with 3 errors and 5 warnings detected. Performance degradation observed in API endpoints.",
  "recommendations": [
    "Investigate repeated 404 errors on /api/users endpoint",
    "Review memory usage trends - potential leak detected",
    "Consider implementing rate limiting on high-traffic routes"
  ]
}
```

### 2. Scheduled Monitoring

Set up continuous monitoring that runs at specified intervals:

```
User: "Monitor http://localhost:3000/api/logs every 30 minutes"

Agent:
  ↓ Converts "every 30 minutes" → "*/30 * * * *" (cron expression)
  ↓ Creates schedule configuration
  ↓ Provides setup instructions for deployment platform
  ↓ Returns Schedule ID for management
```

## Architecture 🏗️

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│              (Chat / API / Mastra Playground)                │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  Log Analyser Agent                          │
│  • Understands natural language requests                     │
│  • Routes to appropriate tool                                │
│  • Manages conversation context                              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
         ┌───────────────┴───────────────┐
         ↓                               ↓
┌─────────────────────┐       ┌──────────────────────┐
│  Log Analyser Tool  │       │  Schedule Tools      │
│  • Fetch logs       │       │  • Create schedule   │
│  • Parse time range │       │  • List schedules    │
│  • AI analysis      │       │  • Cancel schedule   │
│  • Generate report  │       └──────────────────────┘
└─────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│              Log Monitoring Workflow                         │
│                                                               │
│  Step 1: Analyze Logs  →  Step 2: Handle Results            │
│  • Execute analysis      • Log to console                    │
│  • Return status         • Alert on Critical                 │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started 🚀

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Google AI API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Obiski15/log-analyzer-agent.git
   cd log-analyzer-agent
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Add your API keys to `.env`:

   ```env
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key_here
   ```

4. **Start the development servers**

   Terminal 1 - Start your log API server:

   ```bash
   pnpm start-api
   ```

   Terminal 2 - Start Mastra dev server:

   ```bash
   pnpm dev
   ```

5. **Open Mastra Playground**

   Navigate to `http://localhost:4111` in your browser

## Usage Examples 💡

### Analyzing Logs

**Simple Analysis:**

```
"Analyze logs from http://localhost:3000/api/logs"
```

**With Time Range:**

```
"Analyze logs from http://localhost:3000/api/logs for the last 2 hours"
"Show me yesterday's logs"
"Check logs from November 1st to November 5th"
```

**With Authentication:**

```
"Analyze logs from https://api.example.com/logs with token abc123"
```

### Managing Schedules

**Create Schedule:**

```
"Monitor http://localhost:3000/api/logs every 30 minutes"
"Check logs daily at 9am"
"Set up hourly monitoring"
```

**List Schedules:**

```
"What schedules are running?"
"Show me active monitoring tasks"
```

**Cancel Schedule:**

```
"Cancel schedule schedule-1-123456"
"Stop monitoring http://localhost:3000/api/logs"
"Cancel all schedules"
```

## API Integration 🔌

### Log Endpoint Requirements

Your log API should return an array of log objects:

```json
[
  {
    "timestamp": "2025-11-03T10:30:00.000Z",
    "level": "ERROR",
    "message": "Database connection failed",
    "metadata": {
      "service": "api-server",
      "userId": "user-123"
    }
  },
  {
    "timestamp": "2025-11-03T10:31:00.000Z",
    "level": "INFO",
    "message": "User logged in successfully"
  }
]
```

### Supported Log Formats

The agent can analyze various log formats:

- **Structured JSON logs** (recommended)
- **Web server access logs** (Apache, Nginx)
- **Application logs** with timestamps
- **System logs** with severity levels

## Scheduling in Production 📅

The schedule manager tracks configurations but doesn't execute cron jobs locally.

## Project Structure 📁

```
src/
├── mastra/
│   ├── agents/
│   │   └── log-analyser-agent.ts      # Main AI agent
│   ├── workflows/
│   │   └── log-monitoring-workflow.ts # Workflow orchestration
│   ├── tools/
│   │   ├── log-analyser-tool.ts       # Log analysis logic
│   │   └── cron-tools.ts              # Schedule management tools
│   ├── lib/
│   │   └── schedule-manager.ts        # Schedule configuration manager
│   └── index.ts                       # Mastra instance configuration
├── api/
│   ├── app.js                         # Express server for log API
│   ├── logs/
│   │   └── sample-logs.json          # Sample log data
│   └── lib/
│       └── logger.js                  # Logging utility
```

## Configuration ⚙️

### Agent Configuration

Located in `src/mastra/agents/log-analyser-agent.ts`:

- **Model**: Google Gemini 2.0 Flash (configurable)
- **Memory**: LibSQL with semantic recall
- **Tools**: Log analysis, schedule management

### Workflow Configuration

Located in `src/mastra/workflows/log-monitoring-workflow.ts`:

- **Steps**: 2-step workflow (analyze → handle results)
- **Input**: Endpoint, optional auth token, optional time range
- **Output**: Status, summary, recommendations, logged confirmation

## Advanced Features 🚀

### Time Range Parsing

The agent uses AI to parse natural language time ranges:

- **Relative**: "last 2 hours", "past 30 minutes", "yesterday"
- **Specific**: "November 1, 2025", "today from 9am to 5pm"
- **Ranges**: "from Nov 1 to Nov 5", "Q1 2024"
- **Complex**: "since January", "last year only"

### Severity Classification

**Healthy**: No critical issues detected

- Minor warnings acceptable
- System operating normally

**Warning**: Moderate issues detected

- Some errors or performance degradation
- Requires attention but not critical

**Critical**: Severe issues detected

- System failures or security threats
- Immediate action required

### Smart Recommendations

The AI provides context-aware recommendations:

- Specific to detected issues
- Actionable and implementable
- Prioritized by severity
- Include relevant log patterns

## Development 🔧

### Running Tests

```bash
pnpm test
```

### Building for Production

```bash
pnpm build
```

### Linting

```bash
pnpm lint
```

## Tech Stack 💻

- **[Mastra](https://mastra.ai)** - AI agent framework
- **[Google Gemini](https://ai.google.dev/)** - Large language model
- **[Zod](https://zod.dev/)** - Schema validation
- **Express** - API server
- **LibSQL** - Embedded database
- **TypeScript** - Type-safe development
