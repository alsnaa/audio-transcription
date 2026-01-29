import { transcribe as whisperLocal } from './models/whisper-local.js';
import { transcribe as elevenlabsScribe } from './models/elevenlabs-scribe.js';

/**
 * Groups ElevenLabs word-level transcription output into segments.
 *
 * Splits on: sentence boundaries (.!?), speaker changes, time gaps (>1.5s),
 * and safety caps (30 words or 30s per segment).
 */
export function groupWordsIntoSegments(words) {
  const SENTENCE_ENDERS = /[.!?]$/;
  const MAX_GAP_SECONDS = 1.5;
  const MAX_WORDS = 30;
  const MAX_DURATION = 30;

  const segments = [];
  let texts = [];
  let segStart = null;
  let segEnd = null;
  let currentSpeaker = null;
  let wordCount = 0;

  function flush() {
    if (texts.length === 0) return;
    segments.push({
      start: segStart ?? 0,
      end: segEnd ?? 0,
      text: texts.join(' ').trim(),
    });
    texts = [];
    segStart = null;
    segEnd = null;
    wordCount = 0;
  }

  for (const word of words) {
    if (word.type === 'spacing') continue;

    const speakerChanged =
      currentSpeaker !== null &&
      word.speaker_id !== undefined &&
      word.speaker_id !== currentSpeaker;

    const timeGap =
      segEnd !== null && word.start !== undefined ? word.start - segEnd : 0;

    const exceedsDuration =
      segStart !== null &&
      word.end !== undefined &&
      word.end - segStart > MAX_DURATION;

    if (
      texts.length > 0 &&
      (speakerChanged ||
        timeGap > MAX_GAP_SECONDS ||
        exceedsDuration ||
        wordCount >= MAX_WORDS)
    ) {
      flush();
    }

    if (word.type === 'word' || word.type === 'audio_event') {
      if (segStart === null) {
        segStart = word.start ?? 0;
        currentSpeaker = word.speaker_id ?? null;
      }
      segEnd = word.end ?? segEnd;
      texts.push(word.text);
      wordCount++;

      if (word.speaker_id !== undefined) {
        currentSpeaker = word.speaker_id;
      }

      if (SENTENCE_ENDERS.test(word.text)) {
        flush();
      }
    }
  }

  flush();
  return segments;
}

const transcriptionStrategies = {
  'whisper-local': whisperLocal,
  'elevenlabs-scribe': elevenlabsScribe,
};

export const transcribe = async (filePath, options = {}) => {
  const { model = 'whisper-local' } = options;
  const strategy = transcriptionStrategies[model];

  if (!strategy) {
    throw new Error(`Unsupported transcription model: ${model}`);
  }

  try {
    return await strategy(filePath);
  } catch (error) {
    console.log(error);
    throw Error(error.message);
  }
};
