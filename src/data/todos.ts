import { useCallback, useEffect, useState } from "react";

import type { Todo, TodoCompletion, TodoWithStatus } from "../types/user";
import { useSurreal } from "./surreal";
import { useProfileStore } from "./profile";

function getTodayString(): string {
	return new Date().toISOString().split("T")[0];
}

export function useTodos(): {
	todos: TodoWithStatus[] | undefined;
	refetch: () => void;
} {
	const surreal = useSurreal();
	const getProfile = useProfileStore((state) => state.getProfile);
	const [todos, setTodos] = useState<TodoWithStatus[] | undefined>(undefined);
	const [, forceUpdate] = useState({});

	useEffect(() => {
		let cancelled = false;
		async function fetchTodos() {
			const today = getTodayString();
			const todayWeekday = new Date().getDay();

			// Get todos from profile
			const profile = getProfile();
			if (!profile) return;

			const todosFromProfile = profile.data.todos;

			// Get completions from SurrealDB
			const completionsResult = await surreal.query<[TodoCompletion[]]>(`
				SELECT * FROM todo_completion
			`);

			if (cancelled) return;

			const completions = completionsResult[0] || [];

			// Convert profile todos to TodoWithStatus
			const todosWithStatus: TodoWithStatus[] = Object.entries(todosFromProfile).map(
				([id, todoData]) => {
					const todoCompletions = completions.filter((c) => c.todo_id.toString() === id);

					const todayCompletion = todoCompletions.find((c) => c.date === today);
					const isActiveToday =
						!todoData.weekdays ||
						todoData.weekdays.length === 0 ||
						todoData.weekdays.includes(todayWeekday);

					const completedToday = isActiveToday && todayCompletion?.completed === true;

					const applicableDays = todoCompletions.filter((c) => {
						if (!todoData.weekdays || todoData.weekdays.length === 0) return true;
						const date = new Date(c.date);
						return todoData.weekdays.includes(date.getDay());
					});

					const totalDays = applicableDays.length;
					const completedDays = applicableDays.filter((c) => c.completed).length;
					const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

					return {
						id,
						...todoData,
						completed_today: completedToday,
						completion_stats: {
							total_days: totalDays,
							completed_days: completedDays,
							completion_rate: completionRate,
						},
					};
				}
			);

			// Sort by created_at
			todosWithStatus.sort(
				(a, b) => (a.created_at?.getTime() || 0) - (b.created_at?.getTime() || 0)
			);

			setTodos(todosWithStatus);
		}

		fetchTodos();

		return () => {
			cancelled = true;
		};
	}, [surreal, getProfile]);

	const refetch = useCallback(() => {
		forceUpdate({});
	}, []);

	return { todos, refetch };
}

export function useToggleTodo() {
	const surreal = useSurreal();

	return useCallback(
		async (todo: Todo) => {
			const today = getTodayString();

			const [existing] = await surreal.query<TodoCompletion[]>(
				`SELECT * FROM todo_completion WHERE todo_id = $todo_id AND date = $date`,
				{ todo_id: todo.id, date: today }
			);

			const completion = existing[0];
			if (!completion) return;
			const now = new Date();

			if (completion) {
				if (!completion.id) return;
				const updated: TodoCompletion = {
					...completion,
					completed: !completion.completed,
					completed_at: !completion.completed ? now : undefined,
				};
				await surreal.upsert(completion.id, updated);
				return updated;
			}

			if (!todo.id) return;

			const newCompletion: TodoCompletion = {
				todo_id: todo.id,
				date: today,
				completed: true,
				completed_at: now,
			};
			const [result] = await surreal.insert<TodoCompletion>("todo_completion", newCompletion);
			return result;
		},
		[surreal]
	);
}

export function useGetTodoStats() {
	const surreal = useSurreal();
	const getProfile = useProfileStore((state) => state.getProfile);

	return useCallback(async () => {
		const profile = getProfile();
		if (!profile) return [];

		const todosFromProfile = profile.data.todos;

		const completionsResult = await surreal.query<[TodoCompletion[]]>(
			`SELECT * FROM todo_completion`
		);

		const completions = completionsResult[0] || [];

		const stats = Object.entries(todosFromProfile).map(([id, todoData]) => {
			const todoCompletions = completions.filter((c) => c.todo_id.toString() === id);

			const applicableDays = todoCompletions.filter((c) => {
				if (!todoData.weekdays || todoData.weekdays.length === 0) return true;
				const date = new Date(c.date);
				return todoData.weekdays.includes(date.getDay());
			});

			const totalDays = applicableDays.length;
			const completedDays = applicableDays.filter((c) => c.completed).length;
			const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

			return {
				id,
				title: todoData.title,
				content: todoData.content,
				weekdays: todoData.weekdays,
				total_days: totalDays,
				completed_days: completedDays,
				completion_rate: completionRate,
			};
		});

		return stats;
	}, [surreal, getProfile]);
}
