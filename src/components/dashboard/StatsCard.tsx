import type * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
				return <TrendingUp className="w-4 h-4" />;
			case "down":
				return <TrendingDown className="w-4 h-4" />;
			default:
				return <Minus className="w-4 h-4" />;
		}
	};

	const getTrendColor = () => {
		if (!trend) return "";
		switch (trend.direction) {
			case "up":
				return "text-green-500";
			case "down":
				return "text-red-500";
			default:
				return "text-muted-foreground";
		}
	};

	return (
		<motion.div
			whileHover={{ scale: 1.01 }}
			transition={{ type: "spring", stiffness: 400, damping: 25 }}
			className={cn(
				"relative overflow-hidden rounded-xl border bg-card p-6 shadow-lg",
				size === "compact" ? "p-4" : "",
				className
			)}
		>
			{/* Gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />

			{/* Decorative accent */}
			<div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full pointer-events-none" />

			{/* Content */}
			<div className="relative">
				<div className="flex items-start justify-between">
					<div className={cn(size === "compact" ? "space-y-1" : "space-y-2")}>
						<div className="flex items-center gap-2">
							{icon && <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>}
							<p
								className={cn(
									"text-sm font-medium text-muted-foreground",
									size === "compact" && "text-xs"
								)}
							>
								{title}
							</p>
						</div>
						<motion.p
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0.1 }}
							className={cn("text-3xl font-bold text-foreground", size === "compact" && "text-2xl")}
						>
							{value}
						</motion.p>
						{trend && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.3, delay: 0.2 }}
								className={cn("flex items-center gap-1 text-sm font-medium", getTrendColor())}
							>
								{getTrendIcon()}
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
