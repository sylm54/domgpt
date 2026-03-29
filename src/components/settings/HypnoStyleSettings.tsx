import {
	Crown,
	Eye,
	HandHelping,
	Sparkles,
	Activity,
	Wind,
	Brain,
	Wand2,
	Check,
	Loader2,
	Play,
	RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Local type definitions since they were removed from @/types/user in the refactor
type HypnoStyle = "authoritarian" | "balanced" | "permissive";

type InductionType = "progressive_relaxation" | "visualization" | "breathing";

type SensoryType = "visual" | "kinesthetic" | "mixed";

type SuggestionType = "direct" | "indirect" | "permissive";

type HypnoStyleConfig = {
	style: HypnoStyle;
	induction_types: InductionType[];
	sensory: SensoryType;
	suggestion: SuggestionType;
};

const styleOptions: {
	value: HypnoStyle;
	label: string;
	description: string;
	icon: React.ReactNode;
}[] = [
	{
		value: "authoritarian",
		label: "Authoritarian",
		description: "Direct commands and firm guidance",
		icon: <Crown className="w-4 h-4" />,
	},
	{
		value: "balanced",
		label: "Balanced",
		description: "Mix of guidance and permissiveness",
		icon: <HandHelping className="w-4 h-4" />,
	},
	{
		value: "permissive",
		label: "Permissive",
		description: "Gentle suggestions and choice",
		icon: <Sparkles className="w-4 h-4" />,
	},
];

const inductionOptions: {
	value: InductionType;
	label: string;
	description: string;
	icon: React.ReactNode;
}[] = [
	{
		value: "progressive_relaxation",
		label: "Progressive Relaxation",
		description: "Systematic muscle relaxation",
		icon: <Activity className="w-4 h-4" />,
	},
	{
		value: "visualization",
		label: "Visualization",
		description: "Guided imagery and scenes",
		icon: <Eye className="w-4 h-4" />,
	},
	{
		value: "breathing",
		label: "Breathing",
		description: "Focus on breath patterns",
		icon: <Wind className="w-4 h-4" />,
	},
];

const sensoryOptions: {
	value: SensoryType;
	label: string;
	description: string;
	icon: React.ReactNode;
}[] = [
	{
		value: "visual",
		label: "Visual",
		description: "Focus on seeing and imagery",
		icon: <Eye className="w-4 h-4" />,
	},
	{
		value: "kinesthetic",
		label: "Kinesthetic",
		description: "Focus on feeling and sensation",
		icon: <HandHelping className="w-4 h-4" />,
	},
	{
		value: "mixed",
		label: "Mixed",
		description: "Blend of all senses",
		icon: <Brain className="w-4 h-4" />,
	},
];

const suggestionOptions: {
	value: SuggestionType;
	label: string;
	description: string;
	icon: React.ReactNode;
}[] = [
	{
		value: "direct",
		label: "Direct",
		description: "Clear, explicit suggestions",
		icon: <Crown className="w-4 h-4" />,
	},
	{
		value: "indirect",
		label: "Indirect",
		description: "Embedded in stories and metaphors",
		icon: <Wand2 className="w-4 h-4" />,
	},
	{
		value: "permissive",
		label: "Permissive",
		description: "Suggestions as possibilities",
		icon: <Sparkles className="w-4 h-4" />,
	},
];

const defaultHypnoStyle: HypnoStyleConfig = {
	style: "balanced",
	induction_types: ["progressive_relaxation", "visualization", "breathing"],
	sensory: "mixed",
	suggestion: "direct",
};

interface HypnoStyleSettingsProps {
	isOnboarding?: boolean;
}

export function HypnoStyleSettings({ isOnboarding = false }: HypnoStyleSettingsProps) {
	// Use local state since hypno_style was removed from AppSettings in the refactor
	const [hypnoStyle, setHypnoStyle] = useState<HypnoStyleConfig>(defaultHypnoStyle);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedScript, setGeneratedScript] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const updateHypnoStyle = (updates: Partial<HypnoStyleConfig>) => {
		setHypnoStyle((prev) => ({
			...prev,
			...updates,
		}));
	};

	const handleInductionToggle = (induction: InductionType) => {
		const current = hypnoStyle.induction_types;
		const newInductions = current.includes(induction)
			? current.filter((i) => i !== induction)
			: [...current, induction];
		updateHypnoStyle({ induction_types: newInductions });
	};

	const generateExampleScript = async () => {
		setIsGenerating(true);
		setError(null);
		setGeneratedScript(null);

		// Test generation functionality removed in refactor - HypnoWriterAgent and getHypnoWriterPrompt no longer exist
		setTimeout(() => {
			setError(
				"This feature is currently unavailable. The hypnosis script generation has been refactored."
			);
			setIsGenerating(false);
		}, 1000);
	};

	return (
		<div className="space-y-6">
			{/* Style Selection */}
			<div className="space-y-3">
				<Label className="text-base font-medium">Hypno Style</Label>
				<p className="text-sm text-muted-foreground">
					Choose the overall tone and approach for your hypnosis sessions
				</p>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					{styleOptions.map((option) => {
						const isSelected = hypnoStyle.style === option.value;
						return (
							<button
								key={option.value}
								type="button"
								onClick={() => updateHypnoStyle({ style: option.value })}
								className={cn(
									"relative group text-left p-4 rounded-xl border-2 transition-all duration-200",
									"hover:-translate-y-0.5 hover:shadow-lg",
									isSelected
										? "bg-primary/10 border-primary"
										: "bg-background/50 border-border/50 hover:border-border hover:bg-muted/30"
								)}
							>
								<div className="flex items-start gap-3">
									<div
										className={cn(
											"mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
											"transition-all duration-200",
											isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
										)}
									>
										{isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<span className={isSelected ? "text-primary" : "text-muted-foreground"}>
												{option.icon}
											</span>
											<span
												className={cn(
													"font-medium transition-colors duration-200",
													isSelected ? "text-primary" : "text-foreground"
												)}
											>
												{option.label}
											</span>
										</div>
										<p className="text-xs text-muted-foreground leading-relaxed">
											{option.description}
										</p>
									</div>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Induction Types */}
			<div className="space-y-3">
				<Label className="text-base font-medium">Induction Types</Label>
				<p className="text-sm text-muted-foreground">
					Select which induction techniques should be used in your sessions
				</p>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					{inductionOptions.map((option) => {
						const isSelected = hypnoStyle.induction_types.includes(option.value);
						return (
							<button
								key={option.value}
								type="button"
								onClick={() => handleInductionToggle(option.value)}
								className={cn(
									"relative group text-left p-4 rounded-xl border-2 transition-all duration-200",
									"hover:-translate-y-0.5 hover:shadow-lg",
									isSelected
										? "bg-primary/10 border-primary"
										: "bg-background/50 border-border/50 hover:border-border hover:bg-muted/30"
								)}
							>
								<div className="flex items-start gap-3">
									<div
										className={cn(
											"mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0",
											"transition-all duration-200",
											isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
										)}
									>
										{isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<span className={isSelected ? "text-primary" : "text-muted-foreground"}>
												{option.icon}
											</span>
											<span
												className={cn(
													"font-medium transition-colors duration-200",
													isSelected ? "text-primary" : "text-foreground"
												)}
											>
												{option.label}
											</span>
										</div>
										<p className="text-xs text-muted-foreground leading-relaxed">
											{option.description}
										</p>
									</div>
								</div>
							</button>
						);
					})}
				</div>
				{hypnoStyle.induction_types.length === 0 && (
					<p className="text-sm text-destructive">Please select at least one induction type</p>
				)}
			</div>

			{/* Sensory Mode */}
			<div className="space-y-3">
				<Label className="text-base font-medium">Sensory Focus</Label>
				<p className="text-sm text-muted-foreground">
					Choose the primary sensory modality for suggestions
				</p>
				<Select
					value={hypnoStyle.sensory}
					onValueChange={(value) => updateHypnoStyle({ sensory: value as SensoryType })}
				>
					<SelectTrigger className="h-11 bg-background/50 border-border/50">
						<SelectValue placeholder="Select sensory focus" />
					</SelectTrigger>
					<SelectContent>
						{sensoryOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								<div className="flex items-center gap-2">
									{option.icon}
									<span>{option.label}</span>
									<span className="text-muted-foreground">- {option.description}</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Suggestion Style */}
			<div className="space-y-3">
				<Label className="text-base font-medium">Suggestion Style</Label>
				<p className="text-sm text-muted-foreground">
					How suggestions should be presented in the session
				</p>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					{suggestionOptions.map((option) => {
						const isSelected = hypnoStyle.suggestion === option.value;
						return (
							<button
								key={option.value}
								type="button"
								onClick={() => updateHypnoStyle({ suggestion: option.value })}
								className={cn(
									"relative group text-left p-4 rounded-xl border-2 transition-all duration-200",
									"hover:-translate-y-0.5 hover:shadow-lg",
									isSelected
										? "bg-primary/10 border-primary"
										: "bg-background/50 border-border/50 hover:border-border hover:bg-muted/30"
								)}
							>
								<div className="flex items-start gap-3">
									<div
										className={cn(
											"mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
											"transition-all duration-200",
											isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
										)}
									>
										{isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<span className={isSelected ? "text-primary" : "text-muted-foreground"}>
												{option.icon}
											</span>
											<span
												className={cn(
													"font-medium transition-colors duration-200",
													isSelected ? "text-primary" : "text-foreground"
												)}
											>
												{option.label}
											</span>
										</div>
										<p className="text-xs text-muted-foreground leading-relaxed">
											{option.description}
										</p>
									</div>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Test Area */}
			<Card className="mt-6 border-border/50">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Play className="w-5 h-5 text-primary" />
							<CardTitle className="text-lg">Test Your Configuration</CardTitle>
						</div>
						<Button
							onClick={generateExampleScript}
							disabled={isGenerating}
							size="sm"
							className="gap-2"
						>
							{isGenerating ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Generating...
								</>
							) : (
								<>
									<RefreshCw className="w-4 h-4" />
									Generate Example
								</>
							)}
						</Button>
					</div>
					<p className="text-sm text-muted-foreground">
						See how your configured style will sound by generating an example suggestion phase
					</p>
				</CardHeader>
				<CardContent>
					{/* Current Settings Summary */}
					<div className="flex flex-wrap gap-2 mb-4">
						<Badge variant="outline" className="gap-1">
							{styleOptions.find((s) => s.value === hypnoStyle.style)?.icon}
							{styleOptions.find((s) => s.value === hypnoStyle.style)?.label}
						</Badge>
						{hypnoStyle.induction_types.map((ind) => (
							<Badge key={ind} variant="outline" className="gap-1">
								{inductionOptions.find((i) => i.value === ind)?.icon}
								{inductionOptions.find((i) => i.value === ind)?.label}
							</Badge>
						))}
						<Badge variant="outline" className="gap-1">
							{sensoryOptions.find((s) => s.value === hypnoStyle.sensory)?.icon}
							{sensoryOptions.find((s) => s.value === hypnoStyle.sensory)?.label}
						</Badge>
						<Badge variant="outline" className="gap-1">
							{suggestionOptions.find((s) => s.value === hypnoStyle.suggestion)?.icon}
							{suggestionOptions.find((s) => s.value === hypnoStyle.suggestion)?.label}
						</Badge>
					</div>

					{/* Error Display */}
					{error && (
						<div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 mb-4">
							<p className="text-sm font-medium">Error generating example</p>
							<p className="text-xs mt-1 opacity-90">{error}</p>
						</div>
					)}

					{/* Generated Script Display */}
					{generatedScript && (
						<div className="bg-muted/50 p-4 rounded-xl border border-border/50">
							<Label className="text-sm font-medium mb-2 block">Generated Example:</Label>
							<div className="bg-background p-4 rounded-lg border border-border/50 max-h-64 overflow-y-auto">
								<pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
									{generatedScript}
								</pre>
							</div>
						</div>
					)}

					{!generatedScript && !error && !isGenerating && (
						<div className="text-center py-8 text-muted-foreground">
							<p className="text-sm">
								Click "Generate Example" to see how your configured style will sound
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
