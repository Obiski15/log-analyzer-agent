import type { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Use AI to parse natural language time range into from/to ISO strings
 */
async function parseTimeRangeWithAI(
  agent: Agent,
  timeRangeStr?: string
): Promise<{
  from: string | null;
  to: string | null;
}> {
  if (!timeRangeStr) {
    return { from: null, to: null };
  }

  const now = new Date();
  const currentDateTime = now.toISOString();

  const prompt = `
You are an intelligent time range parser. Convert ANY natural language time description into ISO 8601 timestamp strings.

## CRITICAL REQUIREMENTS
- Return ONLY valid JSON
- NO markdown formatting  
- NO code blocks
- NO additional text or explanations
- Handle ANY date format or description

## CURRENT DATE AND TIME
${currentDateTime}
Current Year: ${now.getFullYear()}

## USER'S TIME RANGE REQUEST
"${timeRangeStr}"

## INSTRUCTIONS
1. Parse the natural language time range in ANY format
2. Calculate the "from" timestamp (start of the period)
3. Calculate the "to" timestamp (end of the period)
4. Return ISO 8601 formatted strings (YYYY-MM-DDTHH:mm:ss.sssZ)
5. Be flexible - handle relative dates, specific dates, date ranges, years, months, etc.

## COMPREHENSIVE EXAMPLES

### Time-based (Hours, Minutes, Seconds)
Input: "last 2 hours"
Output: {"from": "2025-11-03T08:30:00.000Z", "to": "2025-11-03T10:30:00.000Z"}

Input: "past 30 minutes"
Output: {"from": "2025-11-03T10:00:00.000Z", "to": "2025-11-03T10:30:00.000Z"}

Input: "last 90 seconds"
Output: {"from": "2025-11-03T10:28:30.000Z", "to": "2025-11-03T10:30:00.000Z"}

Input: "last hour"
Output: {"from": "2025-11-03T09:30:00.000Z", "to": "2025-11-03T10:30:00.000Z"}

Input: "past 15 minutes"
Output: {"from": "2025-11-03T10:15:00.000Z", "to": "2025-11-03T10:30:00.000Z"}

Input: "last 5 hours and 30 minutes"
Output: {"from": "2025-11-03T05:00:00.000Z", "to": "2025-11-03T10:30:00.000Z"}

### Specific Time of Day
Input: "today from 9am to 5pm"
Output: {"from": "2025-11-03T09:00:00.000Z", "to": "2025-11-03T17:00:00.000Z"}

Input: "yesterday at 3pm"
Output: {"from": "2025-11-02T15:00:00.000Z", "to": "2025-11-02T15:00:00.000Z"}

Input: "November 1, 2025 at 14:30"
Output: {"from": "2025-11-01T14:30:00.000Z", "to": "2025-11-01T14:30:00.000Z"}

Input: "from 8am today to now"
Output: {"from": "2025-11-03T08:00:00.000Z", "to": "2025-11-03T10:30:00.000Z"}

### Relative to Current Date
Input: "last 5 days"
Output: {"from": "2025-10-29T00:00:00.000Z", "to": "2025-11-03T23:59:59.999Z"}

Input: "past 24 hours"
Output: {"from": "2025-11-02T10:30:00.000Z", "to": "2025-11-03T10:30:00.000Z"}

Input: "last week"
Output: {"from": "2025-10-27T00:00:00.000Z", "to": "2025-11-02T23:59:59.999Z"}

Input: "yesterday"
Output: {"from": "2025-11-02T00:00:00.000Z", "to": "2025-11-02T23:59:59.999Z"}

Input: "today"
Output: {"from": "2025-11-03T00:00:00.000Z", "to": "2025-11-03T23:59:59.999Z"}

### Specific Years
Input: "last year"
Output: {"from": "2024-01-01T00:00:00.000Z", "to": "2024-12-31T23:59:59.999Z"}

Input: "last year only do not include this year"
Output: {"from": "2024-01-01T00:00:00.000Z", "to": "2024-12-31T23:59:59.999Z"}

Input: "2024"
Output: {"from": "2024-01-01T00:00:00.000Z", "to": "2024-12-31T23:59:59.999Z"}

Input: "this year"
Output: {"from": "2025-01-01T00:00:00.000Z", "to": "2025-11-03T23:59:59.999Z"}

### Specific Months
Input: "October 2025"
Output: {"from": "2025-10-01T00:00:00.000Z", "to": "2025-10-31T23:59:59.999Z"}

Input: "last month"
Output: {"from": "2025-10-01T00:00:00.000Z", "to": "2025-10-31T23:59:59.999Z"}

Input: "January to March 2024"
Output: {"from": "2024-01-01T00:00:00.000Z", "to": "2024-03-31T23:59:59.999Z"}

### Specific Dates
Input: "November 1, 2025"
Output: {"from": "2025-11-01T00:00:00.000Z", "to": "2025-11-01T23:59:59.999Z"}

Input: "2025-11-01"
Output: {"from": "2025-11-01T00:00:00.000Z", "to": "2025-11-01T23:59:59.999Z"}

Input: "01/11/2025"
Output: {"from": "2025-11-01T00:00:00.000Z", "to": "2025-11-01T23:59:59.999Z"}

### Date Ranges
Input: "from November 1 to November 5, 2025"
Output: {"from": "2025-11-01T00:00:00.000Z", "to": "2025-11-05T23:59:59.999Z"}

Input: "between January 1 and December 31, 2024"
Output: {"from": "2024-01-01T00:00:00.000Z", "to": "2024-12-31T23:59:59.999Z"}

Input: "Q1 2024"
Output: {"from": "2024-01-01T00:00:00.000Z", "to": "2024-03-31T23:59:59.999Z"}

Input: "first half of 2024"
Output: {"from": "2024-01-01T00:00:00.000Z", "to": "2024-06-30T23:59:59.999Z"}

### Complex/Ambiguous Queries
Input: "past year but not this year"
Output: {"from": "2024-01-01T00:00:00.000Z", "to": "2024-12-31T23:59:59.999Z"}

Input: "last 30 days"
Output: {"from": "2025-10-04T00:00:00.000Z", "to": "2025-11-03T23:59:59.999Z"}

Input: "since January"
Output: {"from": "2025-01-01T00:00:00.000Z", "to": "2025-11-03T23:59:59.999Z"}

Input: "before 2025"
Output: {"from": "2000-01-01T00:00:00.000Z", "to": "2024-12-31T23:59:59.999Z"}

## PARSING GUIDELINES
1. **Time units**: Handle seconds, minutes, hours, days, weeks, months, years
2. **Specific times**: Parse "9am", "14:30", "3:45pm", "noon", "midnight"
3. **Specific years/months/dates**: Use exact boundaries
4. **Relative terms** ("last", "past", "ago"): Calculate from current date/time
5. **Exclusions** ("not this year", "only last year"): Interpret correctly
6. **Ranges** ("from X to Y", "between X and Y"): Use explicit boundaries
7. **Ambiguous terms**: Make reasonable assumptions based on context
8. **Time precision**: 
   - For second/minute/hour queries: Use precise timestamps down to the second
   - For day-level queries: Use 00:00:00.000Z to 23:59:59.999Z
   - For "now" or "current": Use current timestamp
   - For specific times: Use exact hour:minute:second
9. **Combinations**: Handle mixed units like "5 hours and 30 minutes", "2 days and 3 hours"
10. **Time zones**: Assume UTC unless specified otherwise

## OUTPUT FORMAT
Return ONLY this JSON structure:
{
  "from": "ISO 8601 timestamp string",
  "to": "ISO 8601 timestamp string"
}

Parse the time range now and return ONLY the JSON. Be smart and flexible - handle ANY format the user provides.
  `;

  const result = await agent.generate(prompt);

  // Parse and validate the response
  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = result.text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate the structure
    if (!parsed.from || !parsed.to) {
      throw new Error("Invalid time range format from AI");
    }

    // Validate ISO strings
    new Date(parsed.from);
    new Date(parsed.to);

    return {
      from: parsed.from,
      to: parsed.to,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse time range "${timeRangeStr}": ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export const logAnalyserTool = createTool({
  id: "log-analyser",
  description:
    "Analyze log files for errors, warnings, and performance issues. REQUIRED: endpoint URL. OPTIONAL: timeRange (accepts ANY date/time format: 'last 2 hours', 'past 30 minutes', 'last 5 days', 'last year', 'October 2024', 'today from 9am to 5pm', '2024-01-01 to 2024-12-31', 'Q1 2025', etc.), authToken (only provide if user specifies or if previous call failed with auth error).",
  inputSchema: z.object({
    endpoint: z
      .url()
      .describe(
        "REQUIRED: The API endpoint URL to fetch logs from. Always ask the user for this."
      ),
    timeRange: z
      .string()
      .optional()
      .describe(
        "OPTIONAL: ANY natural language time range description. Examples: 'last 2 hours', 'past 30 minutes', 'last 5 days', 'yesterday', 'last year', 'October 2024', 'Q1 2025', '2024-01-01 to 2024-12-31', 'past 24 hours', 'since January', 'today from 9am to 5pm', 'last year only do not include this year'. Pass exactly what the user says - the AI will parse it. If not provided, analyzes all available logs."
      ),
    authToken: z
      .string()
      .optional()
      .describe(
        "OPTIONAL: Authentication token for secure log access. Only ask for this if the user provides it or if a previous API call failed with 401/403 error."
      ),
  }),
  outputSchema: z.object({
    status: z.enum(["Healthy", "Warning", "Critical"]),
    summary: z
      .string()
      .min(10)
      .max(500)
      .describe("Summary of the log analysis results"),
    recommendations: z
      .array(z.string().min(5))
      .min(0)
      .max(10)
      .describe("List of recommendations based on log analysis"),
    timeRange: z.object({
      from: z
        .string()
        .nullable()
        .optional()
        .describe("Start of the analyzed time range"),
      to: z
        .string()
        .nullable()
        .optional()
        .describe("End of the analyzed time range"),
    }),
    analyzedAt: z
      .string()
      .describe("Timestamp when the analysis was performed"),
  }),
  execute: async ({
    context: { endpoint, authToken, timeRange: timeRangeStr },
    mastra,
  }) => {
    const agent = mastra?.getAgent("logAnalyserAgent");

    if (!agent) {
      throw new Error("Log analyser agent not found in Mastra instance");
    }

    // Use AI to parse natural language time range into ISO strings
    const timeRange = await parseTimeRangeWithAI(agent, timeRangeStr);

    // Fetch logs from the API endpoint
    const logsData = await getLogs({
      timeRange,
      url: endpoint,
      authToken,
    });

    const logs = JSON.stringify(logsData, null, 2);
    const logCount = Array.isArray(logsData) ? logsData.length : 0;

    // Create comprehensive analysis prompt
    const prompt = `
      You are an expert log analysis system. Your task is to analyze server logs and provide actionable insights.

      ## CRITICAL REQUIREMENTS
      - Return ONLY valid JSON
      - NO markdown formatting
      - NO code blocks (\`\`\`json)
      - NO additional text or explanations
      - Follow the exact output schema provided

      ## ANALYSIS CONTEXT
      Endpoint: ${endpoint}
      Time Range: ${
        timeRange.from
          ? `${timeRange.from} to ${timeRange.to}`
          : "All available logs"
      }
      Total Entries Retrieved: ${logCount}
      Analysis Timestamp: ${new Date().toISOString()}

      ## LOG DATA
      ${logs}

      ## ANALYSIS METHODOLOGY

      ### 1. ERROR DETECTION
      Identify and categorize errors by:
      - **Severity Levels**: ERROR, CRITICAL, FATAL
      - **Error Types**: 
        - Authentication failures (401, 403)
        - Server errors (500, 502, 503, 504)
        - Database errors (connection timeouts, query failures)
        - External service failures (API timeouts, connection refused)
        - Application crashes (unhandled exceptions, out of memory)
      - **Patterns**: Recurring errors, error cascades, error clusters by time/service
      - **Keywords**: "error", "exception", "fail", "fatal", "crash", "panic", "abort"

      ### 2. WARNING DETECTION
      Identify potential issues:
      - **Warning Levels**: WARNING, WARN
      - **Types**:
        - Performance degradation (slow queries, high response times)
        - Resource constraints (high memory/CPU/disk usage)
        - Rate limiting events
        - Deprecated API usage
        - SSL/TLS certificate expiration warnings
        - Unusual traffic patterns
      - **Keywords**: "warn", "warning", "caution", "deprecated", "slow", "high"

      ### 3. PERFORMANCE ANALYSIS
      Evaluate system performance:
      - **Response Times**: Identify requests >1000ms
      - **Database Queries**: Flag queries >1000ms
      - **Resource Usage**: Monitor memory >80%, CPU >80%, disk >90%
      - **Throughput**: Detect unusual request rate changes
      - **Latency Patterns**: Identify trends or spikes
      - **Keywords**: "timeout", "slow", "delay", "latency", "bottleneck"

      ### 4. AVAILABILITY & RELIABILITY
      Assess system stability:
      - **Downtime Events**: Server crashes, restarts, connection losses
      - **Service Disruptions**: Database disconnections, external API failures
      - **Recovery Actions**: Restart attempts, reconnection efforts
      - **Impact Duration**: Time between failure and recovery

      ### 5. SECURITY ANALYSIS
      Detect security concerns:
      - **Failed Authentication**: Repeated login failures from same IP
      - **Rate Limit Violations**: Excessive requests from single source
      - **Suspicious Patterns**: Unusual request patterns, scanning attempts
      - **Access Control**: 401, 403 responses

      ### 6. ANOMALY DETECTION
      Identify unusual patterns:
      - **Traffic Anomalies**: Sudden spikes or drops in request volume
      - **Error Clustering**: Multiple errors in short time window
      - **Service Degradation**: Progressive increase in response times
      - **Unusual Status Codes**: Unexpected HTTP status code distributions

      ## STATUS DETERMINATION RULES

      ### Healthy
      - 0 errors (ERROR/CRITICAL level)
      - 0-2 warnings
      - All services operational
      - Response times within normal range (<500ms average)
      - No recent crashes or restarts
      - Resource usage <70%

      ### Warning
      - 1-5 errors in the analyzed period
      - 3-10 warnings
      - Occasional slow responses (500-2000ms)
      - Resource usage 70-85%
      - Minor service disruptions with quick recovery
      - Rate limiting triggered but not excessive
      - Deprecated API usage detected

      ### Critical
      - 6+ errors in the analyzed period
      - Any CRITICAL level errors
      - Server crashes or emergency restarts
      - Service down or unavailable
      - Database connection failures
      - Memory exhaustion (OOM errors)
      - Resource usage >85%
      - Multiple cascading failures
      - Significant security concerns (attack patterns)

      ## RECOMMENDATIONS GUIDELINES

      Generate actionable recommendations based on findings:

      **For Errors:**
      - "Investigate recurring [error type] in [service/component]"
      - "Review and fix [specific issue] causing [impact]"
      - "Implement error handling for [scenario]"
      - "Add monitoring for [specific metric]"

      **For Performance:**
      - "Optimize slow queries averaging [time]ms in [service]"
      - "Increase timeout values for [service] (currently failing at [time]ms)"
      - "Scale [resource] to handle current load ([metric]%)"
      - "Implement caching for [endpoint] with [response time]ms"

      **For Security:**
      - "Investigate suspicious activity from IP [address]"
      - "Implement rate limiting for [endpoint]"
      - "Review failed login attempts from [source]"
      - "Enable additional authentication logging"

      **For Availability:**
      - "Investigate root cause of [crash/restart] at [timestamp]"
      - "Implement health checks for [service]"
      - "Add redundancy for [critical service]"
      - "Configure automatic failover for [component]"

      **Healthy Status:**
      - Return empty array [] if no issues found

      ## OUTPUT SCHEMA

      Return this EXACT JSON structure:

      {
        "status": "Healthy" | "Warning" | "Critical",
        "summary": "Concise description of overall system health and key findings (10-500 characters)",
        "recommendations": [
          "Specific, actionable recommendation with details",
          "Another actionable recommendation"
        ],
        "timeRange": {
          "from": ${timeRange.from ? `"${timeRange.from}"` : "null"},
          "to": ${timeRange.to ? `"${timeRange.to}"` : "null"}
        },
        "analyzedAt": "${new Date().toISOString()}"
      }

      ## VALIDATION RULES
      1. Status must be exactly one of: "Healthy", "Warning", "Critical"
      2. Summary must be 10-500 characters, descriptive not generic
      3. Recommendations array: 0-10 items, each 5+ characters
      4. Empty recommendations [] if status is Healthy
      5. timeRange.from and timeRange.to must be ISO strings or null
      6. analyzedAt must be valid ISO timestamp
      7. All fields are required in the output

      ## FINAL INSTRUCTIONS
      1. Analyze the provided log data thoroughly
      2. Apply all detection methodologies
      3. Determine the correct status based on severity rules
      4. Write a specific, data-driven summary
      5. Generate actionable recommendations (or empty array if healthy)
      6. Return ONLY the JSON object - no other text
      7. Ensure all fields match the schema exactly
      8. Use actual data from logs - no generic statements

      BEGIN ANALYSIS NOW.`;

    // Get analysis from agent
    const result = await agent.generate(prompt);

    // Parse and validate the response
    let analysis;
    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      analysis = JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(
        `Failed to parse agent response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Validate against output schema
    return analysis;
  },
});

const getLogs = async ({
  timeRange,
  url,
  authToken,
}: {
  timeRange: { from: string | null; to: string | null };
  url: string;
  authToken?: string;
}) => {
  const response = await fetch(
    `${url}?from=${timeRange.from}&to=${timeRange.to}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    }
  );

  if (!response.ok) {
    // Handle authentication/authorization errors specifically
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Authentication required: ${response.status} ${response.statusText}. Please provide a valid auth token.`
      );
    }

    throw new Error(
      `Failed to fetch logs: ${response.status} ${response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let logs = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    logs += decoder.decode(value, { stream: true });
  }

  logs += decoder.decode(); // Flush remaining bytes

  return JSON.parse(logs);
};
