import fs from 'fs';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { groupWordsIntoSegments } from '../transcriptions.js';

export async function transcribe(filePath) {
  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  const fileStream = fs.createReadStream(filePath);

  const result = await client.speechToText.convert({
    file: fileStream,
    modelId: 'scribe_v1',
    timestampsGranularity: 'word',
  });

  const language = result.languageCode || null;
  const segments = groupWordsIntoSegments(result.words || []);

  return { language, segments };
}
