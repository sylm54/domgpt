import type { OpenRouter } from "@openrouter/sdk";
import { getEmbedding } from "@/lib/embedding";
import type { Memory } from "@/types/user";
import { useSurreal } from "./surreal";

export function useCreateMemory() {
	const surreal = useSurreal();
	return async (
		content: string,
		importance: number,
		embeddingModel: string,
		openRouter: OpenRouter
	) => {
		// Clip importance to 0-1 (divide by 10 first, then clip)
		const clippedImportance = Math.min(1, Math.max(0, importance / 10));

		// Generate embedding
		const embedding = await getEmbedding(content, embeddingModel, openRouter);

		const newMemory: Memory = {
			content,
			embedding,
			created_at: new Date(),
			last_accessed: new Date(),
			importance: clippedImportance,
		};

		await surreal.insert("memory", newMemory);
		return newMemory;
	};
}

export function useRetrieveMemories() {
	const surreal = useSurreal();
	return async (
		queryEmbedding: number[],
		excludeIds: string[] = [],
		limit: number = 5
	): Promise<Memory[]> => {
		const excludeClause =
			excludeIds.length > 0
				? `AND id NOT IN [${excludeIds.map((id) => `"${id}"`).join(", ")}]`
				: "";

		const result = await surreal.query<[Memory[]]>(
			`SELECT * FROM memory 
       WHERE embedding <|10|> $queryEmbedding
       ${excludeClause}
       ORDER BY (vector::distance::knn(embedding) / importance) + (time::now() - last_accessed) * 0.00001 ASC
       LIMIT $limit`,
			{ queryEmbedding, limit }
		);

		// Update last_accessed for retrieved memories
		for (const memory of result[0] || []) {
			if (memory.id) {
				await surreal.query(`UPDATE $id SET last_accessed = time::now()`, { id: memory.id });
			}
		}

		return result[0] || [];
	};
}

export function useUpdateLastAccessed() {
	const surreal = useSurreal();
	return async (id: string) => {
		await surreal.query(`UPDATE $id SET last_accessed = time::now()`, { id });
	};
}

export function useDeleteMemory() {
	const surreal = useSurreal();
	return async (id: string) => {
		await surreal.query(`DELETE $id`, { id });
	};
}

export function useGetMemories() {
	const surreal = useSurreal();
	return async (page: number = 0, pageSize: number = 20): Promise<Memory[]> => {
		const offset = page * pageSize;
		const memories = await surreal.query<Memory[]>(
			"SELECT * FROM memory ORDER BY created_at DESC LIMIT $pageSize START $offset",
			{ pageSize, offset }
		);
		return memories;
	};
}
