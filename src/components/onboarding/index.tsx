import { Check } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsStore } from "@/data/settings";
import { getLLMModel } from "@/data/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModelDefStep } from "./ModelDefStep";
import { GoalSettingStep } from "./GoalSettingStep";
import { PersonaDesignStep } from "./PersonaDesignStep";
import { ProfileStep } from "./ProfileStep";
import { MilestonesStep } from "./MilestonesStep";
import { InitialCoachSessionStep } from "./InitialCoachSessionStep";

const steps = [
	{
		id: "model-def",
		title: "Model Configuration",
		description: "Set up your language models and APIs",
	},
	{
		id: "goal-setting",
		title: "Goal Setting",
		description: "Define your conditioning goals",
	},
	{
		id: "persona-design",
		title: "Persona Design",
		description: "Design your coach and reflection personas",
	},
	{
		id: "profile",
		title: "Profile",
		description: "Establish your profile",
	},
	{
		id: "milestones",
		title: "Milestones",
		description: "Create your journey milestones",
	},
	{
		id: "initial-coach-session",
		title: "Ready to Start",
		description: "Begin your first coaching session",
	},
];

export function OnboardingWizard() {
	const [currentStep, setCurrentStep] = useState(0);
	const { settings } = useSettingsStore();
	const navigate = useNavigate();

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handleBack = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleComplete = () => {
		// Mark onboarding as completed
		localStorage.setItem("onboarding-completed", "true");
		// Navigation will be handled by the step itself
	};

	const renderStepContent = () => {
		const currentStepId = steps[currentStep].id;

		// Only load model for steps that need it (not model-def step)
		let model = null;
		if (currentStepId !== "model-def") {
			model = getLLMModel(settings.llm_engines, settings.main_model);
		}

		switch (currentStepId) {
			case "model-def":
				return <ModelDefStep onComplete={handleNext} />;
			case "goal-setting":
				return <GoalSettingStep model={model} onComplete={handleNext} />;
			case "persona-design":
				return <PersonaDesignStep model={model} onComplete={handleNext} />;
			case "profile":
				return <ProfileStep model={model} onComplete={handleNext} />;
			case "milestones":
				return <MilestonesStep model={model} onComplete={handleNext} />;
			case "initial-coach-session":
				return <InitialCoachSessionStep onComplete={handleComplete} />;
			default:
				return null;
		}
	};

	// Show navigation buttons for all steps except the last one
	const showNavigation = currentStep < steps.length - 1;

	return (
		<div className="flex flex-col h-full max-w-4xl mx-auto p-4">
			{/* Progress Indicator - Timeline Design */}
			<div className="mb-10 px-4">
				<div className="relative flex justify-between items-start">
					{/* Connecting Line Background */}
					<div
						className="absolute top-4 left-0 right-0 h-0.5 bg-muted/50"
						style={{ left: "2rem", right: "2rem" }}
					/>

					{/* Animated Progress Line */}
					<div
						className="absolute top-4 h-0.5 bg-primary transition-all duration-500 ease-out"
						style={{
							left: "2rem",
							width: `calc(${(currentStep / (steps.length - 1)) * 100}% - 2rem)`,
						}}
					/>

					{steps.map((step, index) => {
						const isCompleted = index < currentStep;
						const isActive = index === currentStep;
						const isPending = index > currentStep;

						return (
							<div
								key={step.id}
								className="relative flex flex-col items-center z-10"
								style={{ width: `${100 / steps.length}%` }}
							>
								{/* Step Circle */}
								<div
									className={`
										relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
										transition-all duration-300 ease-out
										${isActive ? "scale-110" : "scale-100"}
										${
											isCompleted
												? "bg-primary text-primary-foreground"
												: isActive
													? "bg-primary text-primary-foreground"
													: "bg-muted/80 text-muted-foreground border-2 border-muted-foreground/20"
										}
									`}
								>
									{isCompleted ? <Check className="w-4 h-4" /> : <span>{index + 1}</span>}
								</div>

								{/* Step Label */}
								<div
									className={`
										mt-3 text-center transition-all duration-300
										${isActive ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0.5"}
									`}
								>
									<span
										className={`
											text-xs font-medium block
											${isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"}
										`}
									>
										{step.title}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Step Content */}
			<Card className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-background border-border">
				<CardHeader className="relative pb-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
							<span className="text-primary font-bold">{currentStep + 1}</span>
						</div>
						<div>
							<CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
							<CardDescription className="text-sm mt-0.5">
								{steps[currentStep].description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
					{renderStepContent()}
				</CardContent>
			</Card>

			{/* Navigation - Polished Buttons */}
			{showNavigation && (
				<div className="flex justify-between mt-6 gap-4">
					<Button
						variant="outline"
						onClick={handleBack}
						disabled={currentStep === 0}
						className="min-w-[120px] border-border/50 hover:bg-muted/50 hover:border-border transition-all duration-200 disabled:opacity-30"
					>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<title>Back arrow</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 19l-7-7 7-7"
							/>
						</svg>
						Back
					</Button>
					{/* The Next button is handled by individual steps */}
					<div className="min-w-[120px]" />
				</div>
			)}
		</div>
	);
}
