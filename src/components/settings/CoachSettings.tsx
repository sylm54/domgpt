import {
	Brain,
	Check,
	Dumbbell,
	Heart,
	MessageCircle,
	Shield,
	Sparkles,
	Target,
	Users,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/data/settings";
import type { CoachPersonality, CoachTrait } from "@/types/user";
import { personalityDefinitions, traitDefinitions } from "@/data/definitions";

export function CoachSettings() {
	const { settings, updateSettings } = useSettingsStore();

	const selectedTraits = settings.coach_traits || [];

	const handleTraitToggle = (trait: CoachTrait) => {
		const newTraits = selectedTraits.includes(trait)
			? selectedTraits.filter((t) => t !== trait)
			: [...selectedTraits, trait];
		updateSettings({ coach_traits: newTraits });
	};

	const selectedPersonality = settings.coach_personality;

	const handlePersonalitySelect = (personality: CoachPersonality) => {
		updateSettings({ coach_personality: personality });
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground leading-relaxed">
					Select the personality traits that best match how you'd like your Coach to interact with
					you. You can choose multiple traits.
				</p>
			</div>

			{selectedTraits.length > 0 && (
				<div className="flex flex-wrap gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
					{selectedTraits.map((trait) => (
						<Badge
							key={trait}
							variant="default"
							className="text-sm bg-primary/20 text-primary hover:bg-primary/30 border-0"
						>
							{traitDefinitions.find((t) => t.value === trait)?.label}
						</Badge>
					))}
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
				{traitDefinitions.map(({ value, label, description, icon }) => {
					const isSelected = selectedTraits.includes(value);

					return (
						<button
							key={value}
							type="button"
							onClick={() => handleTraitToggle(value)}
							className="relative group text-left p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-background/50 border-border/50 hover:border-border hover:bg-muted/30 hover:shadow-lg hover:border-primary/20 hover:shadow-primary/10"
						>
							{isSelected && (
								<div className="absolute inset-0 rounded-xl bg-primary/5 blur-xl -z-10" />
							)}

							<div className="flex items-start gap-3">
								<div
									className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
										isSelected
											? "bg-primary border-primary"
											: "border-muted-foreground/30 group-hover:border-muted-foreground/50"
									}`}
								>
									{isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<span
											className={`transition-colors duration-200 ${
												isSelected
													? "text-primary"
													: "text-muted-foreground group-hover:text-foreground"
											}`}
										>
											{icon}
										</span>
										<span
											className={`font-medium transition-colors duration-200 ${isSelected ? "text-primary" : "text-foreground"}`}
										>
											{label}
										</span>
									</div>
									<p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
								</div>
							</div>
						</button>
					);
				})}
			</div>

			<div className="space-y-2 pt-4">
				<h3 className="text-sm font-medium">Coach Role</h3>
				<p className="text-sm text-muted-foreground leading-relaxed">
					Choose the primary role your Coach should embody. This defines the fundamental coaching
					dynamic.
				</p>
			</div>

			{selectedPersonality && (
				<div className="flex flex-wrap gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
					<Badge
						variant="default"
						className="text-sm bg-primary/20 text-primary hover:bg-primary/30 border-0"
					>
						{personalityDefinitions.find((p) => p.value === selectedPersonality)?.label}
					</Badge>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
				{personalityDefinitions.map(({ value, label, description, icon }) => {
					const isSelected = selectedPersonality === value;

					return (
						<button
							key={value}
							type="button"
							onClick={() => handlePersonalitySelect(value)}
							className="relative group text-left p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-background/50 border-border/50 hover:border-border hover:bg-muted/30 hover:shadow-lg hover:border-primary/20 hover:shadow-primary/10"
						>
							{isSelected && (
								<div className="absolute inset-0 rounded-xl bg-primary/5 blur-xl -z-10" />
							)}

							<div className="flex items-start gap-3">
								<div
									className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
										isSelected
											? "bg-primary border-primary"
											: "border-muted-foreground/30 group-hover:border-muted-foreground/50"
									}`}
								>
									{isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<span
											className={`transition-colors duration-200 ${
												isSelected
													? "text-primary"
													: "text-muted-foreground group-hover:text-foreground"
											}`}
										>
											{icon}
										</span>
										<span
											className={`font-medium transition-colors duration-200 ${isSelected ? "text-primary" : "text-foreground"}`}
										>
											{label}
										</span>
									</div>
									<p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
