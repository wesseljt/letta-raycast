/**
 * Chat with Agent Command
 *
 * Split-pane chat interface:
 * - Left sidebar: Chat history (previous conversations)
 * - Right panel: Current conversation messages with thinking/response
 * - Bottom: Input action
 */

import {
  Action,
  ActionPanel,
  List,
  Form,
  showToast,
  Toast,
  Icon,
  Color,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useLettaClient, useAgents, useChat } from "./hooks";
import type { ChatMessage } from "./hooks/useChat";
import AgentsCommand from "./agents";
import CreateAgentCommand from "./create-agent";
import MemoryCommand from "./memory";

// Store for chat sessions (in-memory for now)
type ChatSession = {
  id: string;
  title: string;
  timestamp: Date;
  messages: ChatMessage[];
  agentId: string;
};

export default function ChatCommand() {
  const { client, showReasoning } = useLettaClient();
  const { activeAgent, agents, isLoading: agentsLoading } = useAgents(client);
  const { isLoading, messages, answer, reasoning, toolCalls, error, send, reset } = useChat(
    client,
    activeAgent?.id
  );
  const [searchText, setSearchText] = useState("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

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

  // Auto-create a session when messages start
  useEffect(() => {
    if (messages.length > 0 && !currentSessionId && activeAgent) {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: firstUserMsg?.content.slice(0, 30) + "..." || "New Chat",
        timestamp: new Date(),
        messages: [...messages],
        agentId: activeAgent.id,
      };
      setChatSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
    } else if (currentSessionId && messages.length > 0) {
      // Update existing session
      setChatSessions((prev) =>
        prev.map((s) => (s.id === currentSessionId ? { ...s, messages: [...messages] } : s))
      );
    }
  }, [messages, currentSessionId, activeAgent]);

  // Handle sending message
  const handleSubmit = (message: string) => {
    if (message.trim() && !isLoading) {
      void send(message.trim());
    }
  };

  // Start a new chat
  const startNewChat = () => {
    reset();
    setCurrentSessionId(null);
  };

  // Load a previous session
  const loadSession = (session: ChatSession) => {
    // For now, just show the session - full restore would need backend support
    setCurrentSessionId(session.id);
  };

  // Build the conversation markdown for the detail panel
  const buildConversationMarkdown = (): string => {
    const parts: string[] = [];

    if (activeAgent) {
      parts.push(`# ${activeAgent.name}\n`);
    }

    if (error) {
      parts.push(`> ⚠️ **Error:** ${error}\n`);
    }

    // Show all messages in the conversation
    for (const msg of messages) {
      if (msg.role === "user") {
        parts.push(`### 👤 You\n${msg.content}\n`);
      } else if (msg.role === "assistant") {
        parts.push(`### 🤖 Agent\n${msg.content}\n`);
      }
    }

    // Show streaming response
    if (isLoading && answer) {
      parts.push(`### 🤖 Agent\n${answer}\n\n_Thinking..._`);
    }

    // Show reasoning block if enabled
    if (showReasoning && reasoning) {
      parts.push(`---\n\n### 🧠 Thinking\n\n${reasoning}`);
    }

    // Show tool usage if enabled
    if (showReasoning && toolCalls.length > 0) {
      const toolSection = toolCalls
        .map((t) => {
          const argsStr = t.arguments ? `\n\`\`\`json\n${JSON.stringify(t.arguments, null, 2)}\n\`\`\`` : "";
          return `- **${t.name}**${argsStr}`;
        })
        .join("\n");
      parts.push(`---\n\n### 🔧 Tools Used\n\n${toolSection}`);
    }

    if (parts.length === 0 || (parts.length === 1 && activeAgent)) {
      parts.push("\n_Start a conversation by pressing Enter or clicking 'Send Message'_");
    }

    return parts.join("\n\n");
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

  // Group sessions by time
  const todaySessions = chatSessions.filter((s) => {
    const today = new Date();
    return s.timestamp.toDateString() === today.toDateString();
  });

  const thisWeekSessions = chatSessions.filter((s) => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return s.timestamp > weekAgo && s.timestamp.toDateString() !== today.toDateString();
  });

  const olderSessions = chatSessions.filter((s) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return s.timestamp <= weekAgo;
  });

  // Detail panel showing current conversation
  const conversationDetail = (
    <List.Item.Detail markdown={buildConversationMarkdown()} />
  );

  // Common actions for all items
  const getCommonActions = () => (
    <ActionPanel>
      <Action.Push
        icon={Icon.Message}
        title="Send Message"
        shortcut={{ modifiers: [], key: "return" }}
        target={<PromptForm agentName={activeAgent?.name ?? "Agent"} onSubmit={handleSubmit} />}
      />
      <Action
        icon={Icon.Plus}
        title="New Chat"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={startNewChat}
      />
      {messages.length > 0 && (
        <Action
          icon={Icon.Trash}
          title="Clear Conversation"
          shortcut={{ modifiers: ["cmd"], key: "k" }}
          onAction={() => {
            reset();
            setCurrentSessionId(null);
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
  );

  return (
    <List
      isLoading={isLoading || agentsLoading}
      isShowingDetail={true}
      searchBarPlaceholder="Search chats..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
    >
      {/* Current Chat Section */}
      <List.Section title="Current Chat">
        <List.Item
          icon={{ source: Icon.Message, tintColor: Color.Blue }}
          title={
            messages.length > 0
              ? messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? "..." : "")
              : "New Chat"
          }
          subtitle={activeAgent?.name}
          accessories={[{ text: `${messages.filter((m) => m.role === "user").length} messages` }]}
          detail={conversationDetail}
          actions={getCommonActions()}
        />
      </List.Section>

      {/* Today's Chats */}
      {todaySessions.length > 0 && (
        <List.Section title="Today">
          {todaySessions.map((session) => (
            <List.Item
              key={session.id}
              icon={Icon.Message}
              title={session.title}
              subtitle={session.messages[session.messages.length - 1]?.content.slice(0, 40) + "..."}
              accessories={[
                {
                  text: session.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={session.messages
                    .map((m) =>
                      m.role === "user" ? `### 👤 You\n${m.content}` : `### 🤖 Agent\n${m.content}`
                    )
                    .join("\n\n")}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Eye}
                    title="View Chat"
                    onAction={() => loadSession(session)}
                  />
                  <Action.Push
                    icon={Icon.Message}
                    title="Send Message"
                    target={<PromptForm agentName={activeAgent?.name ?? "Agent"} onSubmit={handleSubmit} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* This Week's Chats */}
      {thisWeekSessions.length > 0 && (
        <List.Section title="This Week">
          {thisWeekSessions.map((session) => (
            <List.Item
              key={session.id}
              icon={Icon.Message}
              title={session.title}
              subtitle={session.messages[session.messages.length - 1]?.content.slice(0, 40) + "..."}
              accessories={[
                {
                  text: session.timestamp.toLocaleDateString([], { weekday: "short" }),
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={session.messages
                    .map((m) =>
                      m.role === "user" ? `### 👤 You\n${m.content}` : `### 🤖 Agent\n${m.content}`
                    )
                    .join("\n\n")}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Eye}
                    title="View Chat"
                    onAction={() => loadSession(session)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Older Chats */}
      {olderSessions.length > 0 && (
        <List.Section title="Older">
          {olderSessions.map((session) => (
            <List.Item
              key={session.id}
              icon={Icon.Message}
              title={session.title}
              accessories={[
                {
                  text: session.timestamp.toLocaleDateString(),
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={session.messages
                    .map((m) =>
                      m.role === "user" ? `### 👤 You\n${m.content}` : `### 🤖 Agent\n${m.content}`
                    )
                    .join("\n\n")}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Eye}
                    title="View Chat"
                    onAction={() => loadSession(session)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Empty state for no previous chats */}
      {chatSessions.length === 0 && messages.length === 0 && (
        <List.Section title="No Previous Chats">
          <List.Item
            icon={Icon.Plus}
            title="Start a new conversation"
            subtitle="Press Enter to send your first message"
            detail={conversationDetail}
            actions={getCommonActions()}
          />
        </List.Section>
      )}
    </List>
  );
}

/**
 * Prompt input form - acts as the bottom input
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
    </Form>
  );
}
