import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { logAnalyserTool } from "../tools/log-analyser-tool";

const analyzeLogsStep = createStep({
  id: "analyze-logs",
  description: "Analyze logs from an API endpoint",
  inputSchema: z.object({
    endpoint: z
      .string()
      .url()
      .describe("The API endpoint URL to fetch logs from"),
    authToken: z.string().optional().describe("Optional authentication token"),
    timeRange: z
      .string()
      .optional()
      .describe('Time range for analysis. Defaults to "last 1 hour"'),
  }),
  outputSchema: z.object({
    status: z.enum(["Healthy", "Warning", "Critical"]),
    summary: z.string(),
    recommendations: z.array(z.string()),
    timeRange: z.object({
      from: z.string().nullable().optional(),
      to: z.string().nullable().optional(),
    }),
    analyzedAt: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const result = await logAnalyserTool.execute({
      context: {
        endpoint: inputData.endpoint,
        authToken: inputData.authToken,
        timeRange: inputData.timeRange || "last 1 hour",
      },
      mastra,
      runtimeContext: {} as any,
    });

    return result;
  },
});

const handleResultStep = createStep({
  id: "handle-result",
  description: "Handle and log the analysis results",
  inputSchema: z.object({
    status: z.enum(["Healthy", "Warning", "Critical"]),
    summary: z.string(),
    recommendations: z.array(z.string()),
    timeRange: z.object({
      from: z.string().nullable().optional(),
      to: z.string().nullable().optional(),
    }),
    analyzedAt: z.string(),
  }),
  outputSchema: z.object({
    status: z.enum(["Healthy", "Warning", "Critical"]),
    summary: z.string(),
    recommendations: z.array(z.string()),
    logged: z.boolean(),
  }),
  execute: async ({ inputData, getInitData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const initData = getInitData();

    // Log the analysis result
    console.log(`[${new Date().toISOString()}] Log Analysis Complete:`, {
      endpoint: initData.endpoint,
      status: inputData.status,
      summary: inputData.summary,
    });

    // Alert on critical issues
    if (inputData.status === "Critical") {
      console.error(`🚨 CRITICAL ALERT for ${initData.endpoint}:`, {
        summary: inputData.summary,
        recommendations: inputData.recommendations,
      });
    }

    return {
      status: inputData.status,
      summary: inputData.summary,
      recommendations: inputData.recommendations,
      logged: true,
    };
  },
});

const logMonitoringWorkflow = createWorkflow({
  id: "log-monitoring-workflow",
  inputSchema: z.object({
    endpoint: z
      .string()
      .url()
      .describe("The API endpoint URL to fetch logs from"),
    authToken: z.string().optional().describe("Optional authentication token"),
    timeRange: z
      .string()
      .optional()
      .describe('Time range for analysis. Defaults to "last 1 hour"'),
  }),
  outputSchema: z.object({
    status: z.enum(["Healthy", "Warning", "Critical"]),
    summary: z.string(),
    recommendations: z.array(z.string()),
    logged: z.boolean(),
  }),
})
  .then(analyzeLogsStep)
  .then(handleResultStep);

logMonitoringWorkflow.commit();

export { logMonitoringWorkflow };
