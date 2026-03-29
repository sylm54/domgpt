import { Target, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/data/profile";

export function ProfileView() {
	const { profile } = useProfileStore();
	const navigate = useNavigate();

	if (!profile) {
		return (
			<div className="text-center py-12">
				<p className="text-muted-foreground">
					No profile found. Complete onboarding to create your profile.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground leading-relaxed">
					View your profile information and conditioning plan. To update your profile, chat with
					your Coach.
				</p>
			</div>

			<div className="grid gap-4">
				<div className="p-5 rounded-xl bg-muted/30 border border-border/50">
					<div className="flex items-center gap-3 pb-3 border-b border-border/50">
						<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
							<User className="w-4 h-4 text-primary" />
						</div>
						<h3 className="font-medium">Profile</h3>
					</div>
					<div className="pt-3 space-y-2">
						<p className="text-sm leading-relaxed">
							<strong>Identity:</strong> {profile.data.profile.identity}
						</p>
						<p className="text-sm leading-relaxed">
							<strong>Environment:</strong> {profile.data.profile.environment}
						</p>
						<div>
							<p className="text-sm font-medium mb-1">Habits:</p>
							<ul className="text-sm text-muted-foreground list-disc list-inside">
								{profile.data.profile.habits.map((habit, idx) => (
									<li key={idx}>{habit}</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				<div className="p-5 rounded-xl bg-muted/30 border border-border/50">
					<div className="flex items-center gap-3 pb-3 border-b border-border/50">
						<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
							<Target className="w-4 h-4 text-primary" />
						</div>
						<h3 className="font-medium">Goal</h3>
					</div>
					<div className="pt-3 space-y-2">
						<p className="text-sm leading-relaxed">
							<strong>Goal:</strong> {profile.data.goal.description}
						</p>
						<p className="text-sm leading-relaxed">
							<strong>Motivation:</strong> {profile.data.goal.motivation}
						</p>
						<p className="text-sm leading-relaxed">
							<strong>Target Identity:</strong> {profile.data.goal.targetIdentity}
						</p>
					</div>
				</div>

				{profile.data.plan && (
					<div className="p-5 rounded-xl bg-muted/30 border border-border/50">
						<div className="flex items-center gap-3 pb-3 border-b border-border/50">
							<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<Target className="w-4 h-4 text-primary" />
							</div>
							<h3 className="font-medium">Conditioning Plan</h3>
						</div>
						<div className="pt-3 space-y-3">
							<div>
								<p className="text-xs font-semibold text-primary mb-1">Hypnosis Plan</p>
								<p className="text-sm leading-relaxed">{profile.data.plan.hypno}</p>
							</div>
							<div>
								<p className="text-xs font-semibold text-primary mb-1">Challenges Plan</p>
								<p className="text-sm leading-relaxed">{profile.data.plan.challenges}</p>
							</div>
							<div>
								<p className="text-xs font-semibold text-primary mb-1">Interview Plan</p>
								<p className="text-sm leading-relaxed">{profile.data.plan.interview}</p>
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="flex justify-center pt-4">
				<Button
					onClick={() => navigate("/coach")}
					variant="outline"
					className="border-primary/30 hover:border-primary/60 hover:bg-primary/5"
				>
					Chat with Coach to Update Profile
				</Button>
			</div>
		</div>
	);
}
