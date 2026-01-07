/**
 * 添加成员控制器按钮组件
 *
 * 功能：
 * - 显示"添加控制器"按钮
 * - 点击后弹出成员选择对话框（仅显示未绑定成员）
 * - 选择成员后创建并绑定控制器
 */

import { createSignal, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import type { MemberSerializeData } from "../core/Member/Member";
import { Icons } from "~/components/icons";

interface AddMemberControllerButtonProps {
	unboundMembers: () => MemberSerializeData[];
	onAdd: (memberId: string) => Promise<void>;
}

export function AddMemberControllerButton(props: AddMemberControllerButtonProps) {
	const [showDialog, setShowDialog] = createSignal(false);
	// 对话框内的临时选择状态（不是"选中成员"概念，避免与旧概念混淆）
	const [pendingMemberId, setPendingMemberId] = createSignal<string | null>(null);
	const [isAdding, setIsAdding] = createSignal(false);

	const handleAdd = async () => {
		const memberId = pendingMemberId();
		if (!memberId) return;

		setIsAdding(true);
		try {
			await props.onAdd(memberId);
			setShowDialog(false);
			setPendingMemberId(null);
		} catch (error) {
			console.error("添加成员控制器失败:", error);
		} finally {
			setIsAdding(false);
		}
	};

	return (
		<div class="flex items-center gap-2">
			<Button onClick={() => setShowDialog(true)} disabled={props.unboundMembers().length === 0} class="w-full">
				<Icons.Outline.AddUser />
			</Button>

			<Show when={showDialog()}>
				<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div class="bg-area-color rounded-lg p-6 shadow-lg">
						<h3 class="mb-4 text-lg font-semibold">选择要控制的成员</h3>

						<Select
							options={props.unboundMembers().map((m) => ({
								value: m.id,
								label: `${m.name} (${m.type})`,
							}))}
							value={pendingMemberId() ?? ""}
							setValue={(value) => setPendingMemberId(value || null)}
							placeholder="选择成员..."
							class="mb-4 w-full"
						/>

						<div class="flex gap-2">
							<Button onClick={handleAdd} disabled={!pendingMemberId() || isAdding()} class="flex-1">
								{isAdding() ? "添加中..." : "添加"}
							</Button>
							<Button
								onClick={() => {
									setShowDialog(false);
									setPendingMemberId(null);
								}}
								class="flex-1"
								level="secondary"
							>
								取消
							</Button>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
}
