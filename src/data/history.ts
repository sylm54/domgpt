import type { HistoryItem } from "@/types/user";
import { useSurreal } from "./surreal";
import { useCallback } from "react";

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

export function useGetPromptHistoryData() {
	const getHistory = useGetHistoryData();
	const callback = useCallback(
		async (limit: number = 10): Promise<string> => {
			const res = await getHistory(limit);
			if (res.length === 0) return "No history available.";
			return res
				.map((item) => {
					switch (item.type) {
						case "reflection":
							return `
### Reflection Entry - ${getDaysAgo(item.time)}
Questions:
${item.reflection.questions.map((q) => `- ${q.question}: ${q.answer}`).join("\n")}
            `.trim();
						case "session":
							return `
### Session Entry - ${getDaysAgo(item.time)}
Session Type: ${item.session_type}
${
	item.debrief
		? `
Debrief:
${item.debrief.questions.map((q) => `- ${q.question}: ${q.answer}`).join("\n")}`
		: ""
}
            `.trim();
						default:
							return "";
					}
				})
				.join("\n\n");
		},
		[getHistory]
	);
	return callback;
}

function getDaysAgo(date: Date): string {
	const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
	if (days === 0) {
		const hours = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
		if (hours === 0) return "Less than an hour ago";
		if (hours === 1) return "1 hour ago";
		return `${hours} hours ago`;
	}
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days} days ago`;
	if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
	return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
}
