import { ChevronDown, Clock, MessageSquare, Sparkles, Star, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { HistoryItem } from "@/types/user";
import { isLegacyReflection, isSocraticReflection } from "@/types/user";

interface HistoryTimelineProps {
	history: HistoryItem[];
	className?: string;
}

interface TimelineItemProps {
	item: HistoryItem;
	index: number;
	isExpanded: boolean;
	onToggle: () => void;
	isRecent: boolean;
	totalItems: number;
}

function getDaysAgo(date: Date): string {
	const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
	if (days === 0) return "Today";
	if (days === 1) return "Yesterday";
	return `${days} days ago`;
}

function formatTime(date: Date): string {
	return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Rating display component with visual dots
function RatingDisplay({ rating, maxRating = 10 }: { rating: number; maxRating?: number }) {
	const displayDots = 5;
	const normalizedRating = (rating / maxRating) * displayDots;

	return (
		<div className="flex items-center gap-1.5">
			<div className="flex gap-0.5">
				{Array.from({ length: displayDots }).map((_, i) => {
					const filled = i < Math.floor(normalizedRating);
					const partial = i === Math.floor(normalizedRating) && normalizedRating % 1 > 0;
					return (
						<div
							key={`rating-dot-${i}-${rating}`}
							className={cn(
								"w-2 h-2 rounded-full transition-all duration-300",
								filled
									? "bg-pink-400 shadow-[0_0_4px_rgba(236,72,153,0.5)]"
									: partial
										? "bg-pink-400/50"
										: "bg-muted-foreground/20"
							)}
						/>
					);
				})}
			</div>
			<span className="text-xs font-medium text-pink-400">
				{rating}/{maxRating}
			</span>
		</div>
	);
}

function TimelineItem({
	item,
	index,
	isExpanded,
	onToggle,
	isRecent,
	totalItems,
}: TimelineItemProps) {
	const isSession = item.type === "session";
	const Icon = isSession ? Zap : MessageSquare;
	const isLast = index === totalItems - 1;

	return (
		<motion.div
			initial={{ opacity: 0, x: -30, y: 20 }}
			animate={{ opacity: 1, x: 0, y: 0 }}
			transition={{
				delay: index * 0.08,
				duration: 0.5,
				ease: [0.23, 1, 0.32, 1],
			}}
			className="relative pl-12 pb-8 last:pb-0"
		>
			{/* Timeline connector line with gradient and glow */}
			{!isLast && (
				<div className="absolute left-[18px] top-10 h-[calc(100%-2.5rem)] w-[2px]">
					{/* Main gradient line */}
					<div className="absolute inset-0 rounded-full bg-gradient-to-b from-pink-500/80 via-pink-500/40 to-transparent" />
					{/* Animated glow effect */}
					<motion.div
						className="absolute inset-0 rounded-full blur-sm bg-gradient-to-b from-pink-400/60 to-transparent"
						animate={{
							opacity: [0.3, 0.7, 0.3],
						}}
						transition={{
							duration: 2,
							repeat: Infinity,
							ease: "easeInOut",
						}}
					/>
					{/* Dotted overlay for texture */}
					<div
						className="absolute inset-0"
						style={{
							backgroundImage: `repeating-linear-gradient(
								to bottom,
								transparent,
								transparent 4px,
								rgba(255,255,255,0.1) 4px,
								rgba(255,255,255,0.1) 8px
							)`,
						}}
					/>
				</div>
			)}

			{/* Icon circle with gradient background and glow ring */}
			<div className="absolute left-0 top-1">
				{/* Outer glow ring for recent items */}
				{isRecent && (
					<motion.div
						className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-pink-500/30 to-pink-500/30"
						animate={{
							scale: [1, 1.2, 1],
							opacity: [0.5, 0.2, 0.5],
						}}
						transition={{
							duration: 2,
							repeat: Infinity,
							ease: "easeInOut",
						}}
					/>
				)}
				{/* Icon container */}
				<div className="relative h-10 w-10 rounded-full flex items-center justify-center shadow-lg border-2 bg-gradient-to-br from-pink-500 to-pink-600 border-pink-400/50 shadow-pink-500/25">
					<Icon className="h-5 w-5 text-white drop-shadow-sm" />
					{/* Inner shine */}
					<div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/20" />
				</div>
			</div>

			{/* Card with gradient border accent */}
			<motion.div
				className={cn(
					"relative rounded-2xl overflow-hidden cursor-pointer",
					"transition-all duration-300 ease-out",
					"hover:-translate-y-1"
				)}
				onClick={onToggle}
				whileHover={{ scale: 1.01 }}
				whileTap={{ scale: 0.99 }}
			>
				{/* Gradient border */}
				<div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-pink-500/50 via-pink-500/30 to-transparent">
					<div className="absolute inset-[1px] rounded-2xl bg-card" />
				</div>

				{/* Decorative corner element */}
				<div className="absolute top-0 right-0 w-16 h-16 pointer-events-none bg-gradient-to-bl from-pink-500/10 to-transparent" />
				<div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-pink-400/60" />

				{/* Card content */}
				<div className="relative p-4 bg-card/95 backdrop-blur-sm rounded-2xl">
					{/* Header */}
					<div className="flex items-start justify-between mb-3">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-2">
								<h4 className="font-semibold text-sm text-pink-400">
									{isSession ? "Hypnosis Session" : "Reflection"}
								</h4>
								{isSession && item.session_type && (
									<span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-pink-500/20 text-pink-300 border border-pink-500/30">
										{item.session_type}
									</span>
								)}
							</div>
							{/* Time badge */}
							<div
								className={cn(
									"inline-flex items-center gap-1.5 px-2 py-1 rounded-lg",
									"bg-muted/50 border border-border/50"
								)}
							>
								<Clock className="h-3 w-3 text-muted-foreground" />
								<span className="text-xs text-muted-foreground font-medium">
									{getDaysAgo(item.time)}
								</span>
								<span className="text-xs text-muted-foreground/50">•</span>
								<span className="text-xs text-muted-foreground/70">{formatTime(item.time)}</span>
							</div>
							{isSession && item.extra && (
								<p className="mt-2 text-xs text-foreground/90">{item.extra}</p>
							)}
						</div>
						<motion.div
							className="p-1.5 rounded-full transition-colors text-pink-400 group-hover:bg-pink-500/20"
							animate={{ rotate: isExpanded ? 180 : 0 }}
							transition={{ duration: 0.3 }}
						>
							<ChevronDown className="h-4 w-4" />
						</motion.div>
					</div>

					{/* Expanded content with AnimatePresence */}
					<AnimatePresence initial={false}>
						{isExpanded && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
								className="overflow-hidden"
							>
								<div className="pt-4 mt-3 border-t space-y-4 border-pink-500/20">
									{isSession ? (
										<>
											{item.debrief &&
												isLegacyReflection(item.debrief) &&
												item.debrief.questions.map((q, idx) => (
													<motion.div
														key={`${item.id?.toString() || index}-debrief-${idx}`}
														initial={{ opacity: 0, y: 10 }}
														animate={{ opacity: 1, y: 0 }}
														transition={{ delay: idx * 0.05 }}
														className="space-y-2"
													>
														<p className="text-xs font-medium text-foreground/90 flex items-center gap-2">
															<span className="w-1 h-1 rounded-full bg-pink-400" />
															{q.question}
														</p>
														{q.type === "rating" ? (
															<div className="pl-3">
																<RatingDisplay rating={Number(q.answer)} />
															</div>
														) : (
															<div className="pl-4 py-2 rounded-lg bg-gradient-to-r from-pink-500/5 to-transparent border-l-2 border-pink-500/40">
																<p className="text-xs text-muted-foreground italic">
																	"{q.answer as string}"
																</p>
															</div>
														)}
													</motion.div>
												))}
											{item.debrief && isSocraticReflection(item.debrief) && (
												<motion.div
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													className="space-y-3"
												>
													<div className="pl-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500/5 to-transparent border-l-2 border-emerald-500/40">
														<p className="text-xs font-medium text-emerald-600 mb-1">Conducive:</p>
														<p className="text-xs text-muted-foreground">
															{item.debrief.summary.conducive_thoughts.join("; ")}
														</p>
													</div>
													<div className="pl-4 py-2 rounded-lg bg-gradient-to-r from-rose-500/5 to-transparent border-l-2 border-rose-500/40">
														<p className="text-xs font-medium text-rose-600 mb-1">Not Conducive:</p>
														<p className="text-xs text-muted-foreground">
															{item.debrief.summary.not_conducive_thoughts.join("; ")}
														</p>
													</div>
													<div className="pl-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/5 to-transparent border-l-2 border-amber-500/40">
														<p className="text-xs font-medium text-amber-600 mb-1">Key Insights:</p>
														<p className="text-xs text-muted-foreground italic">
															"{item.debrief.summary.key_insights}"
														</p>
													</div>
												</motion.div>
											)}
										</>
									) : (
										<>
											{isLegacyReflection(item.reflection) &&
												item.reflection.questions.map((q, idx) => (
													<motion.div
														key={`${item.id?.toString() || index}-reflection-${idx}`}
														initial={{ opacity: 0, y: 10 }}
														animate={{ opacity: 1, y: 0 }}
														transition={{ delay: idx * 0.05 }}
														className="space-y-2"
													>
														<p className="text-xs font-medium text-foreground/90 flex items-center gap-2">
															<span className="w-1 h-1 rounded-full bg-pink-400" />
															{q.question}
														</p>
														{q.type === "rating" ? (
															<div className="pl-3">
																<RatingDisplay rating={Number(q.answer)} />
															</div>
														) : (
															<div className="pl-4 py-2 rounded-lg bg-gradient-to-r from-pink-500/5 to-transparent border-l-2 border-pink-500/40">
																<p className="text-xs text-muted-foreground italic">
																	"{q.answer as string}"
																</p>
															</div>
														)}
													</motion.div>
												))}
											{isSocraticReflection(item.reflection) && (
												<motion.div
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													className="space-y-3"
												>
													<p className="text-xs text-muted-foreground italic mb-2">
														{item.reflection.summary.conversation_summary}
													</p>
													<div className="pl-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500/5 to-transparent border-l-2 border-emerald-500/40">
														<p className="text-xs font-medium text-emerald-600 mb-1">
															Conducive Thoughts (
															{item.reflection.summary.conducive_thoughts.length})
														</p>
														<p className="text-xs text-muted-foreground">
															{item.reflection.summary.conducive_thoughts.join("; ")}
														</p>
													</div>
													<div className="pl-4 py-2 rounded-lg bg-gradient-to-r from-rose-500/5 to-transparent border-l-2 border-rose-500/40">
														<p className="text-xs font-medium text-rose-600 mb-1">
															Not Conducive ({item.reflection.summary.not_conducive_thoughts.length}
															)
														</p>
														<p className="text-xs text-muted-foreground">
															{item.reflection.summary.not_conducive_thoughts.join("; ")}
														</p>
													</div>
													<div className="pl-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/5 to-transparent border-l-2 border-amber-500/40">
														<p className="text-xs font-medium text-amber-600 mb-1">Key Insights:</p>
														<p className="text-xs text-muted-foreground italic">
															"{item.reflection.summary.key_insights}"
														</p>
													</div>
												</motion.div>
											)}
										</>
									)}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Hover glow effect */}
				<motion.div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100 shadow-[0_8px_30px_-5px_rgba(236,72,153,0.3)]" />
			</motion.div>
		</motion.div>
	);
}

// Empty state decorative element
function EmptyStateDecoration() {
	return (
		<div className="relative w-24 h-24 mb-6">
			{/* Outer ring */}
			<motion.div
				className="absolute inset-0 rounded-full border-2 border-dashed border-pink-500/30"
				animate={{ rotate: 360 }}
				transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
			/>
			{/* Inner glow */}
			<motion.div
				className="absolute inset-4 rounded-full bg-pink-500/20"
				animate={{
					scale: [1, 1.1, 1],
					opacity: [0.5, 0.8, 0.5],
				}}
				transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
			/>
			{/* Center icon */}
			<div className="absolute inset-0 flex items-center justify-center">
				<motion.div
					animate={{
						y: [0, -4, 0],
					}}
					transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
				>
					<Sparkles className="h-8 w-8 text-pink-400" />
				</motion.div>
			</div>
			{/* Floating stars */}
			{["star-top", "star-mid", "star-bottom"].map((starId, i) => (
				<motion.div
					key={starId}
					className="absolute"
					style={{
						top: `${20 + i * 25}%`,
						left: `${i % 2 === 0 ? 85 : -10}%`,
					}}
					animate={{
						y: [0, -8, 0],
						opacity: [0.3, 0.8, 0.3],
					}}
					transition={{
						duration: 2,
						delay: i * 0.3,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				>
					<Star className="h-3 w-3 text-pink-400 fill-pink-400/30" />
				</motion.div>
			))}
		</div>
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
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className={cn("flex flex-col items-center justify-center py-16 text-center", className)}
			>
				<EmptyStateDecoration />

				<motion.h3
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2 }}
					className="text-lg font-semibold text-pink-400 mb-2"
				>
					Your Journey Awaits
				</motion.h3>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="text-sm text-muted-foreground max-w-[200px] mb-4"
				>
					Begin your transformation and watch your progress unfold here
				</motion.p>

				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.4 }}
					className="px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20"
				>
					<p className="text-xs text-pink-400/80 font-medium">✨ Start your first session</p>
				</motion.div>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className={cn("relative", className)}
		>
			{/* Decorative gradient background */}
			<div className="absolute -inset-4 bg-gradient-to-b from-pink-500/5 via-transparent to-pink-500/5 rounded-3xl pointer-events-none" />

			{/* Timeline items */}
			<div className="relative space-y-0">
				{history.map((item, index) => {
					const key = item.id?.toString() || `history-${index}`;
					const isRecent = index < 2; // First two items are considered "recent"
					return (
						<TimelineItem
							key={key}
							item={item}
							index={index}
							isExpanded={expandedItems.has(key)}
							onToggle={() => toggleExpand(key)}
							isRecent={isRecent}
							totalItems={history.length}
						/>
					);
				})}
			</div>
		</motion.div>
	);
}
