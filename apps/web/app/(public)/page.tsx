import { HomeView } from "../../src/components/home/home-view";
import "../../src/styles/home.css";
import { GET } from "../api/collection/route";

export const dynamic = "force-dynamic";

export default async function Home() {
  const response = await GET();
  return <HomeView data={await response.json()} />;
}
