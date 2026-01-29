import { api } from "./api";
import type { ApiFile } from "@/types/api";

export async function fetchFiles(): Promise<ApiFile[]> {
  const response = await api.get<ApiFile[]>("/files");
  return response.data;
}

export async function deleteFile(fileId: string): Promise<void> {
  await api.delete(`/files/${fileId}`);
}
