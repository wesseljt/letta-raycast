/**
 * Letta Client Hook
 *
 * Single source of truth for reading Raycast preferences,
 * instantiating the Letta client, and exposing config flags.
 */

import { getPreferenceValues } from "@raycast/api";
import { Letta } from "@letta-ai/letta-client";

type ExtensionPreferences = {
  apiKey: string;
  baseUrl?: string;
  showReasoning?: boolean;
};

export function useLettaClient() {
  const { apiKey, baseUrl, showReasoning } = getPreferenceValues<ExtensionPreferences>();

  const client = new Letta({
    apiKey,
    ...(baseUrl ? { baseUrl } : {}),
  });

  return {
    client,
    showReasoning: showReasoning ?? true,
  };
}

/**
 * Get preferences without creating a client
 */
export function getPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}
