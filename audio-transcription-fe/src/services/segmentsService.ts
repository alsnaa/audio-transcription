import { api } from "./api";
import type { ApiSegmentsResponse } from "@/types/api";

export async function fetchSegments(
  fileId: string
): Promise<ApiSegmentsResponse> {
  const response = await api.get<ApiSegmentsResponse>(`/segments/${fileId}`);
  return response.data;
}
