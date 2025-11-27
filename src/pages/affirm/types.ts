export type AffirmAudio = {
  title: string;
  prompt: string;
  filename?: string;
  script?: string;
  summary?: string;
};

const AUDIO_KEY = "affirm-audio";

export function loadAudio(): AffirmAudio[] {
  const audio = localStorage.getItem(AUDIO_KEY);
  if (audio) {
    return JSON.parse(audio);
  }
  return [];
}

function saveAudio(audio: AffirmAudio[]) {
  localStorage.setItem(AUDIO_KEY, JSON.stringify(audio));
}

export function updateAudio(audio: AffirmAudio) {
  const currentAudio = loadAudio();
  const index = currentAudio.findIndex((a) => a.title === audio.title);
  if (index !== -1) {
    currentAudio[index] = audio;
  } else {
    currentAudio.push(audio);
  }
  saveAudio(currentAudio);
}

export function deleteAudio(filter = (a: AffirmAudio) => true) {
  const currentAudio = loadAudio();
  const index = currentAudio.findIndex(filter);
  if (index !== -1) {
    return currentAudio.splice(index, 1)[0];
  }
  saveAudio(currentAudio);
}
