import { useCallback, useEffect, useState } from "react";
import { RecordId } from "surrealdb";
import type { SubliminalFile } from "../types/user";
import { useSurreal } from "./surreal";

export function useSaveSubliminalFile() {
	const surreal = useSurreal();

	return useCallback(
		async (subliminal: SubliminalFile) => {
			if (subliminal.id) {
				await surreal.upsert(subliminal.id, subliminal);
				return;
			}
			const sub: SubliminalFile[] = await surreal.insert<SubliminalFile>(`subliminal`, subliminal);
			return sub[0];
		},
		[surreal]
	);
}

export function useLatestSubliminalFile(): SubliminalFile | undefined | null {
	const surreal = useSurreal();
	const [subliminal, setSubliminal] = useState<SubliminalFile | undefined | null>(undefined);

	useEffect(() => {
		let cancelled = false;
		console.log("Fetching latest subliminal file");
		async function fetchLatestSubliminal() {
			const result = await surreal.query<[SubliminalFile[]]>(
				"SELECT * FROM subliminal ORDER BY created_at DESC LIMIT 1"
			);
			console.log("Fetched latest subliminal file", result);
			if (!cancelled) {
				const res = result[0]?.[0];
				if (!res) {
					setSubliminal(null);
					return;
				}
				setSubliminal(result[0]?.[0]);
			}
		}

		fetchLatestSubliminal();

		return () => {
			cancelled = true;
		};
	}, [surreal]);
	return subliminal;
}

export function useSubliminalFileById(id: string): SubliminalFile | undefined {
	const surreal = useSurreal();
	const [subliminal, setSubliminal] = useState<SubliminalFile | undefined | null>(undefined);

	useEffect(() => {
		let cancelled = false;
		async function fetchSubliminalById() {
			const result: SubliminalFile = await surreal.select<SubliminalFile>(
				new RecordId("subliminal", id)
			);
			if (!cancelled) {
				if (!result) {
					setSubliminal(null);
					return;
				}
				setSubliminal(result);
			}
		}

		fetchSubliminalById();

		return () => {
			cancelled = true;
		};
	}, [surreal, id]);
	return subliminal;
}
