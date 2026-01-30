import { readFile } from 'fs/promises';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const apiUrl = 'http://localhost:3000/transcribe';

export async function transcribe(filePath) {
  const fileBuffer = await readFile(filePath);
  const fileName = path.basename(filePath);
  const formData = new FormData();

  formData.append('file', fileBuffer, fileName);

  const response = await axios.post(apiUrl, formData, {
    headers: formData.getHeaders(),
    timeout: 0,
  });

  return response.data;
}
