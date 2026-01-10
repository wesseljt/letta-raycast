/**
 * Chat Hook
 *
 * Encapsulates the "send message to agent and get response" logic.
 * Uses streaming API to get complete responses and supports conversation history.
 */

import { useState, useCallback } from "react";
import type { Letta } from "@letta-ai/letta-client";

export type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export function useChat(client: Letta, agentId?: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [currentReasoning, setCurrentReasoning] = useState<string>("");
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (input: string) => {
      if (!agentId) {
        setError("No active Letta agent selected.");
        return;
      }

      // Add user message to history
      const userMessage: ChatMessage = {
        role: "user",
        content: input,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      setIsLoading(true);
      setError(null);
      setCurrentAnswer("");
      setCurrentReasoning("");
      setToolCalls([]);

      try {
        // Try streaming API first for complete responses
        let useStreaming = true;
        let finalAnswer = "";
        let finalReasoning = "";
        const finalTools: ToolCall[] = [];

        try {
          // Attempt streaming API - try both possible signatures
          let stream: AsyncIterable<unknown>;
          try {
            stream = await client.agents.messages.stream(agentId, {
              input: input,
              stream_tokens: true,
            } as unknown as Parameters<typeof client.agents.messages.stream>[1]);
          } catch {
            // Try alternative signature with messages array
            stream = await client.agents.messages.stream(agentId, {
              messages: [{ role: "user", content: input }],
              stream_tokens: true,
            } as unknown as Parameters<typeof client.agents.messages.stream>[1]);
          }

          const assistantParts: string[] = [];
          const reasoningParts: string[] = [];
          const tools: ToolCall[] = [];

          // Process streaming events
          for await (const event of stream) {
            const eventData = event as Record<string, unknown>;
            const eventType = eventData.event_type as string | undefined;
            const messageType = eventData.message_type as string | undefined;

            if (eventType === "assistant_message" || messageType === "assistant_message") {
              // Handle different content formats
              const content = eventData.content;
              if (typeof content === "string") {
                assistantParts.push(content);
                setCurrentAnswer(assistantParts.join(""));
              } else if (Array.isArray(content)) {
                for (const block of content) {
                  if (typeof block === "object" && block !== null) {
                    if ("text" in block && typeof block.text === "string") {
                      assistantParts.push(block.text);
                      setCurrentAnswer(assistantParts.join(""));
                    } else if (typeof block === "string") {
                      assistantParts.push(block);
                      setCurrentAnswer(assistantParts.join(""));
                    }
                  }
                }
              } else if (eventData.text && typeof eventData.text === "string") {
                assistantParts.push(eventData.text);
                setCurrentAnswer(assistantParts.join(""));
              } else if (eventData.delta && typeof eventData.delta === "string") {
                // Handle delta updates
                assistantParts.push(eventData.delta);
                setCurrentAnswer(assistantParts.join(""));
              }
            } else if (eventType === "reasoning_message" || messageType === "reasoning_message") {
              const reasoningContent =
                (eventData.reasoning as string) ||
                (eventData.content as string) ||
                (eventData.text as string) ||
                "";
              if (reasoningContent) {
                reasoningParts.push(reasoningContent);
                setCurrentReasoning(reasoningParts.join("\n\n"));
              }
            } else if (eventType === "tool_call_message" || messageType === "tool_call_message") {
              const toolCall = eventData.tool_call as
                | { name: string; arguments?: Record<string, unknown> }
                | undefined;
              if (toolCall) {
                tools.push({
                  name: toolCall.name || "unknown",
                  arguments: toolCall.arguments,
                });
                setToolCalls([...tools]);
              }
            }
          }

          finalAnswer = assistantParts.join("") || currentAnswer;
          finalReasoning = reasoningParts.join("\n\n");
          finalTools.push(...tools);
        } catch (streamError) {
          // Fallback to non-streaming API if streaming fails
          useStreaming = false;
          const response = await client.agents.messages.create(agentId, {
            input: input,
          });

          // Parse response messages - handle various response formats
          const responseData = response as Record<string, unknown>;
          const messages = (responseData.messages as unknown[]) ?? [];
          if (Array.isArray(responseData)) {
            // Response might be the messages array directly
            messages.push(...responseData);
          }

          const assistantParts: string[] = [];
          const reasoningParts: string[] = [];
          const tools: ToolCall[] = [];

          for (const m of messages as Record<string, unknown>[]) {
            const messageType = m.message_type as string | undefined;

            if (messageType === "assistant_message") {
              // Extract text content from various formats
              if (typeof m.content === "string") {
                assistantParts.push(m.content);
              } else if (Array.isArray(m.content)) {
                for (const block of m.content) {
                  if (typeof block === "object" && block !== null) {
                    if ("text" in block && typeof block.text === "string") {
                      assistantParts.push(block.text);
                    } else if (typeof block === "string") {
                      assistantParts.push(block);
                    }
                  } else if (typeof block === "string") {
                    assistantParts.push(block);
                  }
                }
              } else if (m.text && typeof m.text === "string") {
                assistantParts.push(m.text);
              }
            } else if (messageType === "reasoning_message") {
              const reasoningContent = (m.reasoning as string) || (m.content as string) || "";
              if (reasoningContent) {
                reasoningParts.push(reasoningContent);
              }
            } else if (messageType === "tool_call_message") {
              const toolCall = m.tool_call as { name: string; arguments?: Record<string, unknown> } | undefined;
              if (toolCall) {
                tools.push({
                  name: toolCall.name || "unknown",
                  arguments: toolCall.arguments,
                });
              }
            }
          }

          finalAnswer = assistantParts.join("\n\n");
          finalReasoning = reasoningParts.join("\n\n");
          finalTools.push(...tools);
        }

        // Add assistant response to history when complete
        if (finalAnswer) {
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: finalAnswer,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
        if (finalReasoning) {
          setCurrentReasoning(finalReasoning);
        }
        if (finalTools.length > 0) {
          setToolCalls(finalTools);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Error talking to Letta.";
        setError(errorMessage);
        // Remove the user message if there was an error
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
        setCurrentAnswer("");
        setCurrentReasoning("");
      }
    },
    [agentId, client, currentAnswer]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setCurrentAnswer("");
    setCurrentReasoning("");
    setToolCalls([]);
    setError(null);
  }, []);

  // Get the latest answer (either from current stream or last message)
  const answer = currentAnswer || messages.filter((m) => m.role === "assistant").slice(-1)[0]?.content || null;
  const reasoning = currentReasoning || null;

  return {
    isLoading,
    messages,
    answer,
    reasoning,
    toolCalls,
    error,
    send,
    reset,
  };
}
