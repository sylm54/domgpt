import type { Model } from "../../lib/models";
import { SocraticChat } from "./SocraticChat";

interface ReflectionSessionProps {
	model?: Model; // Kept for backward compatibility but not used
}

export function ReflectionSession({ model }: ReflectionSessionProps) {
	if (!model) {
		return (
			<div className="h-full flex items-center justify-center">
				<p className="text-muted-foreground">No model configured for reflection session.</p>
			</div>
		);
	}

	return <SocraticChat model={model} />;
}
