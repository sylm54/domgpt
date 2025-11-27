import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { AwardIcon, SparklesIcon, UserIcon } from "lucide-react";
import type { ProfileData } from "./types";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useConfig } from "@/contexts/ConfigContext";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import {
  loadProfileData,
  getAchievementsSortedByDate,
  getAchievementCount,
  saveProfileData,
  updateField,
} from "./types";
import { getConfig } from "@/config";
import type { Phase } from "@/config";
import { usePhaseState, completeChallenge } from "@/lib/phase";
import { PhaseTimeline } from "@/components/PhaseTimeline";
import { PhaseChallenge } from "@/components/PhaseChallenge";

export default function ProfileView() {
  const { uiText } = useConfig();
  const [data, setData] = useState<ProfileData>({
    title: "",
    description: "",
    achievements: [],
    fields: {},
  });
  const [profileFields, setProfileFields] = useState<string[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const phaseState = usePhaseState();

  useEffect(() => {
    const loaded = loadProfileData();
    setData(loaded);

    getConfig().then((config) => {
      if (config.profile_fields) {
        setProfileFields(config.profile_fields);
      }
      if (config.phases) {
        setPhases(config.phases);
      }
    });
  }, []);

  const handleFieldChange = (fieldName: string, value: string) => {
    const newData = updateField(data, fieldName, value);
    setData(newData);
    saveProfileData(newData);
  };

  const sortedAchievements = getAchievementsSortedByDate(data);
  const achievementCount = getAchievementCount(data);

  return (
    <PageLayout>
      <PageHeader
        title={uiText.profile?.title || "Profile"}
        subtitle={
          <div className="flex items-center gap-2">
            <AwardIcon className="w-4 h-4" />
            <span>
              {achievementCount} achievement
              {achievementCount !== 1 ? "s" : ""}
            </span>
          </div>
        }
      />

      {/* Profile Content */}
      <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Phase Timeline Section */}
          {phases.length > 0 && (
            <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-lg border border-pink-200/50 dark:border-pink-500/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-md">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {uiText.profile?.journey_label || "Your Journey"}
                </h2>
              </div>

              <PhaseTimeline
                phases={phases}
                currentIndex={phaseState.currentPhaseIndex}
                completedPhases={phaseState.completedPhases}
              />

              {/* Current Phase Info */}
              {phases[phaseState.currentPhaseIndex] && (
                <div className="mt-6 pt-6 border-t border-pink-200/50 dark:border-pink-500/20">
                  <h3 className="text-lg font-bold mb-2 text-foreground">
                    {phases[phaseState.currentPhaseIndex].title}
                  </h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {phases[phaseState.currentPhaseIndex].user_description}
                  </p>

                  {/* Challenge */}
                  <PhaseChallenge
                    challenge={
                      phases[phaseState.currentPhaseIndex].graduation_challenge
                    }
                    ready={phaseState.challengeReady}
                    onComplete={completeChallenge}
                  />
                </div>
              )}
            </div>
          )}

          {/* Profile Info Card */}
          <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl p-5 sm:p-6 shadow-lg shadow-pink-300/30 dark:shadow-pink-900/30">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 break-words">
                  {data.title || "Your Profile"}
                </h2>
                <div className="text-white/90 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                  <Response>{data.description}</Response>
                </div>
              </div>
            </div>
          </div>

          {/* User Fields */}
          {profileFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-md">
                  <span className="text-white text-sm">✎</span>
                </span>
                Personal Notes
              </h3>
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {profileFields.map((field) => (
                  <div
                    key={field}
                    className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-pink-200/50 dark:border-pink-500/20 hover:shadow-xl transition-shadow"
                  >
                    <h4 className="text-base font-semibold mb-3 text-foreground">
                      {field}
                    </h4>
                    <Textarea
                      value={data.fields[field] || ""}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      placeholder={`Enter your ${field.toLowerCase()}...`}
                      className="min-h-[100px] bg-white/50 dark:bg-card/50 border-pink-200 dark:border-pink-500/30 focus:border-pink-400 focus:ring-pink-400/30 rounded-xl resize-y"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements Section */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-3 text-foreground">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-md">
                  <AwardIcon className="w-5 h-5 text-white" />
                </div>
                {uiText.profile?.achievements_label || "Achievements"}
              </h3>
              {achievementCount > 0 && (
                <span className="px-3 py-1.5 bg-gradient-to-r from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 text-pink-600 dark:text-pink-400 rounded-lg text-sm font-bold">
                  {achievementCount} earned
                </span>
              )}
            </div>

            {sortedAchievements.length === 0 ? (
              <EmptyState
                icon={AwardIcon}
                title={uiText.profile?.no_achievements || "No achievements yet"}
                description={
                  uiText.profile?.no_achievements_desc ||
                  "Achievements will be added by your AI assistant as you make progress"
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {sortedAchievements.map((achievement, idx) => (
                  <div
                    key={achievement.id}
                    className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-pink-200/50 dark:border-pink-500/20 hover:shadow-xl hover:border-pink-300/50 dark:hover:border-pink-500/30 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md shadow-yellow-300/30">
                        <AwardIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg mb-1 text-foreground">
                          {achievement.title}
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                          {achievement.description}
                        </p>
                        <p className="text-xs text-pink-500 dark:text-pink-400 mt-3 font-medium">
                          {new Date(achievement.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 rounded-2xl p-5 border border-pink-200/50 dark:border-pink-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  About Your Profile
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your profile is managed by your AI assistant and reflects your
                  journey. Achievements are automatically added as you make
                  progress. You can edit your personal notes at any time to
                  track your thoughts and goals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
