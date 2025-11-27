import { tool } from "@/lib/models";
import { z } from "zod";
import {
  loadInventoryData,
  getAllItems,
  getAllTags,
  getAllKeys,
  advancedSearchItems,
} from "./types";
import { model, getConfig } from "@/config";
import type { ChatMessage } from "@/lib/models";
import { logWorkflow } from "@/agents/debug";

/**
 * Tools for the inventory agent
 */
export const inventory_tools = [
  tool({
    name: "read_inventory",
    description:
      "Read all items in the inventory. Returns items along with all currently used tags and additional data keys.",
    schema: {},
    call: async () => {
      const data = loadInventoryData();
      const items = getAllItems(data);
      const tags = getAllTags(data);
      const keys = getAllKeys(data);

      return {
        items,
        usedTags: tags,
        usedKeys: keys,
        summary: {
          totalItems: items.length,
          totalTags: tags.length,
          totalKeys: keys.length,
        },
      };
    },
  }),
  tool({
    name: "search_inventory",
    description: `Search for items in the inventory with optional filtering.

Supports:
- query: Text search in name, description, and tags
- tags: Filter by tags (items must have all specified tags)
- filter: Expression to filter by additionalData fields

Filter expression syntax:
- Comparison operators: >, <, >=, <=, ==, !=
- Logical operators: && (and), || (or)
- String values should be quoted: foo=="bar"
- Number values should not be quoted: length>14

Examples:
- search_inventory({ query: "chair" })
- search_inventory({ tags: ["furniture", "wood"] })
- search_inventory({ filter: 'length>14&&material=="wood"' })
- search_inventory({ tags: ["furniture"], filter: 'price<100' })`,
    schema: {
      query: z.string().optional().describe("Text search query"),
      tags: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe(
          "Tag or array of tags to filter by (items must have all specified tags)",
        ),
      filter: z
        .string()
        .optional()
        .describe(
          "Filter expression for additionalData fields, e.g., 'length>14&&foo==\"bar\"'",
        ),
    },
    call: async ({ query, tags, filter }) => {
      const data = loadInventoryData();

      // Normalize tags to array
      let tagsArray: string[] | undefined;
      if (tags) {
        tagsArray = typeof tags === "string" ? [tags] : tags;
      }

      const results = advancedSearchItems(data, {
        query,
        tags: tagsArray,
        filter,
      });

      return {
        results,
        count: results.length,
        searchParams: {
          query,
          tags: tagsArray,
          filter,
        },
      };
    },
  }),
];

/**
 * Generate tags for an item using the configured model
 * Now includes information about existing tags and keys used in the inventory
 */
export async function generateTags(
  name: string,
  description: string,
  existingTags: string[],
  existingKeys: string[],
): Promise<string[]> {
  const config = await getConfig();

  const systemPrompt =
    config.sysprompts?.tag_agent ??
    `You are a tagging agent. Generate relevant tags for the item based on its name and description.
You should be aware of the existing tags and keys used in the inventory to maintain consistency.
Return only the tags as a comma-separated list.`;

  const keyContext =
    existingKeys.length > 0
      ? `\nExisting Keys in Inventory: ${existingKeys.join(", ")}`
      : "";

  const messages: ChatMessage[] = [
    {
      type: "system",
      content: [{ type: "text", text: systemPrompt }],
    },
    {
      type: "user",
      content: [
        {
          type: "text",
          text: `Item Name: ${name}
Item Description: ${description}
Existing Tags: ${existingTags.length > 0 ? existingTags.join(", ") : "(none)"}${keyContext}

Generate 3-5 relevant tags for this item. If existing tags are relevant, you can reuse them for consistency. Return ONLY a comma-separated list of tags.`,
        },
      ],
    },
  ];

  try {
    const response = await model.generate(messages);
    const content = response.content.find((p) => p.type === "text");
    logWorkflow({
      name: "TagGenerator",
      system: systemPrompt,
      input: messages
        .flatMap((m) => m.content)
        .filter((m) => m.type === "text")
        .map((m) => m.text)
        .join("\n"),
      output: response.content
        .filter((m) => m.type === "text")
        .map((m) => m.text)
        .join("\n"),
      tools: [],
    });
    if (content && content.type === "text") {
      // Split by comma and clean up
      return content.text
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }
    return [];
  } catch (error) {
    console.error("Failed to generate tags:", error);
    return [];
  }
}
