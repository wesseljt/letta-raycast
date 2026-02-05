/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Project 1 Name - Name for your first Letta project (e.g., 'Work', 'Personal') */
  "project1Name": string,
  /** Project 1 API Key - API key for Project 1 - get from Letta dashboard */
  "project1ApiKey": string,
  /** Project 1 Base URL - Optional. Custom URL for self-hosted Letta (e.g., http://localhost:8283) */
  "project1BaseUrl"?: string,
  /** Project 2 Name - Name for your second Letta project */
  "project2Name"?: string,
  /** Project 2 API Key - API key for Project 2 */
  "project2ApiKey"?: string,
  /** Project 2 Base URL - Optional custom URL for Project 2 */
  "project2BaseUrl"?: string,
  /** Project 3 Name - Name for your third Letta project */
  "project3Name"?: string,
  /** Project 3 API Key - API key for Project 3 */
  "project3ApiKey"?: string,
  /** Project 3 Base URL - Optional custom URL for Project 3 */
  "project3BaseUrl"?: string,
  /** Project 4 Name - Name for your fourth Letta project */
  "project4Name"?: string,
  /** Project 4 API Key - API key for Project 4 */
  "project4ApiKey"?: string,
  /** Project 4 Base URL - Optional custom URL for Project 4 */
  "project4BaseUrl"?: string,
  /** Project 5 Name - Name for your fifth Letta project */
  "project5Name"?: string,
  /** Project 5 API Key - API key for Project 5 */
  "project5ApiKey"?: string,
  /** Project 5 Base URL - Optional custom URL for Project 5 */
  "project5BaseUrl"?: string,
  /** Show Agent Reasoning - Display the agent's internal thoughts and tool usage */
  "showReasoning": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `chat` command */
  export type Chat = ExtensionPreferences & {}
  /** Preferences accessible in the `agents` command */
  export type Agents = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `chat` command */
  export type Chat = {}
  /** Arguments passed to the `agents` command */
  export type Agents = {}
}

