import { StatsRenderer } from "~/engine/core/World/Member/MemberStatusPanel";

/** 只渲染调用方已经计算好的机体属性，不启动验证或读取 CharacterSession。 */
export function CharacterAttributePreviewPanel(props: { data?: object }) {
	return <StatsRenderer data={props.data} />;
}
