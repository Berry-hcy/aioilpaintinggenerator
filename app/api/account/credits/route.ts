import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_available_generation_credits", { p_user_id: user.id });
    if (error) throw error;
    return Response.json({ credits: Number(data ?? 0) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not refresh painting credits", error);
    return Response.json({ error: "Could not load credits." }, { status: 503 });
  }
}
