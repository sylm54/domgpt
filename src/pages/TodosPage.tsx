import { ArrowLeft, Calendar, CheckCircle2, ListTodo } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TodoList, TodoListHeader } from "@/components/ui/TodoList";
import { useTodos, useToggleTodo } from "@/data/todos";
import type { TodoWithStatus } from "@/types/user";

export function TodosPage() {
	const navigate = useNavigate();
	const { todos, refetch } = useTodos();
	const toggleTodo = useToggleTodo();
	const [toggling, setToggling] = useState<string | null>(null);

	const handleToggle = async (todo: TodoWithStatus) => {
		if (!todo.id || toggling) return;
		setToggling(todo.id.toString());
		try {
			await toggleTodo(todo);
			refetch();
		} finally {
			setToggling(null);
		}
	};

	const today = new Date().getDay();
	const activeTodos =
		todos?.filter((todo) => {
			if (!todo.weekdays || todo.weekdays.length === 0) return true;
			return todo.weekdays.includes(today);
		}) ?? [];

	const completedCount = activeTodos.filter((t) => t.completed_today).length;
	const totalCount = activeTodos.length;
	const avgCompletionRate =
		totalCount > 0
			? Math.round(
					activeTodos.reduce((sum, t) => sum + t.completion_stats.completion_rate, 0) / totalCount
				)
			: 0;

	return (
		<div className="h-full overflow-auto">
			<div className="px-6 pt-4">
				<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
					<ArrowLeft className="h-4 w-4 mr-1" />
					Back
				</Button>
			</div>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5 }}
				className="relative overflow-hidden border-b border-primary/20"
			>
				<div className="relative px-6 py-12 md:py-16">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.1 }}
						className="max-w-4xl mx-auto text-center"
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full border border-primary/20 text-primary text-sm font-medium"
						>
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
							</span>
							Daily Tasks
						</motion.div>

						<h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">Your Todos</h1>
						<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
							Track your daily habits and tasks.
							<span className="block mt-1 text-primary/80 font-medium">
								Consistency builds progress.
							</span>
						</p>
					</motion.div>
				</div>
			</motion.div>

			<div className="p-6 max-w-4xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.3 }}
					className="space-y-6"
				>
					<div className="grid grid-cols-3 gap-4 mb-6">
						<div className="bg-muted/30 rounded-xl p-4 text-center">
							<div className="flex items-center justify-center mb-2">
								<ListTodo className="w-5 h-5 text-primary" />
							</div>
							<div className="text-2xl font-bold">{totalCount}</div>
							<div className="text-xs text-muted-foreground">Active Today</div>
						</div>
						<div className="bg-muted/30 rounded-xl p-4 text-center">
							<div className="flex items-center justify-center mb-2">
								<CheckCircle2 className="w-5 h-5 text-emerald-500" />
							</div>
							<div className="text-2xl font-bold text-emerald-500">{completedCount}</div>
							<div className="text-xs text-muted-foreground">Completed</div>
						</div>
						<div className="bg-muted/30 rounded-xl p-4 text-center">
							<div className="flex items-center justify-center mb-2">
								<Calendar className="w-5 h-5 text-violet-500" />
							</div>
							<div className="text-2xl font-bold text-violet-500">{avgCompletionRate}%</div>
							<div className="text-xs text-muted-foreground">Avg Rate</div>
						</div>
					</div>

					<div className="bg-card border rounded-xl p-4">
						<TodoListHeader todos={todos} />
						<div className="mt-4">
							<TodoList todos={todos} onToggle={handleToggle} />
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
