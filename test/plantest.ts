import { ChatMessageInput, LMStudioClient } from "@lmstudio/sdk";
import { goal, goal_short, personality } from "../src/prompts.hidden";
import { LMStudioModel } from "../src/generate";
import {
  Agent,
  ChatMessage,
  ContextProvider,
  Model,
  PlannerAgent,
  SimpleAgent,
  SimpleTaskTreeRunner,
  StaticContextProvider,
  Task,
  ToolProvider,
  WorkerAgent,
} from "../src/agent";
import readline from "node:readline";
import { subjectfile } from "./foo.hidden";
import { WorkerToolProvider } from "../src/agent/agents/treetask/planner-agent";

const client = new LMStudioClient({
  verboseErrorMessages: true,
  baseUrl: "ws://127.0.0.1:1234",
});
//mt2-gen11-gemma-2-9b-i1
//
const modelname = "mistralai/magistral-small-2509";
console.log("Loading model " + modelname);
const model = await client.llm.model(modelname, {
  verbose: true,
});
const agentmodel = new LMStudioModel(model);

const planner = new PlannerAgent(
  agentmodel,
  [],
  [
    new StaticContextProvider(`${personality}`, true),
    // new StaticContext(`${goal}`, true),
    // new StaticContext(
    //   `You have access to various sub-agents, including an information retrieval agent, which can be called upon to gather relevant data about the subject for you. Your role is to break down the main goal into smaller, more manageable subgoals. Before taking any action toward a subgoal, first call your IRA and ask it to provide as much useful information as possible related to that task. Use this gathered information to inform your decisions about which sub-agents or yourself should be responsible for completing each subgoal.`,
    //   true,
    // ),
  ],
);

class ChastHistoryContextProvider extends ContextProvider {
  agent: SimpleAgent;
  context: string;
  contextname: string;
  constructor({
    agent,
    context = "",
    contextname,
  }: {
    agent: SimpleAgent;
    context: string;
    contextname: string;
  }) {
    super();
    this.agent = agent;
    this.context = context;
    this.contextname = contextname;
  }

  async updateContext(history: ChatMessage[]): Promise<void> {
    const messages: string = [
      subjectfile,
      "Conversation History:",
      ...history.map((m) => `${m.role}: ${m.content}`),
      this.contextname + ":",
      this.context,
      "Only output the content of the " +
        this.contextname +
        ". Do not output anything else.",
    ].join("\n");
    const res = await this.agent.act([
      {
        role: "user",
        content: messages,
      },
    ]);
    this.context = res.content;
  }

  enabled = true;
}

class ConversationalAgent extends WorkerAgent {
  onMessage?: (messages: ChatMessage[]) => Promise<void>;
  constructor(
    model: Model,
    toolProviders: ToolProvider[] = [],
    contextProviders: ContextProvider[] = [],
    onMessage?: (messages: ChatMessage[]) => Promise<void>,
  ) {
    super(model, toolProviders, contextProviders);
    this.onMessage = onMessage;
  }

  async execute(task: Task): Promise<void> {
    if (task.agent === "planner") {
      return;
    }
    if (task.status.type !== "PENDING") {
      return;
    }
    const messages: ChatMessage[] = [
      this.buildSystemMessage(),
      {
        role: "user",
        content: [
          `Goal: ${task.goal}`,
          `Input: ${task.input}`,
          "",
          `Your job is to complete the by talking to the subject and report the result using the provided tools:`,
          `- Call the tool 'done' with the output when you have a successful result.`,
          `- Call the tool 'fail' with a reason if you cannot complete the task.`,
          "Only call done or fail after you verified that the task is complete and you have a result.",
        ].join("\n"),
      },
    ];
    const tools = this.getEnabledTools();
    tools.push(...new WorkerToolProvider(task).tools);
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const askQuestion = (question) => {
        return new Promise((resolve: (value: string) => void) => {
          rl.question(question, (answer) => {
            resolve(`${answer}`);
          });
        });
      };
      while (true) {
        const res = await this.model.act(messages, tools);
        if (task.isDone) {
          break;
        }
        console.log(res.content);
        messages.push(res);
        this.onMessage?.(messages);
        messages.push({
          role: "user",
          content: await askQuestion("User: "),
        });
      }
    } catch (err: any) {
      const reason = err?.message ?? String(err);
      task.markAsFailed(`Worker execution error: ${reason}`);
      console.error(`WorkerAgent.execute error for task ${task.id}:`, reason);
    }
  }
}
const subjectcontext = new SubjectFileContextProvider(
  new SimpleAgent(agentmodel),
  subjectfile,
);
let lastmssg = 0;
const talker = new ConversationalAgent(
  agentmodel,
  [],
  [subjectcontext],
  async (messages) => {
    if (messages.length - lastmssg > 5) {
      console.log("Updating subject context");
      await subjectcontext.updateContext(messages);
      lastmssg = messages.length;
    }
  },
);

const info = new WorkerAgent(
  agentmodel,
  [],
  [
    new StaticContextProvider(
      `You are an AI assistant who specializes in searching for and retrieving information from documents containing chatlogs and analysis of a "subject." When presented with a query about this subject, your goal is to find the most relevant and accurate information possible. You should strive to present the information in a clear, concise, and easy-to-understand manner that can be directly consumed by other language models. In addition to providing direct answers, you may also summarize key points, identify patterns or trends, or offer alternative perspectives on the subject.

      When gathering information from the documents, focus on presenting the most relevant facts and figures without needing to provide source links. If multiple sources within the documents provide conflicting information, explain the discrepancies but prioritize presenting the view that is supported by the most evidence. You are not limited to using a single document; feel free to consult multiple documents to ensure the accuracy and completeness of your response.

      Here are some examples of queries you might encounter:
      - What is the subject's name?
      - Where did the subject grow up?
      - Who are the subject's close friends?
      - What are the subject's goals for the future?

      Be as thorough and comprehensive in your responses as possible while keeping the output concise and to the point.`,
      true,
    ),
    subjectcontext,
  ],
);

const taskrunner = new SimpleTaskTreeRunner(
  goal_short,
  goal,
  [
    {
      name: "info",
      worker: info,
      description: "Gather information about the subject",
    },
    {
      name: "talker",
      worker: talker,
      description:
        "Talk to the subject. Can also ask the subject questions in case the info agent does not have enough information.",
    },
  ],
  planner,
  undefined,
  {
    onTaskUpdate: (task) => {
      // console.log(
      //   `\n\n${task.goal}:\nAgent: ${task.agent}\nStatus: ${task.status.type}\nOutput: ${task.output}\n\n`,
      // );
    },
  },
);
console.log("Running task tree");
await taskrunner.run();

console.log("Finish");
