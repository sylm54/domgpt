import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useLatestHypnoFile } from "@/data/hypno";
import { resetDatabase } from "@/data/surreal";
import { useProfileStore } from "@/data/profile";

function isOnboardingCompleted(): boolean {
	return localStorage.getItem("onboardingCompleted") === "true";
}

export function setOnboardingCompleted(completed: boolean) {
	localStorage.setItem("onboardingCompleted", completed ? "true" : "false");
}

export function Dashboard() {
	const { profile } = useProfileStore();
	const navigate = useNavigate();

	const plan = profile?.plan;
	const hypno = useLatestHypnoFile();

	if (!isOnboardingCompleted()) {
		return (
			<div className="h-full flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardHeader>
						<CardTitle>Welcome to Conditioning Trainer</CardTitle>
						<CardDescription>
							Complete onboarding to get started with your personalized conditioning journey.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => navigate("/onboarding")} className="w-full">
							Start Onboarding
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="h-full flex items-center justify-center p-4">
				<div className="text-muted-foreground">Loading dashboard...</div>
			</div>
		);
	}

	return (
		<div className="h-full overflow-auto p-4 space-y-4">
			<h1 className="text-2xl font-bold">Dashboard</h1>
			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<Button onClick={() => navigate("/hypno/new")} variant="outline" className="h-auto py-4">
						<div className="text-left">
							<div className="font-medium">New Hypno Session</div>
							<div className="text-xs text-muted-foreground">Generate a personalized session</div>
						</div>
					</Button>

					<Button onClick={() => navigate("/coach")} variant="outline" className="h-auto py-4">
						<div className="text-left">
							<div className="font-medium">Chat with Coach</div>
							<div className="text-xs text-muted-foreground">Review progress and adjust plan</div>
						</div>
					</Button>

					<Button onClick={() => navigate("/challenges")} variant="outline" className="h-auto py-4">
						<div className="text-left">
							<div className="font-medium">Daily Challenges</div>
							<div className="text-xs text-muted-foreground">
								Complete real-world conditioning tasks
							</div>
						</div>
					</Button>

					<Button onClick={() => navigate("/reflection")} variant="outline" className="h-auto py-4">
						<div className="text-left">
							<div className="font-medium">Reflection</div>
							<div className="text-xs text-muted-foreground">Assess your conditioning progress</div>
						</div>
					</Button>

					{hypno && (
						<Button
							onClick={() => navigate(`/hypno/play/${hypno.id.id}`)}
							variant="default"
							className="h-auto py-4"
						>
							<div className="text-left">
								<div className="font-medium">Last Session</div>
								<div className="text-xs text-muted-foreground">Continue where you left off</div>
							</div>
						</Button>
					)}

					<Button
						onClick={() => {
							resetDatabase().then(() => {
								setOnboardingCompleted(false);
								navigate("/onboarding");
							});
						}}
						variant="destructive"
						className="h-auto py-4"
					>
						<div className="text-left">
							<div className="font-medium">Reset All Data</div>
							<div className="text-xs text-muted-foreground">Start fresh with onboarding</div>
						</div>
					</Button>
				</CardContent>
			</Card>

			{plan && (
				<Card>
					<CardHeader>
						<CardTitle>Current Plan</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="font-medium">{plan.user}</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
