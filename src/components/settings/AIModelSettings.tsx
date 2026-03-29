import { Plus, Trash2, Key, Cpu, Check } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useSettingsStore, models } from "@/data/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface APIConfig {
	id: string;
	type: "openrouter" | "nanoGPT";
	api_key: string;
	selectedModels: string[];
}

export function AIModelSettings() {
	const { settings, updateSettings } = useSettingsStore();
	const [apiConfigs, setApiConfigs] = useState<APIConfig[]>(() => {
		// Initialize from existing settings
		if (settings.llm_engines && settings.llm_engines.length > 0) {
			return settings.llm_engines.map((engine, index) => ({
				id: `api-${index}`,
				type: engine.type,
				api_key: engine.api_key || "",
				selectedModels: [],
			}));
		}
		return [];
	});
	const [mainModel, setMainModel] = useState<{ modelId: string; engineType: string } | null>(
		settings.main_model
			? { modelId: settings.main_model.model, engineType: settings.main_model.engine }
			: null
	);

	// Automatically save settings when apiConfigs or mainModel changes
	useEffect(() => {
		// Convert API configs to LLMEngine format
		const llmEngines: Array<{ type: "openrouter" | "nanoGPT"; api_key?: string }> = apiConfigs
			.filter((config) => config.api_key.trim() !== "")
			.map((config) => ({
				type: config.type,
				api_key: config.api_key,
			}));

		if (mainModel) {
			updateSettings({
				llm_engines: llmEngines,
				main_model: {
					engine: mainModel.engineType as "openrouter" | "nanoGPT",
					model: mainModel.modelId,
				},
			});
		}
	}, [apiConfigs, mainModel, updateSettings]);

	// Calculate all available models from configured APIs
	const availableModels = useMemo(() => {
		const modelMap = new Map<string, { model: (typeof models)[0]; config: APIConfig }>();
		apiConfigs.forEach((config) => {
			const modelsForProvider = models.filter((m) => config.type in m.ids);
			modelsForProvider.forEach((model) => {
				const modelId = model.ids[config.type];
				if (modelId) {
					modelMap.set(modelId, { model, config });
				}
			});
		});
		return Array.from(modelMap.entries()).map(([modelId, data]) => ({
			modelId,
			...data,
		}));
	}, [apiConfigs]);

	const addAPIConfig = () => {
		setApiConfigs([
			...apiConfigs,
			{
				id: `api-${Date.now()}`,
				type: "openrouter",
				api_key: "",
				selectedModels: [],
			},
		]);
	};

	const updateAPIConfig = (id: string, updates: Partial<APIConfig>) => {
		setApiConfigs(
			apiConfigs.map((config) => (config.id === id ? { ...config, ...updates } : config))
		);
	};

	const removeAPIConfig = (id: string) => {
		const newConfigs = apiConfigs.filter((config) => config.id !== id);
		setApiConfigs(newConfigs);
		
		// If the removed config had the main model, clear the main model selection
		const removedConfig = apiConfigs.find((config) => config.id === id);
		if (removedConfig && mainModel?.engineType === removedConfig.type) {
			setMainModel(null);
		}
	};

	const handleMainModelSelect = (modelId: string, engineType: string) => {
		setMainModel({ modelId, engineType });
	};

	const handleAPIKeyChange = (id: string, apiKey: string) => {
		updateAPIConfig(id, { api_key: apiKey });
	};

	const toggleModelSelection = (configId: string, modelId: string) => {
		setApiConfigs(
			apiConfigs.map((config) =>
				config.id === configId
					? {
							...config,
							selectedModels: config.selectedModels.includes(modelId)
								? config.selectedModels.filter((m) => m !== modelId)
								: [...config.selectedModels, modelId],
						}
					: config
			)
		);
	};

	const handleProviderChange = (id: string, newType: "openrouter" | "nanoGPT") => {
		const oldConfig = apiConfigs.find((c) => c.id === id);
		const oldType = oldConfig?.type;
		
		updateAPIConfig(id, { type: newType, selectedModels: [] });
		
		// Only clear main model if it was from the OLD provider type
		if (mainModel?.engineType === oldType) {
			setMainModel(null);
		}
		// Don't call saveSettings here - the useEffect will handle it
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground leading-relaxed">
					Configure your API keys to enable access to language models. You can add multiple API
					providers for redundancy and access to different models.
				</p>
			</div>

			{/* API Configurations List */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="font-medium">API Configurations</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={addAPIConfig}
						className="gap-2"
					>
						<Plus className="w-4 h-4" />
						Add API
					</Button>
				</div>

				{apiConfigs.length === 0 && (
					<div className="p-8 text-center border-2 border-dashed border-border/50 rounded-lg">
						<Key className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
						<p className="text-sm text-muted-foreground">No API configurations yet</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addAPIConfig}
							className="mt-3 gap-2"
						>
							<Plus className="w-4 h-4" />
							Add your first API
						</Button>
					</div>
				)}

				{apiConfigs.map((config) => {
					const availableModelsForProvider = models.filter((m) => m.ids[config.type]);

					return (
						<Card key={config.id} className="border-border/50 bg-muted/30">
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
											<Key className="w-4 h-4 text-primary" />
										</div>
										<div>
											<CardTitle className="text-base">API Configuration</CardTitle>
											<CardDescription className="text-xs">
												{config.type === "openrouter" ? "OpenRouter" : "nanoGPT"} Provider
											</CardDescription>
										</div>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => removeAPIConfig(config.id)}
										className="text-destructive hover:text-destructive hover:bg-destructive/10"
									>
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>
							</CardHeader>
							<CardContent className="space-y-4 pt-0">
								<div className="grid gap-3">
									<Label
										htmlFor={`provider-${config.id}`}
										className="text-sm text-muted-foreground"
									>
										Provider Type
									</Label>
									<Select
										value={config.type}
										onValueChange={(value: "openrouter" | "nanoGPT") =>
											handleProviderChange(config.id, value)
										}
									>
										<SelectTrigger
											id={`provider-${config.id}`}
											className="h-11 bg-background/50 border-border/50"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="openrouter">OpenRouter</SelectItem>
											<SelectItem value="nanoGPT">nanoGPT</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="grid gap-3">
									<Label htmlFor={`api-key-${config.id}`} className="text-sm text-muted-foreground">
										API Key
									</Label>
									<Input
										id={`api-key-${config.id}`}
										type="password"
										placeholder={config.type === "nanoGPT" ? "Enter your nanoGPT key" : "sk-or-..."}
										value={config.api_key}
										onChange={(e) => handleAPIKeyChange(config.id, e.target.value)}

										className="h-11 bg-background/50 border-border/50"
									/>
								</div>

								{config.api_key && (
									<div className="space-y-3 pt-2 border-t border-border/50">
										<Label className="text-sm text-muted-foreground">Available Models</Label>
										{availableModelsForProvider.length === 0 ? (
											<div className="text-sm text-muted-foreground p-3 bg-background/50 rounded-lg">
												No models available for {config.type}
											</div>
										) : (
											<div className="space-y-2">
												{availableModelsForProvider.map((model) => {
													const modelId = model.ids[config.type];
													if (!modelId) return null;
													const isSelected = config.selectedModels.includes(modelId);
													return (
														<div
															key={modelId}
															className="flex items-start gap-3 p-3 rounded-lg border-2 bg-background/50 transition-all duration-200 hover:border-primary/30"
														>
															<Checkbox
																id={`model-${config.id}-${modelId}`}
																checked={isSelected}
																onCheckedChange={() => toggleModelSelection(config.id, modelId)}
															/>
															<div className="flex-1 min-w-0">
																<div className="flex items-center gap-2 mb-1">
																	<Label
																		htmlFor={`model-${config.id}-${modelId}`}
																		className="font-medium text-sm cursor-pointer"
																	>
																		{model.name}
																	</Label>
																	<Badge variant="secondary" className="text-xs font-normal">
																		{config.type}
																	</Badge>
																</div>
																<p className="text-xs text-muted-foreground leading-relaxed">
																	{model.description}
																</p>
															</div>
														</div>
													);
												})}
											</div>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Main Model Selection */}
			{availableModels.length > 0 && (
				<Card className="border-border/50 bg-muted/30">
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<Cpu className="w-4 h-4 text-primary" />
							</div>
							<div>
								<CardTitle className="text-base">Primary Model</CardTitle>
								<CardDescription className="text-xs">
									Select your main language model for coaching
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid gap-3">
							{availableModels.map(({ modelId, model, config }) => {
								const isSelected = mainModel?.modelId === modelId;
								return (
									<button
										key={modelId}
										type="button"
										onClick={() => handleMainModelSelect(modelId, config.type)}
										className={`
											text-left p-4 rounded-lg border-2 transition-all duration-200
											${
												isSelected
													? "border-primary bg-primary/5 ring-2 ring-primary/20"
													: "border-border/50 bg-background/50 hover:border-primary/50 hover:bg-primary/[0.02]"
											}
										`}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<span className="font-medium text-sm">{model.name}</span>
													{isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
												</div>
												<p className="text-xs text-muted-foreground leading-relaxed">
													{model.description}
												</p>
											</div>
											<Badge variant="secondary" className="text-xs font-normal">
												{config.type}
											</Badge>
										</div>
									</button>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}