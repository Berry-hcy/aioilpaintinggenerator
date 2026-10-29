export type GenerationJobContext = {
  userId: string;
  creditLotId: string;
  status: "pending" | "succeeded" | "failed";
};

export function generationJobKey(jobId: string) {
  return `oil-painting-job:${jobId}`;
}
