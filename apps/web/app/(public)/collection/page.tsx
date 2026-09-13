import { CollectionView } from "../../../src/components/collection/collection-view";
import { getPublicCollection } from "../../../src/lib/public-collection";
import "../../../src/styles/collection.css";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  return <CollectionView data={await getPublicCollection()} />;
}
