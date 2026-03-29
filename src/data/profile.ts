// We handle Profile via a store so we can access it synchronously

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile } from "@/types/user";

interface Profile {
	profile: UserProfile | undefined;
	setProfile: (profile: UserProfile) => void;
	updateProfile: (updates: Partial<UserProfile>) => void;
	getProfile: () => UserProfile | undefined;
}

// Deep merge helper for nested objects
const deepMerge = <T extends object>(target: T, source: Partial<T>): T => {
	const result = { ...target };
	for (const key in source) {
		if (source[key] instanceof Object && !Array.isArray(source[key]) && key in result) {
			result[key] = deepMerge(result[key] as object, source[key] as Partial<object>) as T[Extract<
				keyof T,
				string
			>];
		} else {
			(result[key] as T[Extract<keyof T, string>]) = source[key] as T[Extract<keyof T, string>];
		}
	}
	return result;
};

export const useProfileStore = create<Profile>()(
	persist(
		(set, get) => ({
			profile: {
				data: {
					profile: {
						environment: "",
						habits: [],
						strengths: [],
						weaknesses: [],
						beliefs: [],
						identity: "",
						constraints: [],
						resources: [],
						currentMilestone: 0,
					},
					goal: {
						description: "",
						motivation: "",
						targetIdentity: "",
					},
					todos: {},
					plan: {
						hypno: "",
						challenges: "",
						interview: "",
					},
					milestones: [],
					currentMilestone: {
						title: "",
						description: "",
					},
					currentResourceTags: [],
				},
				personality: {
					coach: "",
					reflection: "",
					hypnostyle: "",
				},
				created_at: new Date(),
				updated_at: new Date(),
			},
			setProfile: (profile) => set({ profile }),
			updateProfile: (updates) => {
				if (updates?.data?.profile?.resources) {
					updates.data.currentResourceTags = updates.data.profile.resources.flatMap(
						(res) => res.tags
					);
				}
				if (
					updates?.data?.profile?.currentMilestone &&
					(updates?.data?.milestones?.length ?? 0) > updates?.data?.profile?.currentMilestone
				) {
					updates.data.currentMilestone =
						updates.data.milestones[updates.data.profile.currentMilestone];
				}
				return set((state) => ({
					profile: state.profile ? deepMerge(state.profile, updates) : (updates as UserProfile),
				}));
			},
			getProfile: () => get().profile,
		}),
		{
			name: "profile-storage",
			partialize: (state) => ({
				profile: state.profile,
			}),
		}
	)
);
