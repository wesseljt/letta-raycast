/**
 * Chat with Agent Command
 *
 * Main chat interface for talking to your active Letta agent.
 * Shows conversation history and agent responses with optional reasoning.
 */

import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
  useNavigation,
  Icon,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useLettaClient, useAgents, useChat } from "./hooks";
import AgentsCommand from "./agents";
import CreateAgentCommand from "./create-agent";
import MemoryCommand from "./memory";

export default function ChatCommand() {
  const { client, showReasoning } = useLettaClient();
  const { activeAgent, agents, isLoading: agentsLoading } = useAgents(client);
  const { isLoading, messages, answer, reasoning, toolCalls, error, send, reset } = useChat(
    client,
    activeAgent?.id
  );

  // Show warning if no active agent but agents exist
  useEffect(() => {
    if (!agentsLoading && !activeAgent && agents && agents.length > 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No active agent",
        message: "Open 'Manage Agents' to pick one.",
      });
    }
  }, [agentsLoading, activeAgent, agents]);

  // Build markdown content with conversation history
  const markdownParts: string[] = [];

  if (activeAgent) {
    markdownParts.push(`# ${activeAgent.name}\n`);
  }

  if (error) {
    markdownParts.push(`> ⚠️ **Error:** ${error}\n`);
  }

  // Show conversation history
  if (messages.length > 0) {
    for (const msg of messages) {
      if (msg.role === "user") {
        markdownParts.push(`## You\n\n${msg.content}\n`);
      } else if (msg.role === "assistant") {
        markdownParts.push(`## Agent\n\n${msg.content}\n`);
      }
    }
  }

  // Show current streaming answer if different from last message
  if (isLoading && answer && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "assistant" && answer !== lastMessage.content) {
      // Update the last assistant message section
      const lastIndex = markdownParts.length - 1;
      if (lastIndex >= 0 && markdownParts[lastIndex].startsWith("## Agent")) {
        markdownParts[lastIndex] = `## Agent\n\n${answer}\n\n_Thinking..._`;
      }
    } else if (lastMessage.role === "user") {
      // New response starting
      markdownParts.push(`## Agent\n\n${answer}\n\n_Thinking..._`);
    }
  } else if (isLoading && answer) {
    // First message
    markdownParts.push(`## Agent\n\n${answer}\n\n_Thinking..._`);
  } else if (!isLoading && messages.length === 0) {
    markdownParts.push("_Ask your Letta agent something to get started._");
  }

  // Add reasoning and tool calls if enabled
  if (showReasoning && reasoning) {
    markdownParts.push("\n---\n\n### 🧠 Agent Reasoning\n\n" + reasoning);
  }

  if (showReasoning && toolCalls.length > 0) {
    const toolSection = toolCalls
      .map((t) => {
        const argsStr = t.arguments ? ` \`${JSON.stringify(t.arguments).slice(0, 80)}...\`` : "";
        return `- **${t.name}**${argsStr}`;
      })
      .join("\n");
    markdownParts.push("\n---\n\n### 🔧 Tool Usage\n\n" + toolSection);
  }

  const markdown = markdownParts.join("\n\n");

  // No active agent - show setup instructions
  if (!agentsLoading && !activeAgent) {
    return (
      <Detail
        markdown={`# No Active Agent

Please select an agent to chat with.

1. Open **Manage Agents** to see your agents
2. Select an agent and set it as active
3. Or create a new agent with **Create Letta Agent**`}
        actions={
          <ActionPanel>
            <Action.Push title="Manage Agents" target={<AgentsCommand />} />
            <Action.Push title="Create Agent" target={<CreateAgentCommand />} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading || agentsLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Message}
            title="Ask Question"
            shortcut={{ modifiers: [], key: "return" }}
            target={
              <PromptForm
                agentName={activeAgent?.name ?? "Agent"}
                onSubmit={(value) => {
                  void send(value);
                }}
              />
            }
          />
          {answer && (
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy Last Response"
              content={answer}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {messages.length > 0 && (
            <Action
              icon={Icon.Trash}
              title="Clear Conversation"
              shortcut={{ modifiers: ["cmd"], key: "k" }}
              onAction={() => {
                reset();
                showToast({
                  style: Toast.Style.Success,
                  title: "Conversation cleared",
                });
              }}
            />
          )}
          <Action.Push
            icon={Icon.Person}
            title="Manage Agents"
            target={<AgentsCommand />}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.Push
            icon={Icon.Book}
            title="View Memory"
            target={<MemoryCommand />}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        </ActionPanel>
      }
      metadata={
        activeAgent ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Agent" text={activeAgent.name} />
            {activeAgent.description && (
              <Detail.Metadata.Label title="Description" text={activeAgent.description} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Messages"
              text={`${messages.filter((m) => m.role === "user").length} sent`}
            />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

/**
 * Prompt input form - improved with better UX
 */
function PromptForm(props: { agentName: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={`Ask ${props.agentName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Message}
            title="Send Message"
            shortcut={{ modifiers: [], key: "return" }}
            onSubmit={() => {
              if (value.trim()) {
                props.onSubmit(value.trim());
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Message"
        placeholder="Ask your Letta agent anything…"
        value={value}
        onChange={setValue}
        autoFocus
      />
      <Form.Description
        title="Tip"
        text="Press Enter to send. The agent will remember this conversation."
      />
    </Form>
  );
}
