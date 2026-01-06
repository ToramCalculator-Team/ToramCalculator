import { useNavigate } from "@solidjs/router";

/**
 * 模拟器主页面组件
 */
export default function SimulatorPage() {
	// 导航
	const navigate = useNavigate();

	navigate(`/simulator/defaultSimulatorId`);

	return null;
}
