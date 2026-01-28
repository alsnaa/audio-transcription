import { readFile } from 'fs/promises';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const apiUrl = 'http://100.77.66.5:8005/transcribe';

const transcriptionStrategies = {
  'whisper-local': async (filePath) => {
    const fileBuffer = await readFile(filePath);
    const fileName = path.basename(filePath);
    const formData = new FormData();

    formData.append('file', fileBuffer, fileName);

    const response = await axios.post(apiUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 0,
    });

    return response.data;
  },
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
