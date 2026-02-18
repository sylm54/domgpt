import { Calendar, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { TodoWithStatus } from "@/types/user";
import { Checkbox } from "./checkbox";
import { useDeleteTodo } from "@/data/todos";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatWeekdays(weekdays: number[] | undefined): string {
	if (!weekdays || weekdays.length === 0) return "Every day";
	if (weekdays.length === 7) return "Every day";
	return weekdays.map((d) => DAY_NAMES[d]).join(", ");
}

interface TodoItemProps {
	todo: TodoWithStatus;
	onToggle: () => void;
}

function TodoItem({ todo, onToggle }: TodoItemProps) {
	const deleteTodo = useDeleteTodo();
	return (
		<motion.div
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 10 }}
			className={cn(
				"flex items-start gap-3 p-3 rounded-lg transition-colors",
				todo.completed_today ? "bg-emerald-500/10" : "bg-muted/30"
			)}
		>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					if (confirm("Delete todo?")) deleteTodo(todo.id);
				}}
				className="text-xs text-red-500 hover:text-red-600"
				aria-label="Delete todo"
			>
				Delete
			</button>
			<Checkbox
				checked={todo.completed_today}
				onCheckedChange={onToggle}
				className="mt-0.5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
			/>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span
						className={cn(
							"font-medium text-sm",
							todo.completed_today && "line-through text-muted-foreground"
						)}
					>
						{todo.title}
					</span>
					{todo.completion_stats.total_days > 0 && (
						<span className="text-xs text-muted-foreground">
							{todo.completion_stats.completion_rate}%
						</span>
					)}
				</div>
				<p
					className={cn(
						"text-xs text-muted-foreground line-clamp-2",
						todo.completed_today && "line-through"
					)}
				>
					{todo.content}
				</p>
				{todo.weekdays && todo.weekdays.length > 0 && todo.weekdays.length < 7 && (
					<div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
						<Calendar className="w-3 h-3" />
						<span>{formatWeekdays(todo.weekdays)}</span>
					</div>
				)}
			</div>
			{todo.completed_today && (
				<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
					<Check className="w-4 h-4" />
				</motion.div>
			)}
		</motion.div>
	);
}

interface TodoListProps {
	todos: TodoWithStatus[] | undefined;
	onToggle: (todo: TodoWithStatus) => void;
}

export function TodoList({ todos, onToggle }: TodoListProps) {
	const today = new Date().getDay();

	const activeTodos = todos?.filter((todo) => {
		if (!todo.weekdays || todo.weekdays.length === 0) return true;
		return todo.weekdays.includes(today);
	});

	if (!activeTodos || activeTodos.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
				<Calendar className="w-8 h-8 mb-2 opacity-50" />
				<p className="text-sm">No todos for today</p>
			</div>
		);
	}

	const completedTodos = activeTodos.filter((t) => t.completed_today);
	const pendingTodos = activeTodos.filter((t) => !t.completed_today);

	return (
		<div className="space-y-2">
			<AnimatePresence mode="popLayout">
				{pendingTodos.map((todo) => (
					<TodoItem key={todo.id?.toString()} todo={todo} onToggle={() => onToggle(todo)} />
				))}
				{completedTodos.map((todo) => (
					<TodoItem key={todo.id?.toString()} todo={todo} onToggle={() => onToggle(todo)} />
				))}
			</AnimatePresence>
		</div>
	);
}

interface TodoListHeaderProps {
	todos: TodoWithStatus[] | undefined;
}

export function TodoListHeader({ todos }: TodoListHeaderProps) {
	const today = new Date().getDay();
	const activeTodos =
		todos?.filter((todo) => {
			if (!todo.weekdays || todo.weekdays.length === 0) return true;
			return todo.weekdays.includes(today);
		}) ?? [];

	const completedCount = activeTodos.filter((t) => t.completed_today).length;
	const totalCount = activeTodos.length;
	const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-sm">Today's Todos</h3>
				<span className="text-xs text-muted-foreground">
					{completedCount}/{totalCount} completed
				</span>
			</div>
			<div className="h-1.5 bg-muted rounded-full overflow-hidden">
				<motion.div
					className="h-full bg-emerald-500 rounded-full"
					initial={{ width: 0 }}
					animate={{ width: `${progressPercent}%` }}
					transition={{ duration: 0.5, ease: "easeOut" }}
				/>
			</div>
		</div>
	);
}
