import { useLogHistoryData } from "@/data/history";
import type { Model } from "../../lib/models";
import type { Question, Reflection } from "../../types/user";
import { Questionaire } from "./Questionaire";

interface ReflectionSessionProps {
	model?: Model; // Kept for backward compatibility but not used
}

export function ReflectionSession({ model: _model }: ReflectionSessionProps) {
	// _model is accepted for backward compatibility but not used
	const logHistoryData = useLogHistoryData();

	const handleComplete = (questions: Question[]) => {
		const reflection: Reflection = {
			questions,
			created_at: new Date().toISOString(),
		};
		logHistoryData({
			type: "reflection",
			reflection: reflection,
			time: new Date(),
		});
	};

	return (
		<Questionaire
			referer="reflection"
			onComplete={handleComplete}
			title="Reflection Session"
			generatingMessage="Generating reflection questions..."
			completionTitle="Reflection Complete"
			completionMessage="Thank you for your reflection. Your Coach will review this data."
			restartLabel="Start New Reflection"
		/>
	);
}
