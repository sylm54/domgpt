import { ArrowLeft, Settings } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { AISettings } from "@/components/settings/AISettings";
import { AudioSettings } from "@/components/settings/AudioSettings";
import { CoachSettings } from "@/components/settings/CoachSettings";
import { DataManagement } from "@/components/settings/DataManagement";
import { ProfileView } from "@/components/settings/ProfileView";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";

export function SettingsPage() {
	const navigate = useNavigate();

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.4 }}
			className="h-full overflow-auto scroll-smooth"
    >
      {/* Back button */}
				<div className="mb-4">
					<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
						<ArrowLeft className="h-4 w-4 mr-1" />
						Back
					</Button>
				</div>
			<div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-background to-accent/10 p-8 md:p-12 border border-primary/20 min-h-[200px]"
				>
					<div className="absolute inset-0 opacity-30">
						<div
							className="absolute inset-0"
							style={{
								backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.3) 0%, transparent 50%),
											  radial-gradient(circle at 75% 75%, hsl(var(--accent) / 0.3) 0%, transparent 50%),
											  radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.1) 0%, transparent 70%)`,
							}}
						/>
					</div>

					<div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-primary/30 via-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
					<div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-accent/25 via-accent/10 to-transparent rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

					<div className="relative z-10">
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.1 }}
						>
							<span className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-3 bg-primary/10 px-3 py-1 rounded-full">
								<Settings className="h-4 w-4" />
								Settings
							</span>
						</motion.div>
						<h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent leading-tight">
							App Settings
						</h1>
						<p className="text-muted-foreground text-lg md:text-xl max-w-md">
							Configure your application preferences and manage your data
						</p>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="space-y-6"
				>
					<SettingsSection title="Audio" description="Test audio generation and playback">
						<AudioSettings />
					</SettingsSection>

					<SettingsSection
						title="AI Configuration"
						description="Configure API keys and model settings"
					>
						<AISettings />
					</SettingsSection>

					<SettingsSection
						title="Coach Personality"
						description="Choose how your Coach interacts with you"
					>
						<CoachSettings />
					</SettingsSection>

					<SettingsSection title="Profile" description="View your profile and conditioning plan">
						<ProfileView />
					</SettingsSection>

					<SettingsSection title="Data Management" description="Reset or delete your data">
						<DataManagement />
					</SettingsSection>
				</motion.div>
			</div>
		</motion.div>
	);
}
