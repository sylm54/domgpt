import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OnboardingWizard } from "../components/steering";

export function OnboardingPage() {
	const navigate = useNavigate();
	return (
		<div className="h-full flex flex-col overflow-auto">
			<div className="flex items-center gap-2 p-4">
				<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
					<ArrowLeft className="h-4 w-4 mr-1" />
					Back
				</Button>
			</div>
			<div className="flex-1">
				<OnboardingWizard />
			</div>
		</div>
	);
}
