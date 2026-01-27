export default async (payload, helpers) => {
  const { jobId } = payload;

  console.log('Starting transcription job', jobId);

  // We'll implement this next:
  // 1. Extract audio
  // 2. Chunk audio
  // 3. Send chunks to Whisper
  // 4. Save text
};
