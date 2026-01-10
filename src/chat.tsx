/**
 * Chat with Agent Command
 *
 * Chat interface matching the screenshot layout:
 * - Conversation history/selector on the left (via sections)
 * - Messages displayed in the middle (chronological list)
 * - Input action always available at bottom
 */

import {
  Action,
  ActionPanel,
  List,
  Detail,
  Form,
  showToast,
  Toast,
  Icon,
  Color,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
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
  const [searchText, setSearchText] = useState("");

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

  // Handle sending message
  const handleSubmit = (message: string) => {
    if (message.trim() && !isLoading) {
      void send(message.trim());
    }
  };

  // No active agent - show setup instructions
  if (!agentsLoading && !activeAgent) {
    return (
      <List
        searchBarPlaceholder="Search chats..."
        actions={
          <ActionPanel>
            <Action.Push title="Manage Agents" target={<AgentsCommand />} />
            <Action.Push title="Create Agent" target={<CreateAgentCommand />} />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.Person}
          title="No Active Agent"
          description="Select an agent to start chatting"
          actions={
            <ActionPanel>
              <Action.Push title="Manage Agents" target={<AgentsCommand />} />
              <Action.Push title="Create Agent" target={<CreateAgentCommand />} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Build the main chat interface
  const listItems: JSX.Element[] = [];

  // Header section - like "New Chat" in the sidebar
  if (activeAgent) {
    listItems.push(
      <List.Section key="header" title="Current Chat">
        <List.Item
          icon={{ source: Icon.Message, tintColor: Color.Blue }}
          title="New Chat"
          subtitle={`Chatting with ${activeAgent.name}`}
          accessories={[
            {
              text: `${messages.filter((m) => m.role === "user").length} messages`,
            },
          ]}
        />
      </List.Section>
    );
  }

  // Messages section - displayed chronologically in the middle
  if (messages.length > 0 || isLoading) {
    listItems.push(
      <List.Section key="messages" title="Messages">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const isLast = idx === messages.length - 1;
          const isStreaming = isLoading && isLast && msg.role === "assistant" && answer;

          return (
            <List.Item
              key={`msg-${idx}-${msg.timestamp.getTime()}`}
              icon={
                isUser
                  ? { source: Icon.Person, tintColor: Color.Blue }
                  : { source: Icon.Robot, tintColor: Color.Green }
              }
              title={isUser ? "You" : "Agent"}
              subtitle={
                isStreaming && answer
                  ? answer.slice(0, 150) + (answer.length > 150 ? "..." : "") + " ⏳"
                  : msg.content.slice(0, 150) + (msg.content.length > 150 ? "..." : "")
              }
              accessories={[
                {
                  text: msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    title="Copy Message"
                    content={msg.content}
                  />
                  <Action.Push
                    icon={Icon.Eye}
                    title="View Full Message"
                    target={
                      <Detail
                        markdown={`# ${isUser ? "You" : "Agent"}\n\n${msg.content}`}
                        actions={
                          <ActionPanel>
                            <Action.CopyToClipboard content={msg.content} />
                          </ActionPanel>
                        }
                        metadata={
                          <Detail.Metadata>
                            <Detail.Metadata.Label title="Time" text={msg.timestamp.toLocaleString()} />
                          </Detail.Metadata>
                        }
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })}

        {/* Show streaming response if in progress */}
        {isLoading && answer && messages[messages.length - 1]?.role === "user" && (
          <List.Item
            key="streaming"
            icon={{ source: Icon.Robot, tintColor: Color.Green }}
            title="Agent"
            subtitle={answer.slice(0, 150) + (answer.length > 150 ? "..." : "") + " ⏳"}
            accessories={[{ icon: Icon.Clock, tintColor: Color.Blue }]}
          />
        )}
      </List.Section>
    );
  }

  // Error message
  if (error) {
    listItems.push(
      <List.Section key="error" title="Error">
        <List.Item
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error"
          subtitle={error}
        />
      </List.Section>
    );
  }

  // Reasoning section (if enabled)
  if (showReasoning && reasoning) {
    listItems.push(
      <List.Section key="reasoning" title="🧠 Reasoning">
        <List.Item
          icon={Icon.Brain}
          title="Agent Reasoning"
          subtitle={reasoning.slice(0, 100) + (reasoning.length > 100 ? "..." : "")}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Full Reasoning"
                target={
                  <Detail
                    markdown={`# Agent Reasoning\n\n${reasoning}`}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard content={reasoning} />
                      </ActionPanel>
                    }
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    );
  }

  // Tool calls section (if enabled)
  if (showReasoning && toolCalls.length > 0) {
    listItems.push(
      <List.Section key="tools" title="🔧 Tools Used">
        {toolCalls.map((tool, idx) => (
          <List.Item
            key={`tool-${idx}`}
            icon={Icon.Wrench}
            title={tool.name}
            subtitle={tool.arguments ? JSON.stringify(tool.arguments).slice(0, 80) + "..." : "No arguments"}
          />
        ))}
      </List.Section>
    );
  }

  // Empty state
  if (!isLoading && messages.length === 0 && !error) {
    return (
      <List
        isLoading={agentsLoading}
        searchBarPlaceholder="Ask your Letta agent anything..."
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Message}
              title="Ask Question"
              shortcut={{ modifiers: [], key: "return" }}
              target={<PromptForm agentName={activeAgent?.name ?? "Agent"} onSubmit={handleSubmit} />}
            />
            <Action.Push title="Manage Agents" target={<AgentsCommand />} />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.Message}
          title="Start a Conversation"
          description="Press Enter or click 'Ask Question' to begin chatting with your agent"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Message}
                title="Ask Question"
                shortcut={{ modifiers: [], key: "return" }}
                target={<PromptForm agentName={activeAgent?.name ?? "Agent"} onSubmit={handleSubmit} />}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || agentsLoading}
      searchBarPlaceholder="Ask your Letta agent anything..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={
        <ActionPanel>
          {/* Always-available input action - like the bottom input bar */}
          <Action.Push
            icon={Icon.Message}
            title="Send Message"
            shortcut={{ modifiers: [], key: "return" }}
            target={<PromptForm agentName={activeAgent?.name ?? "Agent"} onSubmit={handleSubmit} />}
          />
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
    >
      {listItems}
    </List>
  );
}

/**
 * Prompt input form - acts as the bottom input bar
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
