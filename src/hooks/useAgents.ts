/**
 * Agents Hook
 *
 * Fetch and cache agent list + manage active agent selection.
 * Uses Raycast's useCachedPromise for caching and useLocalStorage for persistence.
 */

import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import type { Letta } from "@letta-ai/letta-client";

export type AgentSummary = {
  id: string;
  name: string;
  description?: string | null;
};

const STORAGE_KEY_ACTIVE_AGENT = "letta-active-agent-id";

export function useAgents(client: Letta) {
  // Fetch agents list with caching
  const {
    data: agents,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      const result = await client.agents.list();
      // Map to a lean view - adjust based on actual SDK response shape
      return (result as unknown as { id: string; name: string; description?: string | null }[]).map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
      })) as AgentSummary[];
    },
    [],
    {
      keepPreviousData: true,
    }
  );

  // Persist active agent ID in local storage
  const { value: activeAgentId, setValue: setActiveAgentId } = useLocalStorage<string | null>(
    STORAGE_KEY_ACTIVE_AGENT,
    null
  );

  // Find the active agent from the list
  const activeAgent = agents?.find((a) => a.id === activeAgentId) ?? null;

  return {
    agents,
    isLoading,
    error,
    revalidate,
    activeAgent,
    activeAgentId,
    setActiveAgentId,
  };
}
