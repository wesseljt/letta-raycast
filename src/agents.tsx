/**
 * Manage Agents Command
 *
 * List, select, and manage your Letta agents.
 * Set an agent as active to chat with it.
 */

import { Action, ActionPanel, Icon, List, showToast, Toast, Color } from "@raycast/api";
import { useLettaClient, useAgents } from "./hooks";
import CreateAgentCommand from "./create-agent";

export default function AgentsCommand() {
  const { client } = useLettaClient();
  const { agents, isLoading, activeAgentId, setActiveAgentId, error, revalidate } = useAgents(client);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error loading agents",
      message: String(error),
    });
  }

  const hasAgents = agents && agents.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search agents..."
      navigationTitle="Manage Agents"
    >
      {!isLoading && !hasAgents && (
        <List.EmptyView
          icon={Icon.Person}
          title="No Agents Found"
          description="Create your first Letta agent to get started"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Agent" target={<CreateAgentCommand />} />
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      )}

      {agents?.map((agent) => {
        const isActive = agent.id === activeAgentId;

        return (
          <List.Item
            key={agent.id}
            icon={isActive ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Person}
            title={agent.name}
            subtitle={agent.description ?? ""}
            accessories={isActive ? [{ tag: { value: "Active", color: Color.Green } }] : []}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {!isActive && (
                    <Action
                      icon={Icon.CheckCircle}
                      title="Set as Active Agent"
                      onAction={async () => {
                        await setActiveAgentId(agent.id);
                        showToast({
                          style: Toast.Style.Success,
                          title: "Active agent set",
                          message: agent.name,
                        });
                      }}
                    />
                  )}
                  <Action.Push
                    icon={Icon.Message}
                    title="Chat with Agent"
                    target={<ChatWithAgent agentId={agent.id} agentName={agent.name} />}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    icon={Icon.ArrowClockwise}
                    title="Refresh Agents"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => revalidate()}
                  />
                  <Action.Push
                    icon={Icon.Plus}
                    title="Create New Agent"
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<CreateAgentCommand />}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    icon={Icon.Globe}
                    title="Open in Letta ADE"
                    url={`https://app.letta.com/agents/${agent.id}`}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    title="Copy Agent ID"
                    content={agent.id}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/**
 * Quick chat view when selecting an agent
 */
function ChatWithAgent({ agentId, agentName }: { agentId: string; agentName: string }) {
  // This sets the agent as active and opens chat
  const { client } = useLettaClient();
  const { setActiveAgentId } = useAgents(client);

  // Set as active when opening
  setActiveAgentId(agentId);

  // Import and render the chat command
  const ChatCommand = require("./chat").default;
  return <ChatCommand />;
}
