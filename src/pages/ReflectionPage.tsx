import { getLLMModel, useSettingsStore } from "@/data/settings";
import { ReflectionSession } from "../components/steering";

export function ReflectionPage() {
	const { settings } = useSettingsStore();
	const model = getLLMModel(settings.llm_engine, settings.main_model || "x-ai/grok-4.1-fast");
	return (
		<div className="relative h-full overflow-hidden">
			{/* Background gradient layers */}
			<div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />
			<div className="absolute inset-0 bg-gradient-to-tr from-amber-500/3 via-transparent to-rose-500/3" />

			{/* Decorative floating elements */}
			<div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-2xl" />
			<div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-2xl" />
			<div className="absolute top-1/2 left-1/3 w-24 h-24 bg-gradient-to-r from-amber-500/8 to-transparent rounded-full blur-xl" />

			{/* Content container */}
			<div className="relative h-full p-6 md:p-8 lg:p-10">
				<div className="mx-auto max-w-2xl h-full">
					<ReflectionSession model={model} />
				</div>
			</div>
		</div>
	);
}
