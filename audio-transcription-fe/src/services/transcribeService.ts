import type { AxiosProgressEvent } from "axios";
import { api } from "./api";
import type { ApiTranscribeResponse } from "@/types/api";
import { DEFAULT_MODEL } from "@/types/transcription";

interface TranscribeOptions {
  onUploadProgress?: (event: AxiosProgressEvent) => void;
  model?: string;
}

export async function transcribeFile(
  file: File,
  options: TranscribeOptions = {}
): Promise<ApiTranscribeResponse> {
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("model", options.model || DEFAULT_MODEL);

  const response = await api.post<ApiTranscribeResponse>(
    "/transcribe",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: options.onUploadProgress,
    }
  );

  return response.data;
}
