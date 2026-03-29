import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSubliminalFileById } from "@/data/subliminal";
// import { SessionPlayer } from "../components/subliminal";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export function SubliminalPlayPage() {
	const { sessionId } = useParams<{ sessionId: string }>();
	const subliminal = useSubliminalFileById(sessionId);
	const navigate = useNavigate();

	if (subliminal === undefined) {
		return (
			<div className="h-full flex flex-col p-4">
				<div className="flex items-center gap-2 mb-4">
					<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
						<ArrowLeft className="h-4 w-4 mr-1" />
						Back
					</Button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<p>Loading session...</p>
				</div>
			</div>
		);
	}

	if (subliminal === null) {
		return (
			<div className="h-full flex flex-col p-4">
				<div className="flex items-center gap-2 mb-4">
					<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
						<ArrowLeft className="h-4 w-4 mr-1" />
						Back
					</Button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<Card>
						<CardContent className="p-6 text-center space-y-4">
							<p className="text-muted-foreground">Session not found.</p>
							<Button onClick={() => navigate("/")}>Go to Dashboard</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col p-4">
			<div className="flex items-center gap-2 mb-4">
				<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
					<ArrowLeft className="h-4 w-4 mr-1" />
					Back
				</Button>
			</div>
			<div className="flex-1 min-h-0">{/*<SessionPlayer subliminal={subliminal} />*/}</div>
		</div>
	);
}
