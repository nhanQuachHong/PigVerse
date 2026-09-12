import { CollectionView } from "../../../src/components/collection/collection-view";
import { GET } from "../../api/collection/route";
import "../../../src/styles/collection.css";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const response = await GET();
  return <CollectionView data={await response.json()} />;
}
