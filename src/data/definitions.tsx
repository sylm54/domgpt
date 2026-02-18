import type { CoachPersonality, CoachTrait } from "@/types/user";
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

export const traitDefinitions: {
	value: CoachTrait;
	label: string;
	description: string;
	icon: React.ReactNode;
}[] = [
	{
		value: "soft",
		label: "Soft",
		description: "Gentle and non-confrontational",
		icon: <Heart className="w-4 h-4" />,
	},
	{
		value: "encouraging",
		label: "Encouraging",
		description: "More friendly and supportive",
		icon: <MessageCircle className="w-4 h-4" />,
	},
	{
		value: "empathetic",
		label: "Empathetic",
		description: "Shows understanding of user's feelings",
		icon: <Heart className="w-4 h-4" />,
	},
	{
		value: "informative",
		label: "Informative",
		description: "Provides detailed explanations",
		icon: <Brain className="w-4 h-4" />,
	},
	{
		value: "intense",
		label: "Intense",
		description: "More forceful and goes farther",
		icon: <Zap className="w-4 h-4" />,
	},
	{
		value: "pushing",
		label: "Pushing",
		description: "Expands on your goals and takes them further",
		icon: <Target className="w-4 h-4" />,
	},
	{
		value: "assertive",
		label: "Assertive",
		description: "Takes initiative and guides your journey",
		icon: <Shield className="w-4 h-4" />,
	},
];

export const personalityDefinitions: {
	value: CoachPersonality;
	label: string;
	description: string;
	icon: React.ReactNode;
}[] = [
	{
		value: "trainer",
		label: "Trainer",
		description: "Will train you and push you to reach your goals", // Instructs the user with a more authoritative tone and is more focused on achieving results.
		icon: <Dumbbell className="w-4 h-4" />,
	},
	{
		value: "mentor",
		label: "Mentor",
		description: "Wise guide sharing knowledge and experience to help you grow", // Uses should and give more a direction.
		icon: <Target className="w-4 h-4" />,
	},
	{
		value: "ally",
		label: "Ally",
		description: "Partner working alongside you", // Uses we and us talks with the user on one level and is more friendly
		icon: <Users className="w-4 h-4" />,
	},
];
