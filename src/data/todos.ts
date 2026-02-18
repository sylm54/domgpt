import { useCallback, useEffect, useState } from "react";
import type { RecordId } from "surrealdb";
import type { Todo, TodoCompletion, TodoWithStatus } from "../types/user";
import { useSurreal } from "./surreal";

function getTodayString(): string {
	return new Date().toISOString().split("T")[0];
}

function isTodoActiveToday(todo: Todo): boolean {
	if (!todo.weekdays || todo.weekdays.length === 0) return true;
	const today = new Date().getDay();
	return todo.weekdays.includes(today);
}

export function useWriteTodo() {
	const surreal = useSurreal();

	return useCallback(
		async (todo: Partial<Todo> & { title: string; content: string }) => {
			const now = new Date();
			if (todo.id) {
				const updated = {
					...todo,
					updated_at: now,
				} as Todo;
				await surreal.upsert(todo.id, updated);
				return updated;
			}
			const newTodo: Todo = {
				title: todo.title,
				content: todo.content,
				weekdays: todo.weekdays,
				created_at: now,
				updated_at: now,
			};
			const [result] = await surreal.insert<Todo>("todos", newTodo);
			return result;
		},
		[surreal]
	);
}

export function useDeleteTodo() {
	const surreal = useSurreal();

	return useCallback(
		async (todoId: RecordId) => {
			await surreal.delete(todoId);
			await surreal.query("DELETE FROM todo_completion WHERE todo_id = $todo_id", {
				todo_id: todoId,
			});
		},
		[surreal]
	);
}

export function useTodos(): {
	todos: TodoWithStatus[] | undefined;
	refetch: () => void;
} {
	const surreal = useSurreal();
	const [todos, setTodos] = useState<TodoWithStatus[] | undefined>(undefined);
	const [refetchCounter, setRefetchCounter] = useState(0);

	useEffect(() => {
		let cancelled = false;
		async function fetchTodos() {
			const today = getTodayString();
			const todayWeekday = new Date().getDay();

			const todosResult = await surreal.query<[Todo[]]>(`
				SELECT * FROM todos ORDER BY created_at ASC
			`);

			const completionsResult = await surreal.query<[TodoCompletion[]]>(`
				SELECT * FROM todo_completion
			`);

			if (cancelled) return;

			const todos = todosResult[0] || [];
			const completions = completionsResult[0] || [];

			const todosWithStatus: TodoWithStatus[] = todos.map((todo) => {
				const todoCompletions = completions.filter(
					(c) => c.todo_id.toString() === todo.id?.toString()
				);

				const todayCompletion = todoCompletions.find((c) => c.date === today);
				const isActiveToday =
					!todo.weekdays || todo.weekdays.length === 0 || todo.weekdays.includes(todayWeekday);

				const completedToday = isActiveToday && todayCompletion?.completed === true;

				const applicableDays = todoCompletions.filter((c) => {
					if (!todo.weekdays || todo.weekdays.length === 0) return true;
					const date = new Date(c.date);
					return todo.weekdays.includes(date.getDay());
				});

				const totalDays = applicableDays.length;
				const completedDays = applicableDays.filter((c) => c.completed).length;
				const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

				return {
					...todo,
					completed_today: completedToday,
					completion_stats: {
						total_days: totalDays,
						completed_days: completedDays,
						completion_rate: completionRate,
					},
				};
			});

			setTodos(todosWithStatus);
		}

		fetchTodos();

		return () => {
			cancelled = true;
		};
	}, [surreal, refetchCounter]);

	const refetch = useCallback(() => {
		setRefetchCounter((c) => c + 1);
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
			const now = new Date();

			if (completion) {
				const updated: TodoCompletion = {
					...completion,
					completed: !completion.completed,
					completed_at: !completion.completed ? now : undefined,
				};
				await surreal.upsert(completion.id!, updated);
				return updated;
			}

			const newCompletion: TodoCompletion = {
				todo_id: todo.id!,
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

	return useCallback(async () => {
		const todosResult = await surreal.query<[Todo[]]>(`SELECT * FROM todos`);
		const completionsResult = await surreal.query<[TodoCompletion[]]>(
			`SELECT * FROM todo_completion`
		);

		const todos = todosResult[0] || [];
		const completions = completionsResult[0] || [];

		const stats = todos.map((todo) => {
			const todoCompletions = completions.filter(
				(c) => c.todo_id.toString() === todo.id?.toString()
			);

			const applicableDays = todoCompletions.filter((c) => {
				if (!todo.weekdays || todo.weekdays.length === 0) return true;
				const date = new Date(c.date);
				return todo.weekdays.includes(date.getDay());
			});

			const totalDays = applicableDays.length;
			const completedDays = applicableDays.filter((c) => c.completed).length;
			const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

			return {
				id: todo.id,
				title: todo.title,
				content: todo.content,
				weekdays: todo.weekdays,
				total_days: totalDays,
				completed_days: completedDays,
				completion_rate: completionRate,
			};
		});

		return stats;
	}, [surreal]);
}
