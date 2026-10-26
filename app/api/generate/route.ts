import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!accountId || !apiToken) return jsonError("Image generation is not set up yet. Please try again later.", 503);
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

  try {
    const ratelimit = new Ratelimit({
      redis: new Redis({ url: redisUrl, token: redisToken }),
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

  const { data: consumedRows, error: consumeError } = await admin.rpc("consume_generation_credit", { p_user_id: userId });
  if (consumeError) {
    console.error("Could not use generation credit", consumeError);
    return jsonError("We couldn’t check your painting credits. Please try again shortly.", 503);
  }
  const consumed = Array.isArray(consumedRows) ? consumedRows[0] as { credit_lot_id: string; quality: string } | undefined : undefined;
  if (!consumed) return Response.json({ error: "You’re out of painting credits. Choose a pack below to get more.", code: "NO_CREDITS" }, { status: 402 });
  const creditLotId = consumed.credit_lot_id;
  const creditQuality = consumed.quality;

  async function refundCredit() {
    try {
      const { error } = await admin.rpc("refund_generation_credit", { p_user_id: userId, p_credit_lot_id: creditLotId });
      if (error) console.error("Could not refund generation credit", error);
    } catch (error) {
      console.error("Could not refund generation credit", error);
    }
  }

  try {
    const body = new FormData();
    body.set("prompt", "Transform this uploaded photo into a beautiful traditional oil painting. Preserve the main subject, recognizable features, pose, and composition. Use visible layered brushstrokes, rich but natural pigments, subtle canvas texture, and painterly light. Make it feel like a carefully hand-painted fine-art oil portrait. Do not add text, borders, or new subjects.");
    body.set("input_image_0", new Blob([await image.arrayBuffer()], { type: image.type }), image.name || "photo");
    // Cloudflare's image-edit endpoint accepts reference images smaller than 512×512.
    // The browser prepares a 511px maximum side image before it reaches this endpoint.
    const outputSize = creditQuality === "hd" ? "1536" : "1024";
    body.set("width", outputSize);
    body.set("height", outputSize);
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}` },
        body,
        signal: AbortSignal.timeout(55_000),
        cache: "no-store",
      },
    );
    const payload = await response.json().catch(() => null) as {
      success?: boolean;
      result?: { image?: string };
      errors?: Array<{ message?: string }>;
    } | null;
    const encoded = payload?.result?.image;
    if (!encoded) {
      await refundCredit();
      console.error("Cloudflare image generation returned no image", { status: response.status, errors: payload?.errors?.map((item) => item.message) });
      if (response.status === 429) {
        return jsonError("The free image service limit may have been reached. Please try again later.", 429);
      }
      if (response.status === 401 || response.status === 403) {
        return jsonError("The image service connection needs attention. Please contact the site owner.", 503);
      }
      return jsonError("The image service returned no painting. Your credit was returned; please try again.", 502);
    }
    if (!response.ok || payload?.success === false) {
      await refundCredit();
      console.error("Cloudflare image generation failed", { status: response.status, errors: payload?.errors?.map((item) => item.message) });
      if (response.status === 429) return jsonError("The free image service limit may have been reached. Please try again later.", 429);
      if (response.status === 401 || response.status === 403) return jsonError("The image service connection needs attention. Please contact the site owner.", 503);
      return jsonError("We couldn’t make your painting this time. Your credit was returned; please try again later.", 502);
    }
    return Response.json({ image: `data:image/png;base64,${encoded}` }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await refundCredit();
    console.error("Image generation request failed", error instanceof Error ? error.name : "Unknown error");
    if (error instanceof DOMException && error.name === "TimeoutError") return jsonError("The image service took too long to respond. Your credit was returned; please try again.", 504);
    return jsonError("We couldn’t make your painting this time. Please try again later.", 502);
  }
}
