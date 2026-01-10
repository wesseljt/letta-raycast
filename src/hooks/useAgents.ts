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

      // Handle different response shapes from SDK
      let agentsList: Array<{ id: string; name: string; description?: string | null }> = [];

      if (Array.isArray(result)) {
        // Direct array response
        agentsList = result;
      } else if (result && typeof result === "object") {
        const resultObj = result as Record<string, unknown>;

        // Check for paginated response with .data property
        if (Array.isArray(resultObj.data)) {
          agentsList = resultObj.data;
        }
        // Check for async iterable (for await...of)
        else if (Symbol.asyncIterator in result) {
          for await (const agent of result as AsyncIterable<{
            id: string;
            name: string;
            description?: string | null;
          }>) {
            agentsList.push(agent);
          }
        }
      }

      // Map to a lean view
      return agentsList.map((a) => ({
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
