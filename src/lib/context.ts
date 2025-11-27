import type {
  ChatMessage,
  InteractiveSystemMessage,
  MessagePart,
  Model,
} from "./models";

export class Context {
  private _system: ChatMessage[];
  private _conversation: ChatMessage[];
  private _in_progress?: ChatMessage;
  private _listeners: Map<number, (that: Context) => void> = new Map();

  constructor() {
    this._system = [];
    this._conversation = [];
    this._in_progress = undefined;
  }

  get system(): readonly ChatMessage[] {
    return this._system;
  }

  set system(value: ChatMessage[]) {
    this._system = value;
    this.notify();
  }

  get conversation(): readonly ChatMessage[] {
    return this._conversation;
  }

  get in_progress(): ChatMessage | undefined {
    return this._in_progress;
  }

  set in_progress(value: ChatMessage | undefined) {
    this._in_progress = value;
    this.notify();
  }

  set conversation(value: ChatMessage[]) {
    this._conversation = value;
    this.notify();
  }

  add_conversation(message: ChatMessage) {
    this._conversation.push(message);
    this.notify();
  }

  listen(callback: (that: Context) => void): () => void {
    let id = 0;
    while (this._listeners.has(id)) {
      id++;
    }
    this._listeners.set(id, callback);
    return () => this._listeners.delete(id);
  }

  notify() {
    for (const listener of this._listeners.values()) {
      listener(this);
    }
  }
}
export function userMessage(text: string): ChatMessage {
  return {
    type: "user",
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

export function assistantMessage(text: string = ""): ChatMessage {
  return {
    type: "assistant",
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

export function systemMessage(content: string): ChatMessage {
  return {
    type: "system",
    content: [
      {
        type: "text",
        text: content.trim(),
      },
    ],
  };
}

export function wrapInteractiveSystem(
  content: (inner: MessagePart[]) => MessagePart[],
  msg: InteractiveSystemMessage,
): ChatMessage {
  return {
    type: "interactive_system",
    callback: () => content(msg.callback()),
    content: [...msg.content],
  };
}

export function systemContext(content: string): Context {
  const context = new Context();
  context.system = [systemMessage(content)];
  return context;
}

export function systemContextMsg(content: ChatMessage): Context {
  const context = new Context();
  context.system = [content];
  return context;
}

export async function compactingContext(
  context: Context,
  key: string,
  model: Model,
  custom_prompt?: string,
): Promise<string | undefined> {
  const pastcontext: ChatMessage[] | null = JSON.parse(
    localStorage.getItem(`${key}-context`) || "null",
  );
  context.listen((that) => {
    localStorage.setItem(`${key}-context`, JSON.stringify(that.conversation));
  });
  if (!pastcontext || pastcontext.length === 0) {
    return;
  }
  const pastsummary = localStorage.getItem(`${key}-summary`);
  let prompt =
    custom_prompt ??
    `
You are a summarizer. You will be given a conversation and a summary of the conversation.
Your task is to generate a concise summary of the current state of the conversation.
Prioritize more recent info and more important info.

Current Summary:
{{PAST_CONTENT}}

Current Conversation:
{{CONVERSATION}}
    `.trim();
  prompt = prompt.replace("{{PAST_CONTENT}}", pastsummary ?? "Empty");
  prompt = prompt.replace(
    "{{CONVERSATION}}",
    pastcontext
      .map(
        (m) =>
          m.type +
          ":\n" +
          m.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join(""),
      )
      .join("\n"),
  );
  const res = await model.generate([
    { type: "user", content: [{ type: "text", text: prompt }] },
  ]);
  const summary = res.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");
  localStorage.setItem(`${key}-summary`, summary);
  return summary;
}
