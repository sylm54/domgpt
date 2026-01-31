import type { UserInfo } from "@/types/user";
import { useSurreal } from "./surreal";

export function useAddInfo() {
	const surreal = useSurreal();
	return async (content: string, tags: string[] = []) => {
		const newInfo: UserInfo = {
			content,
			tags,
			created_at: new Date(),
		};
		await surreal.insert("info", newInfo);
	};
}

export function useGetInfos() {
	const surreal = useSurreal();
	return async (page: number = 0, pageSize: number = 20): Promise<UserInfo[]> => {
		const offset = page * pageSize;
		const infos = await surreal.query<UserInfo[]>(
			"SELECT * FROM info ORDER BY created_at DESC LIMIT $pageSize OFFSET $offset",
			{ pageSize, offset }
		);
		return infos;
	};
}
