export type ChatMessage =
  | {
      type: "assistant";
      content: MessagePart[];
      stats?: {
        intokens?: number;
        outtokens?: number;
      };
    }
  | {
      type: "user";
      content: MessagePart[];
    }
  | {
      type: "system";
      content: MessagePart[];
    }
  | {
      type: "event";
      content: MessagePart[];
    }
  | InteractiveSystemMessage;
export type InteractiveSystemMessage = {
  type: "interactive_system";
  callback: () => MessagePart[];
  content: MessagePart[];
};

export type MessagePart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "thinking";
      text: string;
    }
  | {
      type: "tool";
      id: string;
      tool: string;
      tool_input: string;
      tool_output?: string;
      tool_data?: object;
    };

export type GenerationOptions = {
  /**
   * The maximum number of tokens to generate
   */
  max_tokens?: number;

  /**
   * The maximum number of tokens to generate
   */
  temperature?: number;

  /**
   * The maximum number of tokens to generate
   */
  top_p?: number;

  // /**
  //  * Whether to stream the response
  //  */
  // streaming?: boolean;

  reasoning?: "minimal" | "low" | "medium" | "high";
};

export function tool<
  const TSchema extends Record<
    string,
    {
      parse(input: any): any;
    }
  >,
>({
  name,
  description,
  schema,
  call,
}: {
  name: string;
  description: string;
  schema: TSchema;
  call: (params: {
    [K in keyof TSchema]: TSchema[K] extends {
      parse: (input: any) => infer RReturnType;
    }
      ? RReturnType
      : never;
  }) => any | Promise<any>;
}): Tool {
  return {
    name,
    description,
    schema,
    call,
  };
}

export interface Tool {
  name: string;
  description: string;
  schema: Record<
    string,
    {
      parse(input: any): any;
    }
  >;
  call: (a: any) => any | Promise<any>;
}

export abstract class Model {
  /**
   * Generate a response from chat messages
   * @param messages - Array of chat messages
   * @param options - Optional generation parameters
   * @returns The new chat message from the assistant
   */
  abstract generate(
    messages: ChatMessage[],
    options?: GenerationOptions,
  ): Promise<ChatMessage>;

  /**
   * Perform agent work with tools
   * @param messages - Array of chat messages
   * @param tools - Array of available tools
   * @param options - Optional generation parameters
   * @returns Agent action containing the response and any tool calls
   */
  abstract act(
    messages: ChatMessage[],
    tools: Tool[],
    options?: GenerationOptions,
    onProgress?: (intermediate: ChatMessage) => void,
  ): Promise<ChatMessage>;
}
