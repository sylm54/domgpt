import type { OpenRouter } from "@openrouter/sdk";
import { getEmbedding } from "@/lib/embedding";
import type { ChatMessage } from "@/lib/models";
import type { Memory } from "@/types/user";
import { useRetrieveMemories } from "./memory";

interface RAGOptions {
	query: string;
	contextMessages: ChatMessage[];
	embeddingModel: string;
	openRouter: OpenRouter;
	limit?: number;
}

interface RAGResult {
	memories: Memory[];
	ragMessage: ChatMessage;
}

export function useRAG() {
	const retrieveMemories = useRetrieveMemories();

	return async (options: RAGOptions): Promise<RAGResult> => {
		const { query, contextMessages, embeddingModel, openRouter, limit = 5 } = options;

		// Extract memory IDs from recent context to exclude duplicates
		const usedMemoryIds = extractMemoryIdsFromContext(contextMessages);

		// HyDE: Generate hypothetical document
		const hypotheticalDoc = await generateHypotheticalDocument(query, embeddingModel, openRouter);

		// Embed the hypothetical document
		const queryEmbedding = await getEmbedding(hypotheticalDoc, embeddingModel, openRouter);

		// Retrieve relevant memories
		const memories = await retrieveMemories(queryEmbedding, usedMemoryIds, limit);

		// Format as RAG user message with title and content
		const ragContent = formatMemoriesAsContent(memories);

		const ragMessage: ChatMessage = {
			type: "user",
			content: [
				{
					type: "text",
					text: ragContent,
				},
			],
		};

		return { memories, ragMessage };
	};
}

function extractMemoryIdsFromContext(messages: ChatMessage[]): string[] {
	const ids: string[] = [];

	for (const msg of messages) {
		if (msg.type === "user") {
			// Check if this is a RAG message (contains memory marker)
			for (const part of msg.content) {
				if (part.type === "text" && part.text.includes("## Relevant Memories")) {
					// Extract memory IDs if present in a structured format
					const idMatch = part.text.match(/\[([a-z0-9:]+)\]/g);
					if (idMatch) {
						ids.push(...idMatch.map((m) => m.slice(1, -1)));
					}
				}
			}
		}
	}

	return ids;
}

async function generateHypotheticalDocument(
	query: string,
	embeddingModel: string,
	openRouter: OpenRouter
): Promise<string> {
	// Generate a hypothetical document that would answer the query
	// This improves retrieval by finding similar content to an ideal answer

	const prompt = `Generate a brief, factual summary or answer that would contain the information needed to respond to this query:
  
Query: ${query}

Generate a concise 2-3 sentence response that would serve as an ideal document for this query.`;

	try {
		// Use OpenRouter to generate the hypothetical document
		// We'll use a simple chat completion here
		const response = await openRouter.chat.send({
			model: embeddingModel.includes("openai") ? "gpt-4o-mini" : embeddingModel,
			messages: [
				{
					role: "system",
					content: "You generate concise, factual summaries for document retrieval.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			maxTokens: 150,
			temperature: 0.3,
		});

		const messageContent = response.choices[0].message.content;
		return typeof messageContent === "string" ? messageContent : query;
	} catch (error) {
		console.error("Failed to generate hypothetical document, using original query:", error);
		return query;
	}
}

function formatMemoriesAsContent(memories: Memory[]): string {
	if (memories.length === 0) {
		return "";
	}

	let content = "## Relevant Memories\n\n";

	for (let i = 0; i < memories.length; i++) {
		const memory = memories[i];
		const memoryId = memory.id ? `[${memory.id}]` : "";
		content += `### Memory ${i + 1} ${memoryId}\n`;
		content += `${memory.content}\n\n`;
	}

	return content;
}
