import { useParams } from "@solidjs/router";

export default function CharactePage() {
  const params = useParams();
  return <div>{params.characterId}</div>;
}