import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface QuickActionButtonProps {
	onClick: () => void;
	title: string;
	description: string;
	variant?: "default" | "outline" | "destructive";
	icon?: React.ReactNode;
	className?: string;
}

export function QuickActionButton({
	onClick,
	title,
	description,
	variant = "outline",
	icon,
	className,
}: QuickActionButtonProps) {
	const getVariantStyles = () => {
		switch (variant) {
			case "default":
				return {
					wrapper: [
						"bg-[var(--primary)]",
						"hover:bg-[var(--primary)]/90",
						"border-[var(--primary)]/30",
						"shadow-[0_0_25px_-5px_rgba(236,72,153,0.4)]",
						"hover:shadow-[0_0_35px_-5px_rgba(236,72,153,0.6)]",
					],
					icon: ["bg-white/20 text-white", "border-white/20", "group-hover:bg-white/30"],
					title: "text-white",
					description: "text-white/70 group-hover:text-white/80",
					arrow: "text-white/60 group-hover:text-white",
				};
			case "destructive":
				return {
					wrapper: [
						"bg-rose-950/50",
						"hover:bg-rose-900/60",
						"border-rose-500/30 hover:border-rose-500/50",
						"shadow-[0_0_20px_-5px_rgba(244,63,94,0.2)]",
						"hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.4)]",
					],
					icon: [
						"bg-rose-500/20 text-rose-400",
						"border-rose-500/30",
						"group-hover:bg-rose-500/30 group-hover:text-rose-300",
					],
					title: "text-rose-100",
					description: "text-rose-300/70 group-hover:text-rose-200/80",
					arrow: "text-rose-400/60 group-hover:text-rose-300",
				};
			default: // outline
				return {
					wrapper: [
						"bg-card/80 backdrop-blur-sm",
						"hover:bg-[var(--primary)]/10",
						"border-[var(--primary)]/20 hover:border-[var(--primary)]/40",
						"shadow-lg",
						"hover:shadow-[0_0_25px_-5px_rgba(236,72,153,0.25)]",
					],
					icon: [
						"bg-[var(--primary)]/15",
						"text-[var(--primary)]",
						"border-[var(--primary)]/20",
						"group-hover:bg-[var(--primary)]/25",
						"group-hover:text-[var(--primary)]/80",
						"group-hover:border-[var(--primary)]/30",
					],
					title: "text-foreground group-hover:text-[var(--primary)]/90",
					description: "text-muted-foreground group-hover:text-muted-foreground/90",
					arrow: "text-[var(--primary)]/50 group-hover:text-[var(--primary)]",
				};
		}
	};

	const styles = getVariantStyles();

	return (
		<motion.button
			onClick={onClick}
			whileHover={{ scale: 1.02, y: -3 }}
			whileTap={{ scale: 0.98 }}
			transition={{ type: "spring", stiffness: 400, damping: 17 }}
			className={cn(
				"group relative w-full overflow-hidden rounded-2xl border p-5 text-left",
				"transition-all duration-500 ease-out",
				...styles.wrapper,
				className
			)}
		>
			{/* Content */}
			<div className="relative z-10 flex items-center gap-4">
				{/* Icon */}
				{icon && (
					<motion.div
						whileHover={{ rotate: [0, -5, 5, 0] }}
						transition={{ duration: 0.4 }}
						className={cn(
							"flex-shrink-0 flex items-center justify-center rounded-xl p-3",
							"border backdrop-blur-sm",
							"shadow-[0_0_15px_-3px_rgba(236,72,153,0.2)]",
							"group-hover:shadow-[0_0_20px_-3px_rgba(236,72,153,0.35)]",
							"transition-all duration-300",
							...styles.icon
						)}
					>
						<span className="relative">{icon}</span>
					</motion.div>
				)}

				{/* Text content */}
				<div className="flex-1 min-w-0">
					<h3
						className={cn(
							"font-semibold text-lg tracking-tight mb-0.5",
							"transition-colors duration-300",
							styles.title
						)}
					>
						{title}
					</h3>
					<p
						className={cn(
							"text-sm leading-relaxed line-clamp-2",
							"transition-colors duration-300",
							styles.description
						)}
					>
						{description}
					</p>
				</div>

				{/* Arrow indicator that slides in on hover */}
				<motion.div
					initial={{ opacity: 0, x: -10 }}
					whileHover={{ scale: 1.1 }}
					className={cn(
						"flex-shrink-0 flex items-center justify-center",
						"w-8 h-8 rounded-full",
						"bg-[var(--primary)]/10",
						"border border-[var(--primary)]/20",
						"opacity-0 group-hover:opacity-100",
						"translate-x-2 group-hover:translate-x-0",
						"transition-all duration-300 ease-out",
						styles.arrow
					)}
				>
					<ArrowRight className="w-4 h-4" />
				</motion.div>
			</div>
		</motion.button>
	);
}
