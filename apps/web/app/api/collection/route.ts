import { getPublicCollection } from "../../../src/lib/public-collection";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getPublicCollection(), {
    headers: { "Cache-Control": "no-store" },
  });
}
