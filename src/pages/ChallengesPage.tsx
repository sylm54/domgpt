import { getLLMModel, useSettingsStore } from "@/data/settings";
import { ChallengeGenerator, ChallengeList } from "../components/challenge";
import type { Challenge } from "@/types/user";

export function ChallengesPage() {
	const { settings } = useSettingsStore();
	const model = getLLMModel(settings.llm_engine, settings.main_model || "x-ai/grok-4.1-fast");

	const handleChallengesGenerated = (challenges: Challenge[]) => {
		console.log(`${challenges.length} challenges generated`);
	};

	return (
		<div className="h-full overflow-auto p-4 space-y-6">
			<h1 className="text-2xl font-bold">Daily Challenges</h1>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div>
					<ChallengeGenerator model={model} onChallengesGenerated={handleChallengesGenerated} />
				</div>
				<div>
					<ChallengeList />
				</div>
			</div>
		</div>
	);
}
