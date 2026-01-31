// We handle Profile via a store so we can access it synchronously

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile } from "@/types/user";

interface Profile {
	profile: UserProfile | undefined;
	setProfile: (profile: UserProfile) => void;
	updateProfile: (updates: Partial<UserProfile>) => void;
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
		}),
		{
			name: "profile-storage",
			partialize: (state) => ({
				profile: state.profile,
			}),
		}
	)
);
