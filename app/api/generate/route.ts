import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generationJobKey, type GenerationJobContext } from "@/lib/generation-jobs";
import { submitYirPainting, uploadYirReference } from "@/lib/yir";

export const maxDuration = 60;

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const JOB_TTL_SECONDS = 60 * 60 * 24;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return jsonError("The account service is not set up yet. Please try again later.", 503);
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in with Google before creating a painting.", code: "AUTH_REQUIRED" }, { status: 401 });
  const userId = user.id;

  const yirApiKey = process.env.YIR_API_KEY;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!yirApiKey) return jsonError("Image generation is not set up yet. Please try again later.", 503);
  if (!redisUrl || !redisToken) return jsonError("The request limit service is not set up yet. Please try again later.", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Please upload a valid image file.", 400);
  }
  const image = form.get("image");
  if (!(image instanceof File)) return jsonError("Choose a photo before creating your painting.", 400);
  if (!ACCEPTED_TYPES.has(image.type)) return jsonError("Please choose a JPG, PNG, or WebP image.", 415);
  if (image.size === 0) return jsonError("This image file is empty. Please choose another one.", 400);
  if (image.size > MAX_FILE_SIZE) return jsonError("This image is over 4 MB. Please choose a smaller one.", 413);

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "local-development";
  const redis = new Redis({ url: redisUrl, token: redisToken });

  try {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "10 m"),
      prefix: "oil-painting-generate",
    });
    const limit = await ratelimit.limit(ip);
    if (!limit.success) {
      return Response.json(
        { error: "You’ve made several paintings recently. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))) } },
      );
    }
  } catch (error) {
    console.error("Request limit check failed", error);
    return jsonError("We couldn’t check the request limit. Please try again shortly.", 503);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Credit service is not configured", error);
    return jsonError("The account service is not set up yet. Please try again later.", 503);
  }

  const { data: consumedRows, error: consumeError } = await admin.rpc("consume_generation_credit", { p_user_id: user.id });
  if (consumeError) {
    console.error("Could not use generation credit", consumeError);
    return jsonError("We couldn’t check your painting credits. Please try again shortly.", 503);
  }
  const consumed = Array.isArray(consumedRows) ? consumedRows[0] as { credit_lot_id: string; quality: string } | undefined : undefined;
  if (!consumed) return Response.json({ error: "You’re out of painting credits. Choose a pack below to get more.", code: "NO_CREDITS" }, { status: 402 });
  const creditLotId = consumed.credit_lot_id;

  async function refundCredit() {
    const { error } = await admin.rpc("refund_generation_credit", { p_user_id: userId, p_credit_lot_id: creditLotId });
    if (error) console.error("Could not refund generation credit", error);
  }

  try {
    const referenceId = await uploadYirReference(image);
    const jobId = await submitYirPainting(referenceId, consumed.quality === "hd");
    const context: GenerationJobContext = { userId, creditLotId, status: "pending" };
    await redis.set(generationJobKey(jobId), context, { ex: JOB_TTL_SECONDS });
    return Response.json({ jobId, status: "pending" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await refundCredit();
    console.error("Yir image request failed", error instanceof Error ? error.message : "Unknown error");
    return jsonError("We couldn’t start your painting. Your credit was returned; please try again.", 502);
  }
}
