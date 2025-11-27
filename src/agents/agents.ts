import { increaseMood, decreaseMood, getMood } from "@/lib/mood";
import { getActivityForAgent, logActivity } from "@/pages/activity";
import { affirmmodel, getConfig, model, talkmodel } from "@/config";
import {
  markChallengeReady as markPhaseReady,
  loadPhaseState,
} from "@/lib/phase";
import { backgroundJobs } from "@/lib/backgroundJobs";

import { Agent } from "@/lib/agent";
import {
  Context,
  compactingContext,
  systemContext,
  systemContextMsg,
  systemMessage,
  wrapInteractiveSystem,
} from "@/lib/context";
import { memoryTool } from "@/lib/memory";
import { getAgentPrompt, subAgentsTool, subAgentTool } from "@/lib/subagent";
import { affirm_tools } from "@/pages/affirm/agent";
import { challenge_tools } from "@/pages/challenge/agent";
import { loadProfileData } from "@/pages/profile";
import { profile_tools } from "@/pages/profile/agent";
import { reflection_tools } from "@/pages/reflection/agent";
import { rule_tools } from "@/pages/rule/agent";
import { safe_tools } from "@/pages/safe/agent";
import { inventory_tools } from "@/pages/inventory/agent";
import { ritual_tools } from "@/pages/rituals/agent";
import { voice_tools } from "@/pages/voice/agent";
import { activity_tools } from "@/pages/activity/agent";
import { infotools } from "./info/info-tools";
import { startInterview } from "./interview/interview-types";
import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { OpenRouter } from "@openrouter/sdk";
import type { ChatMessage } from "@/lib/models";
import { tool } from "@/lib/models";
import { z } from "zod";
const config = await getConfig();

const interviewTool = tool({
  name: "interview",
  description:
    "Start an interactive interview session with the user. A dialog will open where you can have a back-and-forth conversation to gather detailed information. Use this when you need to ask follow-up questions or have a more nuanced discussion.",
  schema: {
    message: z
      .string()
      .min(1)
      .describe(
        "Initial message or question to start the interview with. This sets the context for the interview.",
      ),
  },
  call: async ({ message }) => {
    try {
      const result = await startInterview(message);
      return `Interview completed. Summary: ${result}`;
    } catch (error) {
      return `Interview failed or was cancelled: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

export const info_agent = new Agent(
  systemContext(
    config.sysprompts?.info_agent ??
      `
You are an Agent thats tasked with providing information about the subject.
You are communicating with another Agent.
Respond concisely with results/data.
`.trim(),
  ),
  model,
  [...infotools, interviewTool],
);

export const challenge_agent = new Agent(
  systemContext(
    config.sysprompts?.challenge_agent ??
      `
You are an Agent thats tasked with managing Challenges for the User.
Keep the Title concise.
You are communicating with another Agent.
Respond concisely with results/data.
`.trim(),
  ),
  model,
  [...challenge_tools],
);

export const profile_agent = new Agent(
  systemContext(
    config.sysprompts?.profile_agent ??
      `
You are an Agent thats tasked with maintaining and writing a Profile of the User.
Write the Profile description in Markdown.
You are communicating with another user facing Agent.
Respond with an concise Summary of the information.
`.trim(),
  ),
  model,
  [...profile_tools],
);

export const rule_agent = new Agent(
  systemContext(
    config.sysprompts?.rule_agent ??
      `
You are an Agent thats tasked with maintaining a list of Rules for the User.
You are communicating with another user facing Agent.
Respond with an concise Summary of the information.
`.trim(),
  ),
  model,
  [...rule_tools],
);

export const reflection_agent = new Agent(
  systemContext(
    config.sysprompts?.reflection_agent ??
      `
You are an Agent thats tasked with maintaining a list of Reflection Prompts for the User.
You are communicating with another user facing Agent.
Respond with an concise Summary of the information.
`.trim(),
  ),
  model,
  [...reflection_tools],
);

export const safe_agent = new Agent(
  systemContext(
    config.sysprompts?.safe_agent ??
      `
You are an Agent thats tasked with managing a key.
You are communicating with another user facing Agent.
Respond with an concise Summary of the information.
`.trim(),
  ),
  model,
  [...safe_tools],
);

export const inventory_agent = new Agent(
  systemContext(
    config.sysprompts?.inventory_agent ??
      `
You are an Agent thats tasked with managing the Inventory.
You can read and search for items in the inventory.
You are communicating with another user facing Agent.
Respond with an concise Summary of the information.
`.trim(),
  ),
  model,
  [...inventory_tools],
);

export const rituals_agent = new Agent(
  systemContext(
    config.sysprompts?.rituals_agent ??
      `
You are an Agent thats tasked with managing Rituals for the User.
You can add, remove, and check the status of rituals.
You are communicating with another user facing Agent.
Respond with an concise Summary of the information.
`.trim(),
  ),
  model,
  [...ritual_tools],
);

export const voice_agent = new Agent(
  systemContext(
    config.sysprompts?.voice_agent ??
      `
You are an Agent thats tasked with managing Voice Training for the User.
You can add assignments and check scores.
You are communicating with another user facing Agent.
Respond with an concise Summary of the information.
`.trim(),
  ),
  model,
  [...voice_tools],
);

export const activity_agent = new Agent(
  systemContext(
    config.sysprompts?.activity_agent ??
      `
You are an Agent thats tasked with providing Activity data about the User.
You can query the activity log to see what the user has been doing.
You are communicating with another user facing Agent.
Respond with an concise Summary of the information.
`.trim(),
  ),
  model,
  [...activity_tools],
);

const [affirm_mem, affirm_mem_tool] = memoryTool("affirm-memory");
export const affirm_agent = new Agent(
  systemContextMsg(
    wrapInteractiveSystem(
      (inner) => [
        {
          type: "text",
          text:
            config.sysprompts?.affirm_agent ??
            // fallback to a short TTS/affirmation system prompt if not present
            `
You are an Agent thats tasked with generating or managing audio/affirmation content for the user.
Be concise and friendly.
      `.trim(),
        },
        ...inner,
      ],
      affirm_mem,
    ),
  ),
  model,
  [
    ...affirm_tools,
    affirm_mem_tool,
    interviewTool,
    // Use configured agent name for the info sub-agent when available
    subAgentTool(
      config.agent_names?.info_agent ?? "info",
      config.agent_descriptions?.info_agent ?? "Get Info about the subject",
      info_agent,
    ),
  ],
);

const sub_agents = [
  {
    name: config.agent_names?.challenge_agent ?? "challenge",
    description:
      config.agent_descriptions?.challenge_agent ??
      "Agent that manages challenges. Can add and remove challenges.",
    agent: challenge_agent,
  },
  {
    name: config.agent_names?.profile_agent ?? "profile",
    description:
      config.agent_descriptions?.profile_agent ??
      "Agent that manages profiles. Can change the Profile Title and Description and add and query Achievements.",
    agent: profile_agent,
  },
  {
    name: config.agent_names?.rule_agent ?? "rule",
    description:
      config.agent_descriptions?.rule_agent ??
      "Agent that manages rules. Can add,read,edit and delete rules.",
    agent: rule_agent,
  },
  {
    name: config.agent_names?.reflection_agent ?? "reflection",
    description:
      config.agent_descriptions?.reflection_agent ??
      "Agent that manages reflection prompts of the subject. Can add,read,edit and delete reflection prompts. Also can read recent reflection entries of the subject.",
    agent: reflection_agent,
  },
  {
    name: config.agent_names?.safe_agent ?? "safe",
    description:
      config.agent_descriptions?.safe_agent ??
      "Agent that can check if the key of the subject is locked and how long it has been locked. Can also unlock the key.",
    agent: safe_agent,
  },
  {
    name: config.agent_names?.affirm_agent ?? "audio",
    description:
      config.agent_descriptions?.affirm_agent ??
      "Agent that can generate Audio files.",
    agent: affirm_agent,
  },
  {
    name: config.agent_names?.inventory_agent ?? "inventory",
    description:
      config.agent_descriptions?.inventory_agent ??
      "Agent that manages inventory. Can read and search items.",
    agent: inventory_agent,
  },
  {
    name: config.agent_names?.rituals_agent ?? "rituals",
    description:
      config.agent_descriptions?.rituals_agent ??
      "Agent that manages rituals. Can add, remove, and check status of rituals.",
    agent: rituals_agent,
  },
  {
    name: config.agent_names?.voice_agent ?? "voice",
    description:
      config.agent_descriptions?.voice_agent ??
      "Agent that manages voice training. Can add assignments and check scores.",
    agent: voice_agent,
  },
  {
    name: config.agent_names?.activity_agent ?? "activity",
    description:
      config.agent_descriptions?.activity_agent ??
      "Agent that can query user activity logs. Can see what the user has been doing, including challenges completed, rituals done, reflections saved, and more.",
    agent: activity_agent,
  },
];

export const main_agent = new Agent(new Context(), talkmodel, [
  subAgentsTool([...sub_agents]),
  {
    name: "increaseMood",
    description: "Increase the mood. Returns the new mood level.",
    schema: {},
    call: async () => {
      const newMood = increaseMood();
      logActivity(
        "mood_increased",
        "Mood increased",
        `New mood level: ${newMood}`,
        { newMood },
      );
      return `Mood increased to ${newMood}`;
    },
  },
  {
    name: "decreaseMood",
    description: "Decrease the mood. Returns the new mood level.",
    schema: {},
    call: async () => {
      const newMood = decreaseMood();
      logActivity(
        "mood_decreased",
        "Mood decreased",
        `New mood level: ${newMood}`,
        { newMood },
      );
      return `Mood decreased to ${newMood}`;
    },
  },
]);
main_agent.context.listen((that) => {});

let init = false;
export function isInitialized() {
  return init;
}
function getPhaseContextPrompt(): string {
  const phases = config.phases || [];
  const state = loadPhaseState();
  const currentIndex = state.currentPhaseIndex;

  if (phases.length === 0) return "";

  const currentPhase = phases[currentIndex];
  const nextPhase = phases[currentIndex + 1];

  if (!currentPhase) return "";

  let context = `\n\n## Current Phase Context\n`;
  context += `Phase: ${currentPhase.title}\n`;
  context += `Agent Instructions: ${currentPhase.agent_prompt}\n`;
  context += `Challenge Ready: ${state.challengeReady}\n`;

  if (nextPhase) {
    context += `\nNext Phase: ${nextPhase.title}`;
  }

  return context;
}

const [planner_mem, planner_mem_tool] = memoryTool("planner-memory");
const planner_agent = new Agent(
  systemContextMsg(
    wrapInteractiveSystem(
      (wrap) => [
        {
          type: "text",
          text:
            config.sysprompts?.planner_agent ??
            `
      You are an Agent thats tasked with planning for the user.
      You can add assignments and check scores.
      You are communicating with another user facing Agent.
      Respond with an concise Summary of the information.
      `.trim(),
        },
        ...wrap,
      ],
      planner_mem,
    ),
  ),
  model,
  [
    subAgentTool(
      config.agent_names?.info_agent ?? "info",
      config.agent_descriptions?.info_agent ?? "Get Info about the subject",
      info_agent,
    ),
    planner_mem_tool,
    {
      name: "markChallengeReady",
      description:
        "Mark the user as ready for the current phase's graduation challenge. Use this when you determine the user has adequately progressed in their current phase.",
      schema: {},
      call: async () => {
        markPhaseReady();
        return "User marked as ready for the challenge. They can now complete it to advance to the next phase.";
      },
    },
  ],
);

export async function initMainAgent(router: OpenRouter) {
  if (init) return;
  console.log("initMainAgent");

  backgroundJobs.startJob("agent-init", "Initializing agents...", 0);

  model.setRouter(router);
  affirmmodel.setRouter(router);
  talkmodel.setRouter(router);
  const past_plan = localStorage.getItem("plan");
  const past_context: ChatMessage[] | null = JSON.parse(
    localStorage.getItem(`main-context`) || "null",
  );
  main_agent.context.listen((that) => {
    localStorage.setItem(`main-context`, JSON.stringify(that.conversation));
  });
  let plan: string | null = localStorage.getItem("plan");
  if (!past_plan || (past_context?.length ?? 0) > 0) {
    backgroundJobs.updateJob("agent-init", "Creating plan...", 30);
    await planner_agent.act(
      {
        type: "user",
        content: [
          {
            type: "text",
            text: `
Current Phase:
${getPhaseContextPrompt()}
Current Mood:
${getMood()}
Recent Activity:
${getActivityForAgent()}
Last Session Plan:
${past_plan ?? "First Session"}
Last Session Context:
${
  past_context
    ?.map(
      (m) =>
        m.type +
        ":\n" +
        m.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n"),
    )
    .join("\n") ?? "No Context"
}
        `.trim(),
          },
        ],
      },
      {
        workflow_name: "Planner",
      },
    );
    plan = planner_agent.context.conversation[
      planner_agent.context.conversation.length - 1
    ].content
      .filter((m) => m.type === "text")
      .map((m) => m.text)
      .join("\n");
    planner_agent.context.conversation = [];
  }

  backgroundJobs.updateJob("agent-init", "Finalizing setup...", 70);

  if (plan) {
    localStorage.setItem("plan", plan);
  }

  main_agent.context.system = [
    {
      type: "system",
      content: [
        {
          type: "text",
          text: [
            // Use the configured main system prompt if available, otherwise a simple fallback
            config.main_system_prompt ?? "You are the main coordinating agent.",
            `# Current Plan:`,
            plan,
          ]
            .join("\n")
            .trim(),
        },
      ],
    },
  ];
  init = true;

  backgroundJobs.endJob("agent-init");
}

export type Event = {
  category: string;
  message: string;
};

const events: Event[] = [];

export async function pushEvent(event: Event) {
  events.push(event);
}

export async function actEvents() {
  if (events.length === 0) return;
  const local_events = [...events];
  events.length = 0;
  await main_agent.act({
    type: "event",
    content: [
      {
        type: "text",
        text:
          "Got events:\n" +
          local_events
            .map((e) => `Event: ${e.category}\n${e.message}`)
            .join("\n")
            .trim(),
      },
    ],
  });
}
