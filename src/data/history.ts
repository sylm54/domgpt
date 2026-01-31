import type { HistoryItem } from "@/types/user";
import { useSurreal } from "./surreal";

export function useLogHistoryData() {
	const surreal = useSurreal();
	return async (data: HistoryItem) => {
		await surreal.insert("history", data);
	};
}
