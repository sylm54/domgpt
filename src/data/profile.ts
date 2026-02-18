// We handle Profile via a store so we can access it synchronously

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile } from "@/types/user";

interface Profile {
	profile: UserProfile | undefined;
	setProfile: (profile: UserProfile) => void;
	updateProfile: (updates: Partial<UserProfile>) => void;
	updatePlan: (feature: "hypno" | "challenges" | "user" | "interview"|"coach", content: string) => void;
	getProfile: () => UserProfile | undefined;
}

export const useProfileStore = create<Profile>()(
	persist(
		(set, get) => ({
			profile: undefined,
			setProfile: (profile) => set({ profile }),
			updateProfile: (updates) =>
				set((state) => ({
					profile: state.profile ? { ...state.profile, ...updates } : undefined,
				})),
			updatePlan: (feature: "hypno" | "challenges" | "user" | "interview", content: string) =>
				set((state) => {
					if (!state.profile) return state;
					const updatedPlans = { ...state.profile.plan, [feature]: content };
					return {
						profile: { ...state.profile, plan: updatedPlans },
					};
				}),
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
