import { useCallback, useEffect, useState } from "react";
import type { Challenge, HistoryItem, HistorySession } from "../types/user";
import { useSurreal } from "./surreal";
import { RecordId } from "surrealdb";

export function useSaveChallenge() {
	const surreal = useSurreal();

	return useCallback(
		async (challenge: Challenge) => {
			if (challenge.id) {
				await surreal.upsert(challenge.id, challenge);
				return challenge;
			}
			const [result] = await surreal.insert<Challenge>("challenges", challenge);
			return result;
		},
		[surreal]
	);
}

export function useActiveChallenges(): Challenge[] | undefined {
	const surreal = useSurreal();
	const [challenges, setChallenges] = useState<Challenge[] | undefined>(undefined);

	useEffect(() => {
		let cancelled = false;
		async function fetchActiveChallenges() {
			const result = await surreal.query<[Challenge[]]>(
				"SELECT * FROM challenges WHERE completed = false ORDER BY created_at ASC"
			);
			if (!cancelled) {
				setChallenges(result[0] || []);
			}
		}

		fetchActiveChallenges();

		return () => {
			cancelled = true;
		};
	}, [surreal]);

	return challenges;
}

export function useCompleteChallenge() {
	const surreal = useSurreal();

	return useCallback(
		async (challenge: Challenge) => {
			// Update the challenge to mark it as completed
			const completedChallenge = {
				...challenge,
				completed: true,
				completed_at: new Date(),
			};
			await surreal.upsert(challenge.id, completedChallenge);

			// Add to history
			const historyItem: HistorySession = {
				id: undefined,
				type: "session",
				session_type: "challenge",
				data: challenge.id || new RecordId("challenges", crypto.randomUUID()),
				debrief: undefined,
				time: new Date(),
			};

			await surreal.insert<HistoryItem>("history", historyItem);

			return completedChallenge;
		},
		[surreal]
	);
}

export function useChallengeById(id: string): Challenge | undefined {
	const surreal = useSurreal();
	const [challenge, setChallenge] = useState<Challenge | undefined>(undefined);

	useEffect(() => {
		let cancelled = false;
		async function fetchChallengeById() {
			const result = await surreal.select<Challenge>(new RecordId("challenges", id));
			if (!cancelled) {
				setChallenge(result);
			}
		}

		fetchChallengeById();

		return () => {
			cancelled = true;
		};
	}, [surreal, id]);

	return challenge;
}
