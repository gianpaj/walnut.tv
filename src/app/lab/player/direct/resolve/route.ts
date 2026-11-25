import { resolveVideo } from "../resolver";

export async function GET(request: Request) {
  const { body, status } = await resolveVideo(new URL(request.url).searchParams.get("id"));
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
