import { useCallback } from "react";
import type { HistoryItem } from "@/types/user";
import { useSurreal } from "./surreal";
import type { Surreal } from "surrealdb";

export function useLogHistoryData() {
	const surreal = useSurreal();
	const callback = useCallback(
		async (data: HistoryItem) => {
			await surreal.insert("history", data);
		},
		[surreal]
	);
	return callback;
}

export function useGetHistoryData() {
	const surreal = useSurreal();
	const callback = useCallback(
		async (limit: number = 10, offset: number = 0): Promise<HistoryItem[]> => {
			const res = await surreal.query<[HistoryItem[]]>(
				"SELECT * FROM history ORDER BY time DESC LIMIT $limit START $offset",
				{
					limit,
					offset,
				}
			);
			return res[0] || [];
		},
		[surreal]
	);
	return callback;
}

/**
 * Non-hook functions for accessing history data outside React components.
 * These use the global Surreal client singleton.
 */

// Global Surreal client singleton for non-hook access
let globalSurrealClient: Surreal | null = null;

/**
 * Initialize the global Surreal client. Call this from SurrealProvider or during app initialization.
 */
export function initGlobalSurrealClient(client: Surreal) {
	globalSurrealClient = client;
}

/**
 * Log history data using the global Surreal client
 */
export async function logHistoryData(data: HistoryItem): Promise<void> {
	if (!globalSurrealClient) {
		throw new Error("Global Surreal client not initialized. Call initGlobalSurrealClient first.");
	}
	await globalSurrealClient.insert("history", data);
}

/**
 * Get history data using the global Surreal client
 */
export async function getHistoryData(
	limit: number = 10,
	offset: number = 0
): Promise<HistoryItem[]> {
	if (!globalSurrealClient) {
		throw new Error("Global Surreal client not initialized. Call initGlobalSurrealClient first.");
	}
	const res = await globalSurrealClient.query<[HistoryItem[]]>(
		"SELECT * FROM history ORDER BY time DESC LIMIT $limit START $offset",
		{
			limit,
			offset,
		}
	);
	return res[0] || [];
}
