import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { scheduleManager } from "../lib/schedule-manager";

export const createScheduleTool = createTool({
  id: "create-schedule",
  description: `Create a scheduled workflow to automatically analyze logs from an endpoint at specified intervals using Mastra's native scheduling system.
  
The schedule will run continuously until the user cancels it.

Use this when user says:
- "Monitor logs every X minutes/hours/days"
- "Set up automatic log analysis"
- "Schedule log monitoring"
- "Check logs periodically"

Examples:
- "Monitor https://api.example.com/logs every 30 minutes"
- "Check logs every hour"
- "Analyze logs daily at 9am"`,

  inputSchema: z.object({
    endpoint: z
      .string()
      .url()
      .describe("The API endpoint URL to fetch logs from. REQUIRED."),
    interval: z
      .string()
      .describe(
        'Natural language interval description. Examples: "every 5 minutes", "every hour", "daily at 9am", "every monday", "twice daily", "hourly", "daily"'
      ),
    authToken: z
      .string()
      .optional()
      .describe("Optional authentication token for the API endpoint"),
    timeRange: z
      .string()
      .optional()
      .describe(
        'Optional time range for log analysis. Defaults to "last 1 hour". Examples: "last 30 minutes", "last 2 hours"'
      ),
  }),

  execute: async ({ context, mastra }) => {
    try {
      const agent = mastra?.getAgent("logAnalyserAgent");

      if (!agent) {
        throw new Error("Log analyser agent not found in Mastra instance");
      }

      const result = await scheduleManager.createSchedule(
        context.endpoint,
        context.interval,
        agent,
        {
          authToken: context.authToken,
          timeRange: context.timeRange,
        }
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create schedule",
      };
    }
  },
});

export const cancelScheduleTool = createTool({
  id: "cancel-schedule",
  description: `Cancel a scheduled workflow by its ID or endpoint.

Use this when user says:
- "Cancel schedule [ID]"
- "Stop monitoring [endpoint]"
- "Cancel the log monitoring"
- "Stop all schedules"
- "Remove the scheduled task"`,

  inputSchema: z.object({
    scheduleId: z
      .string()
      .optional()
      .describe(
        "Specific schedule ID to cancel. Get this from list-schedules."
      ),
    endpoint: z
      .string()
      .optional()
      .describe("Cancel all schedules for this endpoint"),
    cancelAll: z
      .boolean()
      .optional()
      .describe("Set to true to cancel ALL schedules"),
  }),

  execute: async ({ context }) => {
    try {
      // Cancel all schedules
      if (context.cancelAll) {
        return await scheduleManager.cancelAllSchedules();
      }

      // Cancel by schedule ID
      if (context.scheduleId) {
        return await scheduleManager.cancelSchedule(context.scheduleId);
      }

      // Cancel by endpoint
      if (context.endpoint) {
        return await scheduleManager.cancelSchedulesByEndpoint(
          context.endpoint
        );
      }

      return {
        success: false,
        message:
          "Please provide either scheduleId, endpoint, or set cancelAll to true",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to cancel schedule",
      };
    }
  },
});

export const listSchedulesTool = createTool({
  id: "list-schedules",
  description: `List all active scheduled workflows with their details.

Use this when user asks:
- "What schedules are running?"
- "Show me active monitoring tasks"
- "List all scheduled workflows"
- "What endpoints are being monitored?"`,

  inputSchema: z.object({}),

  execute: async () => {
    const schedules = scheduleManager.listSchedules();

    if (schedules.length === 0) {
      return {
        success: true,
        message: "No active schedules",
        schedules: [],
      };
    }

    return {
      success: true,
      message: `Found ${schedules.length} active schedule(s)`,
      schedules,
    };
  },
});
