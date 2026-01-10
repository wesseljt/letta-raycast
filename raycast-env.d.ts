/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Letta API Key - Get from the Letta dashboard (Cloud or local) */
  "apiKey": string,
  /** Custom Letta Base URL - Optional. Use for self-hosted Letta, e.g. http://localhost:8283 */
  "baseUrl"?: string,
  /** Show Agent Reasoning - Display the agent's internal thoughts and tool usage */
  "showReasoning": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `chat` command */
  export type Chat = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `chat` command */
  export type Chat = {}
}

