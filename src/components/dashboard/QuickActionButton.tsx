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
						"bg-gradient-to-br from-pink-500/90 via-magenta-500/90 to-fuchsia-500/90",
						"hover:from-pink-500 hover:via-magenta-500 hover:to-fuchsia-500",
						"border-pink-400/30",
						"shadow-[0_0_25px_-5px_rgba(236,72,153,0.4)]",
						"hover:shadow-[0_0_35px_-5px_rgba(236,72,153,0.6)]",
					],
					icon: ["bg-white/20 text-white", "border-white/20", "group-hover:bg-white/30"],
					title: "text-white",
					description: "text-white/70 group-hover:text-white/80",
					arrow: "text-white/60 group-hover:text-white",
					shimmer: "via-white/25",
				};
			case "destructive":
				return {
					wrapper: [
						"bg-gradient-to-br from-rose-950/50 via-red-950/50 to-rose-950/50",
						"hover:from-rose-900/60 hover:via-red-900/60 hover:to-rose-900/60",
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
					shimmer: "via-rose-400/20",
				};
			default: // outline
				return {
					wrapper: [
						"bg-card/80 backdrop-blur-sm",
						"hover:bg-gradient-to-br hover:from-pink-500/10 hover:via-magenta-500/5 hover:to-fuchsia-500/10",
						"border-pink-500/20 hover:border-pink-500/40",
						"shadow-lg",
						"hover:shadow-[0_0_25px_-5px_rgba(236,72,153,0.25)]",
					],
					icon: [
						"bg-gradient-to-br from-pink-500/15 via-magenta-500/10 to-fuchsia-500/15",
						"text-pink-400",
						"border-pink-500/20",
						"group-hover:from-pink-500/25 group-hover:via-magenta-500/20 group-hover:to-fuchsia-500/25",
						"group-hover:text-pink-300",
						"group-hover:border-pink-500/30",
					],
					title: "text-foreground group-hover:text-pink-50",
					description: "text-muted-foreground group-hover:text-muted-foreground/90",
					arrow: "text-pink-400/50 group-hover:text-pink-400",
					shimmer: "via-pink-400/15",
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
				// Gradient border effect
				"before:absolute before:inset-0 before:rounded-2xl before:p-[1px]",
				"before:bg-gradient-to-br before:from-pink-500/40 before:via-transparent before:to-fuchsia-500/40",
				"before:opacity-0 before:transition-opacity before:duration-500",
				"hover:before:opacity-100",
				...styles.wrapper,
				className
			)}
		>
			{/* Shimmer effect overlay */}
			<div
				className={cn(
					"absolute inset-0 -translate-x-full",
					"bg-gradient-to-r from-transparent to-transparent",
					styles.shimmer,
					"group-hover:translate-x-full transition-transform duration-1000 ease-out",
					"pointer-events-none"
				)}
			/>

			{/* Decorative corner accents */}
			<div className="absolute top-0 left-0 w-10 h-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
				<div className="absolute top-0 left-0 w-6 h-[1.5px] bg-gradient-to-r from-pink-500/70 to-transparent" />
				<div className="absolute top-0 left-0 h-6 w-[1.5px] bg-gradient-to-b from-pink-500/70 to-transparent" />
			</div>
			<div className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
				<div className="absolute bottom-0 right-0 w-6 h-[1.5px] bg-gradient-to-l from-fuchsia-500/70 to-transparent" />
				<div className="absolute bottom-0 right-0 h-6 w-[1.5px] bg-gradient-to-t from-fuchsia-500/70 to-transparent" />
			</div>

			{/* Content */}
			<div className="relative z-10 flex items-center gap-4">
				{/* Icon with gradient background */}
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
						{/* Icon glow */}
						<div className="absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
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
						"bg-gradient-to-br from-pink-500/10 to-fuchsia-500/10",
						"border border-pink-500/20",
						"opacity-0 group-hover:opacity-100",
						"translate-x-2 group-hover:translate-x-0",
						"transition-all duration-300 ease-out",
						styles.arrow
					)}
				>
					<ArrowRight className="w-4 h-4" />
				</motion.div>
			</div>

			{/* Bottom accent line */}
			<motion.div
				className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-pink-500 via-magenta-500 to-fuchsia-500"
				initial={{ width: "0%" }}
				whileHover={{ width: "100%" }}
				transition={{ duration: 0.4, ease: "easeOut" }}
			/>
		</motion.button>
	);
}
