import OpenAI, { toFile } from "openai";
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

  const apiKey = process.env.OPENAI_API_KEY;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!apiKey) return jsonError("Image generation is not set up yet. Please try again later.", 503);
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

  const { data: consumed, error: consumeError } = await admin.rpc("consume_generation_credit", { p_user_id: user.id });
  if (consumeError) {
    console.error("Could not use generation credit", consumeError);
    return jsonError("We couldn’t check your painting credits. Please try again shortly.", 503);
  }
  if (!consumed) return Response.json({ error: "You’re out of painting credits. More purchase options will be available soon.", code: "NO_CREDITS" }, { status: 402 });

  async function refundCredit() {
    try {
      const { error } = await admin.rpc("refund_generation_credit", { p_user_id: user.id });
      if (error) console.error("Could not refund generation credit", error);
    } catch (error) {
      console.error("Could not refund generation credit", error);
    }
  }

  try {
    const openai = new OpenAI({ apiKey, timeout: 55_000, maxRetries: 1 });
    const inputFile = await toFile(Buffer.from(await image.arrayBuffer()), image.name || "photo", { type: image.type });
    const response = await openai.images.edit({
      model: "gpt-image-2.5-sunburst",
      image: inputFile,
      prompt: "Transform the uploaded photo into a beautiful traditional oil painting. Preserve the main subject, recognizable features, pose, and composition. Use visible layered brushstrokes, rich but natural pigments, subtle canvas texture, and painterly light. Make it feel like a carefully hand-painted fine-art oil portrait. Do not add text, borders, or new subjects.",
      quality: "medium",
      size: "auto",
      output_format: "jpeg",
      output_compression: 70,
    });
    const encoded = response.data?.[0]?.b64_json;
    if (!encoded) {
      await refundCredit();
      return jsonError("The image service returned no painting. Your credit was returned; please try again.", 502);
    }
    return Response.json({ image: `data:image/jpeg;base64,${encoded}` }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await refundCredit();
    console.error("Image generation failed", error);
    if (error instanceof OpenAI.APIError && error.status === 429) {
      return jsonError("The image service is busy or its usage limit has been reached. Please try again later.", 429);
    }
    if (error instanceof OpenAI.APIError && error.status === 401) {
      return jsonError("The image service key needs attention. Please contact the site owner.", 503);
    }
    return jsonError("We couldn’t make your painting this time. Please try again later.", 502);
  }
}
