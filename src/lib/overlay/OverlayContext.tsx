/**
 * @file OverlayContext.tsx
 * @description 弹出层作用域 Context + useOverlay hook。
 *
 * 契约:
 * - `createContext` 不传默认值 → 类型 `Context<Scope | undefined>`(SolidJS 官方推荐做法,
 *   用于让 hook 在 Provider 外调用时通过 throw 收窄类型)。
 * - `useOverlay()`:
 *   - 在**层内**调用:scope 为当前层,`push*` 可用(带 kind 断言,类型不符 throw);
 *     `close/closeTop` 作用于本层。
 *   - 在**根级**(无 Provider)调用:scope=undefined,`open*` 用 parentId=null 挂在根;
 *     `push*` 因无 scope 抛错(告诉调用者:根级没有可 push 的 layer)。
 * - 单文件 co-locate:context token + Provider + hook 全在此文件,与项目 6 月后新写的
 *   Engine/Scene/AppActor context 风格一致。
 */
import { createContext, type ParentProps, useContext } from "solid-js";
import {
	type DialogLayerEntryInit,
	type OverlayEntryApi,
	type OverlayLayerKind,
	openDialogLayer,
	openSheetLayer,
	pushDialogEntry,
	pushSheetEntry,
	requestCloseEntry,
	requestCloseLayer,
	requestCloseTopLayer,
	type SheetLayerEntryInit,
} from "./overlayStore";

// 重新导出 entry 类型,让业务页面从单一入口(OverlayContext)导入 useOverlay + 类型。
export type { DialogLayerEntryInit, OverlayEntryApi, SheetLayerEntryInit } from "./overlayStore";

interface OverlayScope {
	layerId: string;
	kind: OverlayLayerKind;
}

const OverlayScopeContext = createContext<OverlayScope>();

/** 每层容器渲染 entry 时外包,注入当前层的 scope。 */
export function OverlayScopeProvider(props: ParentProps<OverlayScope>) {
	return (
		<OverlayScopeContext.Provider value={{ layerId: props.layerId, kind: props.kind }}>
			{props.children}
		</OverlayScopeContext.Provider>
	);
}

export interface OverlayApi {
	/** 新建 dialog layer,作为当前 scope 的子层(或根)。 */
	openDialog: (entry: DialogLayerEntryInit) => OverlayLayerHandle;
	/** 新建 sheet layer,作为当前 scope 的子层(或根)。 */
	openSheet: (entry: SheetLayerEntryInit) => OverlayLayerHandle;
	/**
	 * 并入**当前 dialog layer**再加一个 entry(dialog 内 drill 关联数据的语义)。
	 * 契约:当前 scope 必须是 kind="dialog" 的层,否则 throw ——
	 * 这种错误使用意味着调用点搞错了打开语义,应该显式暴露而不是静默降级。
	 */
	pushDialog: (entry: DialogLayerEntryInit) => string;
	/** 并入当前 sheet layer 追加一个 sheet entry(通常 sheet layer 只有一条,较少用到)。 */
	pushSheet: (entry: SheetLayerEntryInit) => string;
	/** 关闭当前层(级联关闭其所有后代层)。根级调用(无 scope)将 throw。 */
	close: () => void;
	/** 关闭最顶层(Escape / 遮罩点击场景)。任何 scope 下都可用。 */
	closeTop: () => void;
}

export interface OverlayLayerHandle {
	readonly layerId: string;
	close: () => void;
}

/**
 * 读取当前 overlay 作用域并返回操作 API。
 *
 * 在 Provider 外(根级)调用时返回"根 scope 实现":`open*` 用 parentId=null 挂根;
 * `push*` 因无当前 layer 抛错;`close` 因无当前层抛错(告知调用者应改用 closeTop 或指定层)。
 */
export function useOverlay(): OverlayApi {
	const scope = useContext(OverlayScopeContext);

	return {
		openDialog(entry) {
			const { layerId } = openDialogLayer(entry, scope?.layerId ?? null);
			return createLayerHandle(layerId);
		},
		openSheet(entry) {
			const { layerId } = openSheetLayer(entry, scope?.layerId ?? null);
			return createLayerHandle(layerId);
		},
		pushDialog(entry) {
			if (!scope) {
				throw new Error("pushDialog 只能在 dialog layer 内调用(根级请用 openDialog 新建一层)");
			}
			if (scope.kind !== "dialog") {
				throw new Error(`pushDialog 只能在 dialog layer 内调用,当前层是 ${scope.kind};你可能想用 openDialog 新建一层`);
			}
			return pushDialogEntry(scope.layerId, entry);
		},
		pushSheet(entry) {
			if (!scope) {
				throw new Error("pushSheet 只能在 sheet layer 内调用(根级请用 openSheet 新建一层)");
			}
			if (scope.kind !== "sheet") {
				throw new Error(`pushSheet 只能在 sheet layer 内调用,当前层是 ${scope.kind};你可能想用 openSheet 新建一层`);
			}
			return pushSheetEntry(scope.layerId, entry);
		},
		close() {
			if (!scope) {
				throw new Error("close 只能在层内调用(根级请用 closeTop 或指定 layerId)");
			}
			requestCloseLayer(scope.layerId);
		},
		closeTop() {
			requestCloseTopLayer();
		},
	};
}

function createLayerHandle(layerId: string): OverlayLayerHandle {
	return {
		layerId,
		close: () => requestCloseLayer(layerId),
	};
}

/**
 * 层内向调用者暴露的 entry-scoped API,由容器渲染 entry 时构造并传入 render(api)。
 * 与 useOverlay 不同:它作用于**具体 entry**而非层,用来在 render 闭包里 close 自己。
 * 保留 index/total 是为了让 layer 内 entry 栈动画在容器侧稳定派生。
 */
export function makeEntryApi(deps: {
	layerId: string;
	entryId: string;
	index: () => number;
	total: () => number;
}): OverlayEntryApi {
	return {
		get id() {
			return deps.entryId;
		},
		get index() {
			return deps.index();
		},
		get total() {
			return deps.total();
		},
		close: () => requestCloseEntry(deps.layerId, deps.entryId),
		closeTop: () => requestCloseEntry(deps.layerId),
	};
}
