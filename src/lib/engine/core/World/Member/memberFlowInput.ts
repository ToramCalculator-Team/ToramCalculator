/**
 * 构造成员流程写入 RunOutput 的稳定输入身份。
 * 成员命名空间用于避免同一运行中不同成员复用相同业务 inputKey 时发生冲突。
 */
export function memberFlowInputId(memberId: string, inputKey: string): string {
	return `member-flow:${memberId}:${inputKey}`;
}
