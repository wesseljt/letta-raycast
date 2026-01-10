/**
 * Create Letta Agent Command
 *
 * Create a new agent from a template with customizable settings.
 */

import { Action, ActionPanel, Form, popToRoot, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { useLettaClient, useAgents } from "./hooks";

// Agent templates
const TEMPLATES = [
  {
    id: "ion",
    name: "Ion (Enhanced Memory)",
    description: "Personal assistant with enhanced memory and learning capabilities",
    memoryBlocks: [
      {
        label: "human",
        value: "The human's name is unknown yet. I will learn about them as we interact.",
      },
      {
        label: "persona",
        value:
          "I am Ion, an AI assistant with enhanced memory capabilities. I actively maintain and update my understanding of the user, their preferences, projects, and ongoing work. I think deeply about problems and remember important context across conversations.",
      },
      {
        label: "working_context",
        value: "This block contains my evolving understanding of ongoing topics, projects, and goals.",
      },
    ],
  },
  {
    id: "default",
    name: "Default Assistant",
    description: "A basic conversational agent with standard memory",
    memoryBlocks: [
      {
        label: "human",
        value: "The human's name is unknown.",
      },
      {
        label: "persona",
        value: "I am a helpful AI assistant. I aim to be clear, accurate, and useful in my responses.",
      },
    ],
  },
  {
    id: "coder",
    name: "Coding Assistant",
    description: "Specialized for software development and technical tasks",
    memoryBlocks: [
      {
        label: "human",
        value:
          "A software developer. I will learn about their preferred languages, frameworks, and coding style.",
      },
      {
        label: "persona",
        value:
          "I am a specialized coding assistant. I help with software development, debugging, code review, and technical problem-solving. I remember the user's tech stack, coding preferences, and ongoing projects.",
      },
      {
        label: "tech_context",
        value: "This block tracks the user's technology stack, current projects, and technical preferences.",
      },
    ],
  },
];

export default function CreateAgentCommand() {
  const { client } = useLettaClient();
  const { setActiveAgentId, revalidate } = useAgents(client);

  const [name, setName] = useState("Ion");
  const [description, setDescription] = useState("My personal Letta agent with memory.");
  const [templateId, setTemplateId] = useState("ion");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTemplate = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  async function handleSubmit() {
    if (!name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Name required",
        message: "Please enter an agent name",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      showToast({ style: Toast.Style.Animated, title: "Creating agent…" });

      const agent = await client.agents.create({
        name: name.trim(),
        description: description.trim() || undefined,
        model: "openai/gpt-4.1",
        embedding: "openai/text-embedding-3-small",
        memoryBlocks: selectedTemplate.memoryBlocks,
        tools: ["web_search"],
      });

      const agentId = (agent as unknown as { id: string }).id;
      const agentName = (agent as unknown as { name: string }).name;

      await setActiveAgentId(agentId);
      await revalidate();

      showToast({
        style: Toast.Style.Success,
        title: "Agent created",
        message: agentName,
      });

      popToRoot();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create agent",
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Create Letta Agent"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Agent" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Agent Name"
        placeholder="Enter a name for your agent"
        value={name}
        onChange={setName}
        autoFocus
      />

      <Form.Dropdown id="template" title="Template" value={templateId} onChange={setTemplateId}>
        {TEMPLATES.map((template) => (
          <Form.Dropdown.Item
            key={template.id}
            value={template.id}
            title={template.name}
            icon={
              template.id === "ion"
                ? Icon.Brain
                : template.id === "coder"
                  ? Icon.Code
                  : Icon.Person
            }
          />
        ))}
      </Form.Dropdown>

      <Form.Description title="Template Info" text={selectedTemplate.description} />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description for your agent"
        value={description}
        onChange={setDescription}
      />

      <Form.Separator />

      <Form.Description
        title="Memory Blocks"
        text={`This template includes ${selectedTemplate.memoryBlocks.length} memory blocks: ${selectedTemplate.memoryBlocks.map((b) => b.label).join(", ")}`}
      />
    </Form>
  );
}
