import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const MEMORY_KEY = "hypno_planner_memory";

export function getMemory(): string {
	if (typeof window === "undefined") return "";
	try {
		return localStorage.getItem(MEMORY_KEY) || "";
	} catch {
		return "";
	}
}

export function setMemory(content: string): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(MEMORY_KEY, content);
	} catch {
		// Ignore localStorage errors
	}
}
