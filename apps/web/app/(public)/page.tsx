import { HomeView } from "../../src/components/home/home-view";
import { getPublicCollection } from "../../src/lib/public-collection";
import "../../src/styles/home.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <HomeView data={await getPublicCollection()} />;
}
