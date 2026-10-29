const YIR_API_BASE = "https://gateway.yir.ai/v1";
export const YIR_MODEL = "openai/gpt-image-2.5-sunburst";

function apiKey() {
  const key = process.env.YIR_API_KEY;
  if (!key) throw new Error("Yir image generation is not configured.");
  return key;
}

export async function yirRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey()}`);
  return fetch(`${YIR_API_BASE}${path}`, { ...init, headers, cache: "no-store" });
}

type YirFilePlan = {
  files?: Array<{
    id: string;
    status: string;
    upload?: { parts?: Array<{ url: string }> };
  }>;
  error?: { message?: string };
};

export async function uploadYirReference(image: File) {
  const planResponse = await yirRequest("/files", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ files: [{ name: image.name || "photo.jpg", media_type: image.type, size: image.size }] }),
    signal: AbortSignal.timeout(12_000),
  });
  const plan = await planResponse.json().catch(() => null) as YirFilePlan | null;
  const file = plan?.files?.[0];
  const uploadUrl = file?.upload?.parts?.[0]?.url;
  if (!planResponse.ok || !file?.id || !uploadUrl) throw new Error("The image service could not accept this photo.");

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": image.type },
    body: image,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!uploadResponse.ok) throw new Error("The photo could not be uploaded for processing.");

  const completeResponse = await yirRequest(`/files/${encodeURIComponent(file.id)}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(10_000),
  });
  if (!completeResponse.ok) throw new Error("The image service could not prepare this photo.");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const statusResponse = await yirRequest(`/files/${encodeURIComponent(file.id)}`, { signal: AbortSignal.timeout(4_000) });
    const status = await statusResponse.json().catch(() => null) as { status?: string } | null;
    if (!statusResponse.ok) throw new Error("The image service could not prepare this photo.");
    if (status?.status === "ready") return file.id;
    if (status?.status === "failed" || status?.status === "expired") throw new Error("The image service could not prepare this photo.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The photo is taking too long to prepare. Please try again.");
}

export async function submitYirPainting(fileId: string, hd: boolean) {
  const response = await yirRequest("/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      model: YIR_MODEL,
      input: {
        type: "image",
        prompt: "Transform this uploaded photo into a beautiful traditional oil painting. Preserve the main subject, recognizable features, pose, and composition. Use visible layered brushstrokes, rich but natural pigments, subtle canvas texture, and painterly light. Make it feel like a carefully hand-painted fine-art oil portrait. Do not add text, borders, or new subjects.",
        references: [{ role: "reference_image", file_id: fileId }],
      },
      parameters: {
        resolution: hd ? "2K" : "1K",
        aspect_ratio: "auto",
        quality: "medium",
        n: 1,
      },
      max_cost: hd ? 0.15 : 0.05,
      routing: { preference: "cost", fallback: true },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const job = await response.json().catch(() => null) as { id?: string; error?: { message?: string } } | null;
  if (!response.ok || !job?.id) throw new Error("The image service could not start this painting.");
  return job.id;
}

export type YirJob = {
  id?: string;
  status?: string;
  error?: { message?: string; code?: string } | null;
  result?: { files?: Array<{ url?: string; media_type?: string; width?: number; height?: number }> } | null;
};

export async function getYirJob(jobId: string) {
  const response = await yirRequest(`/jobs/${encodeURIComponent(jobId)}`, { signal: AbortSignal.timeout(10_000) });
  const job = await response.json().catch(() => null) as YirJob | null;
  if (!response.ok || !job) throw new Error("The image service could not check this painting.");
  return job;
}

export async function getYirJobStatus(jobId: string) {
  const response = await yirRequest(`/jobs/${encodeURIComponent(jobId)}/status`, { signal: AbortSignal.timeout(8_000) });
  const job = await response.json().catch(() => null) as YirJob | null;
  if (!response.ok || !job) throw new Error("The image service could not check this painting.");
  return job;
}
