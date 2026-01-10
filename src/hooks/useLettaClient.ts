/**
 * Letta Client Hook
 *
 * Provides access to Letta clients for multi-account support.
 * Wraps useAccounts with convenience methods for getting the right client.
 */

import { useAccounts } from "./useAccounts";
import type { Letta } from "@letta-ai/letta-client";
import type { AgentSummary } from "./useAgents";
import type { AgentWithAccount } from "../types";

/**
 * Main hook for Letta client access
 *
 * Returns all accounts and helper functions for getting clients
 */
export function useLettaClient() {
  const { accounts, getClientForAccount, showReasoning } = useAccounts();

  /**
   * Get the client for a specific agent
   * Looks up which account the agent belongs to and returns that client
   */
  const getClientForAgent = (
    agent: AgentSummary | AgentWithAccount | { accountId: string }
  ): Letta | undefined => {
    return getClientForAccount(agent.accountId);
  };

  return {
    /** All configured accounts */
    accounts,
    /** Get client for a specific account ID */
    getClientForAccount,
    /** Get client for a specific agent (by its accountId) */
    getClientForAgent,
    /** Whether to show reasoning in chat */
    showReasoning,
  };
}

/**
 * Re-export for backwards compatibility and direct access
 */
export { useAccounts, getAccounts } from "./useAccounts";
