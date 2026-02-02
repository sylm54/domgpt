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
				"group relative overflow-hidden rounded-2xl border border-pink-500/30 bg-card",
				size === "compact" ? "p-4" : "p-6",
				className
			)}
		>
			{/* Content */}
			<div className="relative z-10">
				<div className="flex items-start justify-between">
					<div className={cn(size === "compact" ? "space-y-2" : "space-y-3")}>
						{/* Icon and Title Row */}
						<div className="flex items-center gap-3">
							{icon && (
								<div
									className={cn(
										"flex items-center justify-center rounded-xl",
										"bg-pink-500/10 border border-pink-500/30",
										"text-pink-500",
										size === "compact" ? "p-2" : "p-2.5"
									)}
								>
									{icon}
								</div>
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

						{/* Value */}
						<motion.div
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
						>
							<p
								className={cn(
									"font-bold text-foreground tracking-tight",
									size === "compact" ? "text-3xl" : "text-4xl"
								)}
							>
								{value}
							</p>
						</motion.div>

						{/* Trend indicator */}
						{trend && (
							<motion.div
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.3, delay: 0.25 }}
								className={cn(
									"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
									"border",
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
