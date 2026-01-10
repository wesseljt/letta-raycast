/**
 * Chat Hook
 *
 * Encapsulates the "send message to agent and get response" logic.
 * Starts with non-streaming; can be upgraded to SSE streaming later.
 */

import { useState } from "react";
import type { Letta } from "@letta-ai/letta-client";

export type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
};

export function useChat(client: Letta, agentId?: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function send(input: string) {
    if (!agentId) {
      setError("No active Letta agent selected.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setReasoning(null);
    setToolCalls([]);

    try {
      // Build the message with metadata
      const timestamp = new Date().toISOString();
      const formattedInput = `[Message from Raycast at ${timestamp}]\n\n${input}`;

      // Use the simple 'input' field per Letta SDK docs
      const response = await client.agents.messages.create(agentId, {
        input: formattedInput,
      });

      // Parse response messages
      const messages = (response as unknown as { messages?: unknown[] }).messages ?? [];

      const assistantParts: string[] = [];
      const reasoningParts: string[] = [];
      const tools: ToolCall[] = [];

      for (const m of messages as Record<string, unknown>[]) {
        const messageType = m.message_type as string | undefined;

        if (messageType === "assistant_message") {
          // Extract text content
          if (typeof m.content === "string") {
            assistantParts.push(m.content);
          } else if (Array.isArray(m.content)) {
            for (const block of m.content) {
              if (typeof block === "object" && block !== null && "text" in block) {
                assistantParts.push((block as { text: string }).text);
              }
            }
          }
        } else if (messageType === "reasoning_message") {
          const reasoningContent = (m.reasoning as string) || (m.content as string);
          if (reasoningContent) {
            reasoningParts.push(reasoningContent);
          }
        } else if (messageType === "tool_call_message") {
          // Tool calls have a nested tool_call object per SDK docs
          const toolCall = m.tool_call as { name: string; arguments?: Record<string, unknown> } | undefined;
          if (toolCall) {
            tools.push({
              name: toolCall.name || "unknown",
              arguments: toolCall.arguments,
            });
          }
        }
      }

      setAnswer(assistantParts.join("\n\n"));
      if (reasoningParts.length) {
        setReasoning(reasoningParts.join("\n\n"));
      }
      if (tools.length) {
        setToolCalls(tools);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Error talking to Letta.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setAnswer(null);
    setReasoning(null);
    setToolCalls([]);
    setError(null);
  }

  return {
    isLoading,
    answer,
    reasoning,
    toolCalls,
    error,
    send,
    reset,
  };
}
