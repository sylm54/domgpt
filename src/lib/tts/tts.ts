import { backgroundJobs } from "@/lib/backgroundJobs";
import { generateAudio as genRustAudio } from "./tts-rust";
import { affirmmodel, config, model } from "@/config";
import { assistantMessage, systemMessage, userMessage } from "../context";
import { updateAudio, type AffirmAudio } from "@/pages/affirm/types";

export async function generateAudio(script: AffirmAudio): Promise<AffirmAudio> {
  const jobId = `tts-${Date.now()}`;
  backgroundJobs.startJob(jobId, `Creating audio: ${script.title}`, 0);
  if (!script.script) {
    backgroundJobs.updateJob(jobId, "Generating script");
    const res = await affirmmodel.generate([
      systemMessage(
        config.sysprompts.affirm_writer_agent ??
          `Create an audio file based on a prompt`,
      ),
      userMessage(script.prompt),
    ]);
    script.script = res.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");
    script.summary = undefined;
    script.filename = undefined;
    updateAudio(script);
  }
  if (!script.summary) {
    backgroundJobs.updateJob(jobId, "Generating summary");
    const ressummary = await affirmmodel.generate([
      systemMessage(
        config.sysprompts.affirm_writer_agent ??
          `Create an audio file based on a prompt`,
      ),
      userMessage(script.prompt),
      assistantMessage(script.script),
      userMessage(
        config.prompts.affirm_summary ??
          "Please make a summary of the script and its contents",
      ),
    ]);
    const summary = ressummary.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");
    script.summary = summary;
    updateAudio(script);
  }
  if (!script.filename) {
    try {
      const rustscript = await genRustAudio(script as any, (progress) => {
        backgroundJobs.updateJob(
          jobId,
          progress.message,
          Math.round(progress.progress * 100),
        );
      });
      script.filename = rustscript.filename;
      updateAudio(script);
      return script;
    } catch (e) {
      console.log(e);
      return script;
    } finally {
      backgroundJobs.endJob(jobId);
    }
  }
  return script;
}
