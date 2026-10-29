import { Redis } from "@upstash/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generationJobKey, type GenerationJobContext } from "@/lib/generation-jobs";
import { getYirJobStatus } from "@/lib/yir";

export const maxDuration = 15;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return jsonError("Please sign in again to view your painting.", 401);

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId || jobId.length > 100) return jsonError("The painting request could not be found.", 400);

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return jsonError("The request service is not set up yet.", 503);
  const redis = new Redis({ url: redisUrl, token: redisToken });
  const key = generationJobKey(jobId);
  const context = await redis.get<GenerationJobContext>(key);
  if (!context || context.userId !== user.id) return jsonError("The painting request could not be found.", 404);
  if (context.status === "succeeded") {
    return Response.json({ status: "succeeded", resultUrl: `/api/generate/result?jobId=${encodeURIComponent(jobId)}` }, { headers: { "Cache-Control": "no-store" } });
  }
  if (context.status === "failed") return Response.json({ status: "failed", error: "The image service could not finish this painting. Your credit was returned." }, { headers: { "Cache-Control": "no-store" } });

  let status: string | undefined;
  try {
    const job = await getYirJobStatus(jobId);
    status = job.status;
  } catch (error) {
    console.error("Could not check Yir job status", error instanceof Error ? error.message : "Unknown error");
    return jsonError("We could not check your painting yet. Please wait and try again.", 502);
  }

  if (status === "succeeded") {
    await redis.set(key, { ...context, status: "succeeded" }, { ex: 60 * 60 * 24 });
    return Response.json({ status: "succeeded", resultUrl: `/api/generate/result?jobId=${encodeURIComponent(jobId)}` }, { headers: { "Cache-Control": "no-store" } });
  }

  if (status === "failed" || status === "cancelled" || status === "expired") {
    // The NX marker makes repeated browser polling safe: a failed Job returns the credit at most once.
    const shouldRefund = await redis.set(`${key}:refund`, "1", { nx: true, ex: 60 * 60 * 24 });
    if (shouldRefund) {
      const admin = createAdminClient();
      const { error } = await admin.rpc("refund_generation_credit", { p_user_id: user.id, p_credit_lot_id: context.creditLotId });
      if (error) {
        await redis.del(`${key}:refund`);
        console.error("Could not refund failed Yir generation", error);
        return jsonError("The painting failed and we could not return the credit yet. Please contact support.", 503);
      }
    }
    await redis.set(key, { ...context, status: "failed" }, { ex: 60 * 60 * 24 });
    return Response.json({ status: "failed", error: "The image service could not finish this painting. Your credit was returned." }, { headers: { "Cache-Control": "no-store" } });
  }

  return Response.json({ status: "pending" }, { headers: { "Cache-Control": "no-store" } });
}
