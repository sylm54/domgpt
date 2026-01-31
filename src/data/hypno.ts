import { useCallback, useEffect, useState } from "react";
import type { HistoryItem, HypnoFile, UserInfo, UserProfile } from "../types/user";
import { useLiveQuery, useSurreal } from "./surreal";
import { RecordId } from "surrealdb";

export function useSaveHypnoFile() {
	const surreal = useSurreal();

	return useCallback(
		async (hypno: HypnoFile) => {
			if (hypno.id) {
				await surreal.upsert(hypno.id, hypno);
				return;
			}
			await surreal.insert(`hypno`, hypno);
		},
		[surreal]
	);
}

export function useLatestHypnoFile(): HypnoFile | undefined | null {
	const surreal = useSurreal();
	const [hypno, setHypno] = useState<HypnoFile | undefined | null>(undefined);
	console.log("useLatestHypnoFile called", hypno);

	useEffect(() => {
		let cancelled = false;
		console.log("Fetching latest hypno file");
		async function fetchLatestHypno() {
			const result = await surreal.query<[HypnoFile[]]>(
				"SELECT * FROM hypno ORDER BY created_at DESC LIMIT 1"
			);
			console.log("Fetched latest hypno file", result);
			if (!cancelled) {
				const res = result[0]?.[0];
				if (!res) {
					setHypno(null);
					return;
				}
				setHypno(result[0]?.[0]);
			}
		}

		fetchLatestHypno();

		return () => {
			cancelled = true;
		};
	}, [surreal]);
	return hypno;
}

export function useHypnoFileById(id: string): HypnoFile | undefined {
	const surreal = useSurreal();
	const [hypno, setHypno] = useState<HypnoFile | undefined | null>(undefined);

	useEffect(() => {
		let cancelled = false;
		async function fetchHypnoById() {
			const result: HypnoFile = await surreal.select<HypnoFile>(new RecordId("hypno", id));
			if (!cancelled) {
				if (!result) {
					setHypno(null);
					return;
				}
				setHypno(result);
			}
		}

		fetchHypnoById();

		return () => {
			cancelled = true;
		};
	}, [surreal, id]);
	return hypno;
}
