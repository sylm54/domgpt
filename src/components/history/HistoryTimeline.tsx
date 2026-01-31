import { motion } from "motion/react";
import { useState } from "react";
import type { HistoryItem } from "@/types/user";
import { Clock, MessageSquare, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryTimelineProps {
	history: HistoryItem[];
	className?: string;
}

interface TimelineItemProps {
	item: HistoryItem;
	index: number;
	isExpanded: boolean;
	onToggle: () => void;
}

function getDaysAgo(date: Date): string {
	const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
	if (days === 0) return "Today";
	if (days === 1) return "Yesterday";
	return `${days} days ago`;
}

function TimelineItem({ item, index, isExpanded, onToggle }: TimelineItemProps) {
	const isSession = item.type === "session";
	const Icon = isSession ? Zap : MessageSquare;
	const colorClass = isSession ? "bg-primary/20 border-primary" : "bg-accent/20 border-accent";
	const textClass = isSession ? "text-primary" : "text-accent-foreground";

	return (
		<motion.div
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.1, duration: 0.4 }}
			className="relative pl-8 pb-8 last:pb-0"
		>
			{/* Timeline connector line */}
			{index !== 0 && (
				<div className="absolute left-[15px] top-0 h-full w-[2px] bg-gradient-to-b from-border to-transparent" />
			)}

			{/* Icon circle */}
			<div
				className={cn(
					"absolute left-0 top-1 h-8 w-8 rounded-full border-2 flex items-center justify-center shadow-lg",
					colorClass
				)}
			>
				<Icon className={cn("h-4 w-4", textClass)} />
			</div>

			{/* Card */}
			<motion.div
				className={cn(
					"rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
					"hover:border-primary/50 group"
				)}
				onClick={onToggle}
				whileHover={{ scale: 1.01 }}
			>
				{/* Header */}
				<div className="flex items-start justify-between mb-2">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-1">
							<h4 className={cn("font-semibold text-sm", textClass)}>
								{isSession ? "Hypnosis Session" : "Reflection"}
							</h4>
							{isSession && (
								<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
									{item.session_type}
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<Clock className="h-3 w-3" />
							<span>{getDaysAgo(item.time)}</span>
						</div>
					</div>
					<div className="text-muted-foreground group-hover:text-primary transition-colors">
						{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
					</div>
				</div>

				{/* Expanded content */}
				<motion.div
					initial={false}
					animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
					transition={{ duration: 0.3 }}
					className="overflow-hidden"
				>
					<div className="pt-3 border-t border-border/50 space-y-3">
						{isSession ? (
							<>
								{item.debrief?.questions.map((q, idx) => (
									<div key={`${item.id?.toString() || index}-debrief-${idx}`} className="space-y-1">
										<p className="text-xs font-medium text-foreground">{q.question}</p>
										<p className="text-xs text-muted-foreground pl-3 border-l-2 border-primary/30">
											{q.type === "rating" ? `${q.answer}/10` : (q.answer as string)}
										</p>
									</div>
								))}
							</>
						) : (
							item.reflection.questions.map((q, idx) => (
								<div
									key={`${item.id?.toString() || index}-reflection-${idx}`}
									className="space-y-1"
								>
									<p className="text-xs font-medium text-foreground">{q.question}</p>
									<p className="text-xs text-muted-foreground pl-3 border-l-2 border-accent/30">
										{q.type === "rating" ? `${q.answer}/10` : (q.answer as string)}
									</p>
								</div>
							))
						)}
					</div>
				</motion.div>
			</motion.div>
		</motion.div>
	);
}

export function HistoryTimeline({ history, className }: HistoryTimelineProps) {
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

	const toggleExpand = (key: string) => {
		setExpandedItems((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(key)) {
				newSet.delete(key);
			} else {
				newSet.add(key);
			}
			return newSet;
		});
	};

	if (history.length === 0) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className={cn("flex flex-col items-center justify-center py-12 text-center", className)}
			>
				<div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
					<Clock className="h-8 w-8 text-muted-foreground" />
				</div>
				<p className="text-sm text-muted-foreground font-medium">No history yet</p>
				<p className="text-xs text-muted-foreground mt-1">
					Start your journey to see your progress here
				</p>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className={cn("space-y-0", className)}
		>
			{history.map((item, index) => {
				const key = item.id?.toString() || `history-${index}`;
				return (
					<TimelineItem
						key={key}
						item={item}
						index={index}
						isExpanded={expandedItems.has(key)}
						onToggle={() => toggleExpand(key)}
					/>
				);
			})}
		</motion.div>
	);
}
