import { registerApiRoute } from "@mastra/core/server";
import { randomUUID } from "crypto";

/**
 * Custom A2A (Agent-to-Agent) API Route
 *
 * This route wraps Mastra agent responses in A2A protocol format
 * following JSON-RPC 2.0 specification with proper artifacts structure
 */
export const a2aAgentRoute = registerApiRoute("/a2a/agent/:agentId", {
  method: "POST",
  handler: async (c) => {
    try {
      const mastra = c.get("mastra");
      const agentId = c.req.param("agentId");

      // Parse JSON-RPC 2.0 request
      const body = await c.req.json();
      const { jsonrpc, id: requestId, method, params } = body;

      if (jsonrpc !== "2.0" || !requestId) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId || null,
            error: {
              code: -32600,
              message:
                'Invalid Request: jsonrpc must be "2.0" and id is required',
            },
          },
          400
        );
      }

      const agent = mastra.getAgent(agentId);
      if (!agent) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId,
            error: {
              code: -32602,
              message: `Agent '${agentId}' not found`,
            },
          },
          404
        );
      }

      const { message, messages, contextId, taskId, metadata, configuration } =
        params || {};

      let messagesList: any[] = [];
      let conversationContext = contextId;
      let currentTaskId = taskId;
      let messageMetadata = metadata;
      if (message) {
        messagesList = [message];
        conversationContext = message.contextId || contextId;
        currentTaskId = message.taskId || taskId;
        messageMetadata = message.metadata || metadata;
      } else if (messages && Array.isArray(messages)) {
        messagesList = messages;
      } else {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId,
            error: {
              code: -32602,
              message: "Invalid params: message or messages is required",
            },
          },
          400
        );
      }

      const mastraMessages = messagesList.map((msg: any) => ({
        role: msg.role,
        content:
          msg.parts
            ?.map((part: any) => {
              if (part.kind === "text") return part.text;
              if (part.kind === "data") return JSON.stringify(part.data);
              return "";
            })
            .join("\n") || "",
      }));

      const response = await agent.generate(mastraMessages);

      const agentText = response.text || "";

      const artifacts = [
        {
          artifactId: randomUUID(),
          name: `${agentId}Response`,
          parts: [
            {
              kind: "text",
              text: agentText,
            },
          ],
        },
      ];
      if (response.toolResults && response.toolResults.length > 0) {
        artifacts.push({
          artifactId: randomUUID(),
          name: "ToolResults",
          // @ts-expect-error next line
          parts: response.toolResults.map((result: any) => ({
            kind: "data",
            data: result,
          })),
        });
      }

      const history = [
        ...messagesList.map((msg: any, index: number) => ({
          kind: "message",
          role: msg.role,
          parts: msg.parts,
          messageId: msg.messageId || randomUUID(),
          taskId: msg.taskId || currentTaskId || randomUUID(),
          metadata: msg.metadata || messageMetadata,
        })),
        {
          kind: "message",
          role: "agent",
          parts: [
            {
              kind: "text",
              text: agentText,
            },
          ],
          messageId: randomUUID(),
          taskId: currentTaskId || randomUUID(),
          metadata: messageMetadata,
        },
      ];

      const responseMessageId = randomUUID();
      const a2aResponse = {
        jsonrpc: "2.0",
        id: requestId,
        result: {
          id: currentTaskId || randomUUID(),
          contextId: conversationContext || randomUUID(),
          status: {
            state: "completed",
            timestamp: new Date().toISOString(),
            message: {
              messageId: responseMessageId,
              role: "agent",
              parts: [
                {
                  kind: "text",
                  text: agentText,
                },
              ],
              kind: "message",
            },
          },
          artifacts,
          history,
          kind: "task",
        },
      };

      // If configuration specifies non-blocking and pushNotificationConfig, handle async
      // For now, we're returning synchronously but you can extend this for async webhooks
      if (
        configuration?.blocking === false &&
        configuration?.pushNotificationConfig?.url
      ) {
        // TODO: Implement async processing with webhook callback
        // For now, return the response synchronously
        console.log(
          "Non-blocking request with webhook:",
          configuration.pushNotificationConfig.url
        );
      }

      return c.json(a2aResponse);
    } catch (error: any) {
      console.error("A2A Agent Route Error:", error);

      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32603,
            message: "Internal error",
            data: {
              details: error.message,
            },
          },
        },
        500
      );
    }
  },
});
