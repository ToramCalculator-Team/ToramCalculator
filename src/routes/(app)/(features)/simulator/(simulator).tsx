import { selectSimulatorByIdWithRelations } from "@db/generated/repositories/simulator";
import { createEffect, createResource, Show } from "solid-js";
import RealtimeSimulator from "~/components/features/simulator/RealtimeSimulator";
import { useNavigate, useParams } from "@solidjs/router";

/**
 * 模拟器主页面组件
 */
export default function SimulatorPage() {
  // 导航
  const navigate = useNavigate();

  navigate(`/simulator/defaultSimulatorId`);

  return (<></>);
}
