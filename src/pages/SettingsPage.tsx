import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AIModelSettings } from "@/components/settings/AIModelSettings";
import { AudioSettings } from "@/components/settings/AudioSettings";
import { DataManagement } from "@/components/settings/DataManagement";
import { HypnoStyleSettings } from "@/components/settings/HypnoStyleSettings";
import { ProfileView } from "@/components/settings/ProfileView";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";

export function SettingsPage() {
	const navigate = useNavigate();
	return (
		<div className="h-full flex flex-col overflow-auto">
			<div className="flex items-center gap-2 p-4">
				<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
					<ArrowLeft className="h-4 w-4 mr-1" />
					Back
				</Button>
			</div>
			<div className="flex-1 p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
				<SettingsSection title="Audio" description="Test audio generation and playback">
					<AudioSettings />
				</SettingsSection>

				<SettingsSection
					title="AI Configuration"
					description="Configure API keys and model settings"
				>
					<AIModelSettings />
				</SettingsSection>

				<SettingsSection
					title="Hypno Style"
					description="Configure your hypnosis session preferences"
				>
					<HypnoStyleSettings />
				</SettingsSection>

				<SettingsSection title="Profile" description="View your profile and conditioning plan">
					<ProfileView />
				</SettingsSection>

				<SettingsSection title="Data Management" description="Reset or delete your data">
					<DataManagement />
				</SettingsSection>
			</div>
		</div>
	);
}
