import type { OpenRouter } from "@openrouter/sdk";

export async function getEmbedding(
	text: string,
	model: string,
	openRouter: OpenRouter
): Promise<number[]> {
	const res = await openRouter.embeddings.generate({
		model: model,
		input: text,
	});
	// Fix: Extract embedding array from response
	if (typeof res === "string") {
		throw new Error("Unexpected response type: string");
	}
	if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
		throw new Error("No embedding data found in response");
	}
	const embedding = res.data[0].embedding;
	if (!Array.isArray(embedding)) {
		throw new Error("Embedding is not an array of numbers");
	}
	return embedding;
}
