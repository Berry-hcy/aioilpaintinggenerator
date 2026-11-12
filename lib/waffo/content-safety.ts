import { ScanSemanticMode, WaffoPancakeError } from "@waffo/pancake-ts";
import { createWaffoClient } from "@/lib/waffo/client";

const retryDelaysMs = [5_000, 10_000];

export async function scanGenerationPrompt(prompt: string) {
  const client = createWaffoClient();

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.contentSafety.scanPrompt({
        prompt,
        locale: "en",
        semantic: ScanSemanticMode.Enforce,
      });
    } catch (error) {
      const shouldRetry = error instanceof WaffoPancakeError
        && error.status >= 500
        && attempt < retryDelaysMs.length;
      if (!shouldRetry) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]));
    }
  }
}
