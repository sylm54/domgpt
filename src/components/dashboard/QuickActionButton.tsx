import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
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
	return (
		<motion.div
			whileHover={{ scale: 1.01 }}
			whileTap={{ scale: 0.99 }}
			transition={{ type: "spring", stiffness: 400, damping: 17 }}
		>
			<Button
				onClick={onClick}
				variant={variant}
				className={cn(
					"h-auto py-5 px-4 w-full text-left group relative overflow-hidden shrink",
					"before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
					"before:translate-x-[-100%] before:transition-transform before:duration-700",
					"group-hover:before:translate-x-[100%]",
					className
				)}
			>
				<div className="flex items-start gap-4 relative z-10">
					{icon && (
						<div className="flex-shrink-0 mt-1 text-primary group-hover:text-primary-foreground transition-colors duration-300">
							{icon}
						</div>
					)}
					<div className="flex-1 min-w-0">
						<div className="font-semibold text-lg mb-1 group-hover:transition-colors">{title}</div>
						<div className="text-sm text-muted-foreground leading-relaxed">{description}</div>
					</div>
				</div>
			</Button>
		</motion.div>
	);
}
