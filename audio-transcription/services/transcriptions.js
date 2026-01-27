import { readFile } from 'fs/promises';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const apiUrl = 'http://100.77.66.5:8005/transcribe';

export const transcribe = async (filePath) => {
  try {
    const fileBuffer = await readFile(filePath);
    const fileName = path.basename(filePath);
    const formData = new FormData();

    formData.append('file', fileBuffer, fileName);

    const response = await axios.post(apiUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 0,
    });

    return response.data;
  } catch (error) {
    console.log(error);
    throw Error(error.message);
  }
};
