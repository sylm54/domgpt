import { Cpu, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/data/settings";

export function AISettings() {
	const { settings, updateSettings } = useSettingsStore();

	return (
		<div className="space-y-6">
			<div className="space-y-4 p-5 rounded-xl bg-muted/30 border border-border/50">
				<div className="flex items-center gap-3 pb-2 border-b border-border/50">
					<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
						<Key className="w-4 h-4 text-primary" />
					</div>
					<h3 className="font-medium">API Key</h3>
				</div>

				<div className="space-y-2">
					<Label htmlFor="openrouter-key" className="text-sm flex items-center gap-2">
						<span className="text-muted-foreground">OpenRouter API Key</span>
					</Label>
					<Input
						id="openrouter-key"
						type="password"
						placeholder="sk-or-..."
						value={settings.llm_engine?.api_key || ""}
						onChange={(e) =>
							updateSettings({
								llm_engine: {
									type: "openrouter",
									api_key: e.target.value,
								},
							})
						}
						className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
					/>
					<p className="text-xs text-muted-foreground mt-2">
						Required for cloud processing mode. Get your key from{" "}
						<a
							href="https://openrouter.ai"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline"
						>
							openrouter.ai
						</a>
					</p>
				</div>
			</div>

			<div className="space-y-4 p-5 rounded-xl bg-muted/30 border border-border/50">
				<div className="flex items-center gap-3 pb-2 border-b border-border/50">
					<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
						<Cpu className="w-4 h-4 text-primary" />
					</div>
					<h3 className="font-medium">Model Selection</h3>
				</div>

				<div className="space-y-2">
					<Label htmlFor="model" className="text-sm text-muted-foreground">
						Language Model
					</Label>
					<Select
						value={settings.main_model || "x-ai/grok-4.1-fast"}
						onValueChange={(value) => updateSettings({ main_model: value })}
					>
						<SelectTrigger
							id="model"
							className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
						>
							<SelectValue placeholder="Select model" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="x-ai/grok-4.1-fast">Grok 4.1 Fast (Speedy)</SelectItem>
							<SelectItem value="deepseek/deepseek-v3.2-exp">DeepSeek v3.2 Experimental</SelectItem>
							<SelectItem value="meituan/longcat-flash-chat">
								LongCat Flash Chat (Meituan)
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}
