/**
 * Chat with Agent Command
 *
 * Main chat interface for talking to your active Letta agent.
 * Shows the agent's response and optionally reasoning/tool usage.
 */

import { Action, ActionPanel, Detail, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { useLettaClient, useAgents, useChat } from "./hooks";

export default function ChatCommand() {
  const { client, showReasoning } = useLettaClient();
  const { activeAgent, agents, isLoading: agentsLoading } = useAgents(client);
  const { isLoading, answer, reasoning, toolCalls, error, send } = useChat(client, activeAgent?.id);
  const { push } = useNavigation();

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

  // Build markdown content
  const markdownParts: string[] = [];

  if (activeAgent) {
    markdownParts.push(`# ${activeAgent.name}\n`);
  }

  if (error) {
    markdownParts.push(`> ⚠️ **Error:** ${error}\n`);
  }

  if (answer) {
    markdownParts.push(answer);
  } else if (!isLoading) {
    markdownParts.push("_Ask your Letta agent something to get started._");
  }

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
          {answer && <Action.CopyToClipboard title="Copy Answer" content={answer} />}
          <Action.Push title="Manage Agents" target={<AgentsCommand />} />
          <Action.Push title="View Memory" target={<MemoryCommand />} />
        </ActionPanel>
      }
      metadata={
        activeAgent ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Agent" text={activeAgent.name} />
            {activeAgent.description && (
              <Detail.Metadata.Label title="Description" text={activeAgent.description} />
            )}
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

/**
 * Prompt input form
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
            title="Send Message"
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
        placeholder="Ask your Letta agent…"
        value={value}
        onChange={setValue}
        autoFocus
      />
    </Form>
  );
}

// Lazy imports to avoid circular dependencies
import AgentsCommand from "./agents";
import CreateAgentCommand from "./create-agent";
import MemoryCommand from "./memory";
