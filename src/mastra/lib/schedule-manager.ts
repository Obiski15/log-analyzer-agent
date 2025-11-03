interface ScheduleConfig {
  id: string;
  endpoint: string;
  interval: string;
  cronExpression: string;
  authToken?: string;
  timeRange?: string;
  createdAt: string;
}

class ScheduleManager {
  private schedules: Map<string, ScheduleConfig> = new Map();
  private scheduleCounter = 0;

  /**
   * Parse natural language interval to cron expression using AI
   */
  async parseToCronExpression(interval: string, agent: any): Promise<string> {
    const prompt = `
You are a cron expression converter. Convert the user's interval description to a valid cron expression.
Return ONLY the cron expression, nothing else.

Current time: ${new Date().toISOString()}

Cron format: minute hour day month dayOfWeek
Examples:
- "every 5 minutes" → "*/5 * * * *"
- "every hour" or "hourly" → "0 * * * *"
- "every day" or "daily" → "0 0 * * *"
- "every day at 9am" or "daily at 9am" → "0 9 * * *"
- "every monday at 10am" → "0 10 * * 1"
- "every 30 minutes" → "*/30 * * * *"
- "twice daily" → "0 9,21 * * *"
- "every weekday at 8am" → "0 8 * * 1-5"
- "every 2 hours" → "0 */2 * * *"

User interval: "${interval}"

Return only the cron expression:`;

    const response = await agent.generate(prompt);
    return response.text.trim().replace(/[`'"]/g, "");
  }

  /**
   * Create a new scheduled workflow
   */
  async createSchedule(
    endpoint: string,
    interval: string,
    agent: any,
    options?: {
      authToken?: string;
      timeRange?: string;
    }
  ): Promise<{ id: string; cronExpression: string; message: string }> {
    try {
      // Parse interval to cron expression
      const cronExpression = await this.parseToCronExpression(interval, agent);

      // Generate unique schedule ID
      this.scheduleCounter++;
      const scheduleId = `schedule-${this.scheduleCounter}-${Date.now()}`;

      // Store schedule config
      const config: ScheduleConfig = {
        id: scheduleId,
        endpoint,
        interval,
        cronExpression,
        authToken: options?.authToken,
        timeRange: options?.timeRange || "last 1 hour",
        createdAt: new Date().toISOString(),
      };

      this.schedules.set(scheduleId, config);

      return {
        id: scheduleId,
        cronExpression,
        message: `Schedule created successfully! Schedule ID: ${scheduleId}. 

To activate this schedule, you need to set up a cron job or scheduled trigger on your deployment platform:

**Option 1: Vercel Cron (for Vercel deployments)**
Add to vercel.json:
{
  "crons": [{
    "path": "/api/workflows/log-monitoring-workflow",
    "schedule": "${cronExpression}"
  }]
}

**Option 2: AWS EventBridge (for AWS deployments)**
Create an EventBridge rule with schedule expression: cron(${cronExpression})

**Option 3: Inngest (recommended for complex workflows)**
See: https://mastra.ai/docs/workflows/inngest-workflow

The schedule will monitor ${endpoint} ${interval} (${cronExpression}).`,
      };
    } catch (error) {
      throw new Error(
        `Failed to create schedule: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Cancel a specific schedule
   */
  cancelSchedule(scheduleId: string): { success: boolean; message: string } {
    const config = this.schedules.get(scheduleId);

    if (!config) {
      return {
        success: false,
        message: `Schedule ${scheduleId} not found. Use listSchedules to see active schedules.`,
      };
    }

    this.schedules.delete(scheduleId);

    return {
      success: true,
      message: `Schedule ${scheduleId} removed successfully. It was monitoring ${config.endpoint} ${config.interval}. 
      
Note: This only removes the schedule from Mastra's tracking. You must also remove the corresponding cron job from your deployment platform (Vercel, AWS, etc.) to stop the actual execution.`,
    };
  }

  /**
   * Cancel all schedules for a specific endpoint
   */
  cancelSchedulesByEndpoint(endpoint: string): {
    success: boolean;
    message: string;
    cancelledCount: number;
  } {
    const schedulesToCancel = Array.from(this.schedules.values()).filter(
      (schedule) => schedule.endpoint === endpoint
    );

    if (schedulesToCancel.length === 0) {
      return {
        success: false,
        message: `No schedules found for endpoint: ${endpoint}`,
        cancelledCount: 0,
      };
    }

    schedulesToCancel.forEach((schedule) => {
      this.schedules.delete(schedule.id);
    });

    return {
      success: true,
      message: `Cancelled ${schedulesToCancel.length} schedule(s) for ${endpoint}. 

Note: This only removes the schedules from Mastra's tracking. You must also remove the corresponding cron jobs from your deployment platform to stop the actual execution.`,
      cancelledCount: schedulesToCancel.length,
    };
  }

  /**
   * Cancel all schedules
   */
  cancelAllSchedules(): {
    success: boolean;
    message: string;
    cancelledCount: number;
  } {
    const count = this.schedules.size;

    if (count === 0) {
      return {
        success: false,
        message: "No active schedules to cancel",
        cancelledCount: 0,
      };
    }

    this.schedules.clear();

    return {
      success: true,
      message: `All ${count} schedule(s) removed successfully. 

Note: This only removes the schedules from Mastra's tracking. You must also remove the corresponding cron jobs from your deployment platform to stop the actual execution.`,
      cancelledCount: count,
    };
  }

  /**
   * List all active schedules
   */
  listSchedules(): Array<{
    id: string;
    endpoint: string;
    interval: string;
    cronExpression: string;
    createdAt: string;
    timeRange?: string;
  }> {
    return Array.from(this.schedules.values()).map((schedule) => ({
      id: schedule.id,
      endpoint: schedule.endpoint,
      interval: schedule.interval,
      cronExpression: schedule.cronExpression,
      createdAt: schedule.createdAt,
      timeRange: schedule.timeRange,
    }));
  }

  /**
   * Get schedule details
   */
  getSchedule(scheduleId: string): ScheduleConfig | null {
    return this.schedules.get(scheduleId) || null;
  }
}

// Export singleton instance
export const scheduleManager = new ScheduleManager();
