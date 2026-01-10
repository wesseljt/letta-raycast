/**
 * View Agent Memory Command
 *
 * Inspect the memory blocks of your active Letta agent.
 * View what the agent knows and remembers.
 */

import { Action, ActionPanel, Detail, Icon, List, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { useLettaClient, useAgents } from "./hooks";

type MemoryBlock = {
  id: string;
  label: string;
  value: string;
};

export default function MemoryCommand() {
  const { client } = useLettaClient();
  const { activeAgent, isLoading: agentsLoading } = useAgents(client);
  const [blocks, setBlocks] = useState<MemoryBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchMemory = useCallback(async () => {
    if (!activeAgent) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await client.agents.coreMemory.retrieve(activeAgent.id);
      // Parse the response - adjust based on actual SDK shape
      const memoryBlocks = (res as { blocks?: { id: string; label: string; value: string }[] }).blocks ?? [];
      setBlocks(
        memoryBlocks.map((b) => ({
          id: b.id || b.label,
          label: b.label,
          value: b.value || "",
        }))
      );
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading memory",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeAgent?.id, client]);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory, refreshKey]);

  const handleRetry = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // No active agent
  if (!agentsLoading && !activeAgent) {
    return (
      <Detail
        markdown={`# No Active Agent

Please select an agent to view its memory.

Go to **Manage Agents** to select an agent.`}
        actions={
          <ActionPanel>
            <Action.Push title="Manage Agents" target={<AgentsCommand />} />
          </ActionPanel>
        }
      />
    );
  }

  // Error state
  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Memory

${error}

Try refreshing or selecting a different agent.`}
        actions={
          <ActionPanel>
            <Action icon={Icon.ArrowClockwise} title="Retry" onAction={handleRetry} />
            <Action.Push title="Manage Agents" target={<AgentsCommand />} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading || agentsLoading}
      searchBarPlaceholder="Search memory blocks..."
      navigationTitle={activeAgent ? `${activeAgent.name} - Memory` : "Agent Memory"}
    >
      {!isLoading && blocks.length === 0 && (
        <List.EmptyView
          icon={Icon.MemoryChip}
          title="No Memory Blocks"
          description="This agent doesn't have any memory blocks yet"
        />
      )}

      {blocks.map((block) => {
        const preview = block.value.length > 100 ? block.value.slice(0, 100) + "…" : block.value;

        return (
          <List.Item
            key={block.id}
            icon={{ source: Icon.MemoryChip, tintColor: getBlockColor(block.label) }}
            title={block.label}
            subtitle={preview}
            accessories={[{ text: `${block.value.length} chars` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title="View Block"
                  target={<MemoryBlockDetail block={block} agentName={activeAgent?.name ?? "Agent"} />}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title="Copy Content"
                  content={block.value}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title="Copy as Markdown"
                  content={`## ${block.label}\n\n${block.value}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Refresh Memory"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={handleRetry}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/**
 * Detail view for a single memory block
 */
function MemoryBlockDetail({ block, agentName }: { block: MemoryBlock; agentName: string }) {
  const markdown = `# ${block.label}

\`\`\`
${block.value}
\`\`\``;

  return (
    <Detail
      navigationTitle={`${agentName} - ${block.label}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Block Label" text={block.label} />
          <Detail.Metadata.Label title="Character Count" text={String(block.value.length)} />
          <Detail.Metadata.Label title="Word Count" text={String(block.value.split(/\s+/).length)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Content" content={block.value} />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy as Markdown"
            content={`## ${block.label}\n\n${block.value}`}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Get a color for different block types
 */
function getBlockColor(label: string): Color {
  const colors: Record<string, Color> = {
    persona: Color.Blue,
    human: Color.Green,
    working_context: Color.Orange,
    working_theories: Color.Orange,
    tech_context: Color.Purple,
  };
  return colors[label.toLowerCase()] ?? Color.SecondaryText;
}

// Import for navigation
import AgentsCommand from "./agents";
