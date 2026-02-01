import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import type * as React from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
	title: string;
	value: string | number;
	trend?: {
		value: number;
		direction?: "up" | "down" | "neutral";
	};
	icon?: React.ReactNode;
	className?: string;
	size?: "default" | "compact";
}

export function StatsCard({
	title,
	value,
	trend,
	icon,
	className,
	size = "default",
}: StatsCardProps) {
	const getTrendIcon = () => {
		if (!trend) return null;
		switch (trend.direction) {
			case "up":
				return <TrendingUp className="w-3.5 h-3.5" />;
			case "down":
				return <TrendingDown className="w-3.5 h-3.5" />;
			default:
				return <Minus className="w-3.5 h-3.5" />;
		}
	};

	const getTrendStyles = () => {
		if (!trend) return { text: "", bg: "", border: "" };
		switch (trend.direction) {
			case "up":
				return {
					text: "text-emerald-400",
					bg: "bg-emerald-500/10",
					border: "border-emerald-500/20",
				};
			case "down":
				return {
					text: "text-rose-400",
					bg: "bg-rose-500/10",
					border: "border-rose-500/20",
				};
			default:
				return {
					text: "text-muted-foreground",
					bg: "bg-muted/50",
					border: "border-muted",
				};
		}
	};

	const trendStyles = getTrendStyles();

	return (
		<motion.div
			whileHover={{ scale: 1.02, y: -2 }}
			transition={{ type: "spring", stiffness: 400, damping: 25 }}
			className={cn(
				"group relative overflow-hidden rounded-2xl border border-pink-500/20 bg-card shadow-elevated",
				size === "compact" ? "p-4" : "p-6",
				// Glow effect on border
				"before:absolute before:inset-0 before:rounded-2xl before:p-[1px]",
				"before:bg-gradient-to-br before:from-pink-500/40 before:via-magenta-500/20 before:to-fuchsia-500/30",
				"before:opacity-0 before:transition-opacity before:duration-500",
				"hover:before:opacity-100",
				"hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)]",
				"transition-shadow duration-500",
				className
			)}
		>
			{/* Animated gradient background */}
			<div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-fuchsia-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
			<div className="absolute inset-0 bg-gradient-to-tr from-transparent via-magenta-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

			{/* Decorative corner accents */}
			<div className="absolute top-0 left-0 w-12 h-12 pointer-events-none">
				<div className="absolute top-0 left-0 w-8 h-[2px] bg-gradient-to-r from-pink-500/60 to-transparent" />
				<div className="absolute top-0 left-0 h-8 w-[2px] bg-gradient-to-b from-pink-500/60 to-transparent" />
			</div>
			<div className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none">
				<div className="absolute bottom-0 right-0 w-8 h-[2px] bg-gradient-to-l from-fuchsia-500/60 to-transparent" />
				<div className="absolute bottom-0 right-0 h-8 w-[2px] bg-gradient-to-t from-fuchsia-500/60 to-transparent" />
			</div>

			{/* Decorative top-right gradient blob */}
			<div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-bl from-pink-500/15 via-magenta-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:from-pink-500/25 group-hover:via-magenta-500/15 transition-all duration-500" />

			{/* Animated accent line at bottom */}
			<motion.div
				className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-pink-500 via-magenta-500 to-fuchsia-500"
				initial={{ width: "0%" }}
				whileInView={{ width: "100%" }}
				transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
			/>

			{/* Content */}
			<div className="relative z-10">
				<div className="flex items-start justify-between">
					<div className={cn(size === "compact" ? "space-y-2" : "space-y-3")}>
						{/* Icon and Title Row */}
						<div className="flex items-center gap-3">
							{icon && (
								<motion.div
									whileHover={{ rotate: [0, -10, 10, 0] }}
									transition={{ duration: 0.5 }}
									className={cn(
										"relative flex items-center justify-center rounded-xl",
										"bg-gradient-to-br from-pink-500/20 via-magenta-500/15 to-fuchsia-500/20",
										"border border-pink-500/20",
										"text-pink-400 group-hover:text-pink-300",
										"shadow-[0_0_15px_-3px_rgba(236,72,153,0.3)]",
										"group-hover:shadow-[0_0_20px_-3px_rgba(236,72,153,0.5)]",
										"transition-all duration-300",
										size === "compact" ? "p-2" : "p-2.5"
									)}
								>
									{/* Icon glow effect */}
									<div className="absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
									<span className="relative">{icon}</span>
								</motion.div>
							)}
							<p
								className={cn(
									"font-medium text-muted-foreground tracking-wide uppercase",
									size === "compact" ? "text-[10px]" : "text-xs"
								)}
							>
								{title}
							</p>
						</div>

						{/* Value with animated counter effect */}
						<motion.div
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
							className="relative"
						>
							<p
								className={cn(
									"font-bold text-foreground tracking-tight",
									"bg-gradient-to-br from-foreground via-foreground to-pink-300/80 bg-clip-text",
									"group-hover:from-pink-100 group-hover:via-foreground group-hover:to-fuchsia-200",
									"transition-all duration-500",
									size === "compact" ? "text-3xl" : "text-4xl"
								)}
							>
								{value}
							</p>
							{/* Subtle underline accent */}
							<div className="absolute -bottom-1 left-0 w-1/3 h-[1px] bg-gradient-to-r from-pink-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						</motion.div>

						{/* Trend indicator with refined styling */}
						{trend && (
							<motion.div
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.3, delay: 0.25 }}
								className={cn(
									"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
									"border backdrop-blur-sm",
									trendStyles.text,
									trendStyles.bg,
									trendStyles.border
								)}
							>
								<motion.span
									animate={
										trend.direction === "up"
											? { y: [0, -2, 0] }
											: trend.direction === "down"
												? { y: [0, 2, 0] }
												: {}
									}
									transition={{
										duration: 1.5,
										repeat: Number.POSITIVE_INFINITY,
										ease: "easeInOut",
									}}
								>
									{getTrendIcon()}
								</motion.span>
								<span>
									{trend.direction === "neutral" ? "No change" : `${Math.abs(trend.value)}%`}
								</span>
							</motion.div>
						)}
					</div>
				</div>
			</div>
		</motion.div>
	);
}
