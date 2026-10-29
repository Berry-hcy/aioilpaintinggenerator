import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";
import { generationJobKey, type GenerationJobContext } from "@/lib/generation-jobs";
import { getYirJob } from "@/lib/yir";

export const maxDuration = 30;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return jsonError("Please sign in again to download your painting.", 401);

  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  if (!jobId || jobId.length > 100) return jsonError("The painting could not be found.", 400);

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return jsonError("The request service is not set up yet.", 503);
  const context = await new Redis({ url: redisUrl, token: redisToken }).get<GenerationJobContext>(generationJobKey(jobId));
  if (!context || context.userId !== user.id || context.status !== "succeeded") return jsonError("The painting could not be found.", 404);

  try {
    const job = await getYirJob(jobId);
    const file = job.result?.files?.[0];
    if (!file?.url) return jsonError("The painting is not ready to download yet.", 409);

    const resultUrl = new URL(file.url);
    if (resultUrl.protocol !== "https:") return jsonError("The painting download link is invalid.", 502);
    const imageResponse = await fetch(resultUrl, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!imageResponse.ok || !imageResponse.body) return jsonError("The painting download is temporarily unavailable. Please try again.", 502);

    const candidateType = file.media_type || imageResponse.headers.get("content-type")?.split(";")[0] || "image/png";
    const contentType = ["image/png", "image/jpeg", "image/webp"].includes(candidateType) ? candidateType : "image/png";
    const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(imageResponse.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="my-oil-painting.${extension}"`,
        "Cache-Control": "private, no-store",
        ...(imageResponse.headers.get("content-length") ? { "Content-Length": imageResponse.headers.get("content-length")! } : {}),
      },
    });
  } catch (error) {
    console.error("Could not retrieve Yir result", error instanceof Error ? error.message : "Unknown error");
    return jsonError("The painting download is temporarily unavailable. Please try again.", 502);
  }
}
