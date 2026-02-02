import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useResetDatabase } from "@/data/surreal";
import { setOnboardingCompleted } from "@/pages/Dashboard";

export function DataManagement() {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const resetDatabase = useResetDatabase();
	const navigate = useNavigate();

	const handleReset = async () => {
		await resetDatabase();
		setOnboardingCompleted(false);
		navigate("/onboarding");
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground leading-relaxed">
					Manage your application data. Resetting will delete all your profile, history, and
					generated content.
				</p>
			</div>

			<div className="p-5 rounded-xl border-2 border-destructive/20 bg-destructive/5">
				<div className="flex items-start gap-4">
					<div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
						<AlertTriangle className="w-5 h-5 text-destructive" />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold text-destructive mb-2">Danger Zone</h3>
						<p className="text-sm text-muted-foreground leading-relaxed mb-4">
							Resetting all data will permanently delete:
						</p>
						<ul className="text-sm text-muted-foreground space-y-1 mb-4">
							<li>• Your profile and conditioning plan</li>
							<li>• All hypnosis sessions</li>
							<li>• Challenge history and progress</li>
							<li>• Reflection entries</li>
							<li>• All settings and preferences</li>
						</ul>
						<p className="text-sm text-destructive font-medium">This action cannot be undone.</p>
					</div>
				</div>
			</div>

			<div className="flex justify-center pt-2">
				<Button
					onClick={() => setIsDialogOpen(true)}
					variant="destructive"
					className="min-w-[200px]"
				>
					<Trash2 className="w-4 h-4 mr-2" />
					Reset All Data
				</Button>
			</div>

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
								<AlertTriangle className="w-5 h-5 text-destructive" />
							</div>
							<div>
								<DialogTitle className="text-lg">Reset All Data</DialogTitle>
							</div>
						</div>
						<DialogDescription className="pt-4">
							Are you sure you want to reset all data? This will permanently delete your profile,
							history, and all generated content. You will need to complete onboarding again.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="pt-4">
						<Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
							Cancel
						</Button>
						<Button type="button" variant="destructive" onClick={handleReset}>
							<Trash2 className="w-4 h-4 mr-2" />
							Reset All Data
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
