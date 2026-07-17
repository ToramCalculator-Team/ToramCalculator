import type { CharacterEdit } from "../edit/characterEditProtocol";

export type CharacterEditQueueSnapshot =
	| { status: "idle"; error?: never }
	| { status: "committing"; error?: never }
	| { status: "failed"; error: string };

type QueuedCharacterEdit = {
	characterId: string;
	edit: CharacterEdit;
};

export type CharacterEditQueueOptions = {
	persistBatch(characterId: string, edits: readonly CharacterEdit[]): Promise<void>;
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * 机体配置本地自动保存队列。
 * 空闲时立即启动首批，提交期间到达的操作保持原序组成下一原子批次；失败批次只能显式重试或放弃。
 */
export class CharacterEditQueue {
	private readonly listeners = new Set<(snapshot: CharacterEditQueueSnapshot) => void>();
	private queued: QueuedCharacterEdit[] = [];
	private committing: QueuedCharacterEdit[] | null = null;
	private failed: { batch: QueuedCharacterEdit[]; error: string } | null = null;
	private stopped = false;

	constructor(private readonly options: CharacterEditQueueOptions) {}

	getSnapshot(): CharacterEditQueueSnapshot {
		if (this.failed) return { status: "failed", error: this.failed.error };
		if (this.committing) return { status: "committing" };
		return { status: "idle" };
	}

	subscribe(listener: (snapshot: CharacterEditQueueSnapshot) => void): () => void {
		this.listeners.add(listener);
		listener(this.getSnapshot());
		return () => this.listeners.delete(listener);
	}

	accept(characterId: string, edit: CharacterEdit): void {
		if (this.stopped) throw new Error("CharacterEditQueue 已停止");
		if (this.failed) throw new Error("CharacterEditQueue 存在待处理的失败批次");
		this.queued.push({ characterId, edit });
		this.drain();
	}

	retryFailed(): void {
		if (this.stopped) throw new Error("CharacterEditQueue 已停止");
		const failed = this.failed;
		if (!failed) return;
		this.failed = null;
		this.startCommit(failed.batch);
	}

	discardFailed(): void {
		if (this.stopped) throw new Error("CharacterEditQueue 已停止");
		if (!this.failed) return;
		this.failed = null;
		this.emit();
		this.drain();
	}

	stop(): void {
		if (this.stopped) return;
		this.stopped = true;
		this.queued = [];
		this.listeners.clear();
	}

	private drain(): void {
		if (this.stopped || this.failed || this.committing || this.queued.length === 0) return;
		this.startCommit(this.queued.splice(0));
	}

	private startCommit(batch: QueuedCharacterEdit[]): void {
		const characterId = batch[0]?.characterId;
		if (!characterId || batch.some((entry) => entry.characterId !== characterId)) {
			throw new Error("CharacterEditQueue 批次包含多个机体身份");
		}
		this.committing = batch;
		this.emit();
		void this.commit(characterId, batch);
	}

	private async commit(characterId: string, batch: QueuedCharacterEdit[]): Promise<void> {
		try {
			await this.options.persistBatch(
				characterId,
				batch.map((entry) => entry.edit),
			);
			if (this.committing === batch) this.committing = null;
		} catch (error) {
			if (this.committing === batch) {
				this.committing = null;
				this.failed = { batch, error: errorMessage(error) };
			}
		} finally {
			if (!this.stopped) {
				this.emit();
				this.drain();
			}
		}
	}

	private emit(): void {
		if (this.stopped) return;
		const snapshot = this.getSnapshot();
		for (const listener of this.listeners) listener(snapshot);
	}
}
