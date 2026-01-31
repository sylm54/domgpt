import { BaseDirectory } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import z from "zod";

const CONFIG_NAME = "config.json";
const CONFIG_BASE_DIR = BaseDirectory.AppConfig;

async function getConfig(): Promise<ConfigType> {
	const contents = await readTextFile(CONFIG_NAME, {
		baseDir: CONFIG_BASE_DIR,
	});
	return JSON.parse(contents);
}

const ConfigSchema = z.object({});
export type ConfigType = z.infer<typeof ConfigSchema>;

const ConfigContext = createContext<ConfigType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
	const [config, setConfig] = useState<ConfigType | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(undefined);

	useEffect(() => {
		getConfig()
			.then((cfg) => {
				setConfig(cfg);
			})
			.catch((err) => {
				console.warn("Failed to load config, using defaults:", err);
				setError(err);
			})
			.finally(() => {
				setLoading(false);
			});
	}, []);
	if (loading || !config) {
		return <div>Loading configuration...</div>;
	}
	if (error) {
		return <div>Error loading configuration: {String(error)}</div>;
	}
	return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
	const context = useContext(ConfigContext);
	if (!context) {
		throw new Error("useConfig must be used within a ConfigProvider");
	}
	return context;
}
