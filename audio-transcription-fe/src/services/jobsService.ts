import { api } from "./api";
import type { ApiJob } from "@/types/api";

export async function fetchJob(jobId: string): Promise<ApiJob> {
  const response = await api.get<ApiJob>(`/jobs/${jobId}`);
  return response.data;
}
