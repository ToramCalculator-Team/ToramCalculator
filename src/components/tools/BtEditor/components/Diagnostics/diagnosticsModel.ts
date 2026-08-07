import type { BtAuthoringDiagnostic, BtAuthoringDiagnosticSeverity } from "../../model/authoringValidator";
import {
	type EditableBtDocument,
	findEditableDocumentNode,
	getEditableNodeCaption,
	getEditableRootDisplayName,
} from "../../model/editableTree";

export type BtDiagnosticListItem = {
	id: string;
	severity: BtAuthoringDiagnosticSeverity;
	source: "authoring" | "preview" | "definition";
	code: string;
	rootKey?: string;
	nodeId?: string;
	rootLabel?: string;
	nodeSummary?: string;
	message: string;
};

export const severityRank = (severity: BtAuthoringDiagnosticSeverity): number => {
	if (severity === "error") return 0;
	if (severity === "warning") return 1;
	return 2;
};

export const severityLabel = (severity: BtAuthoringDiagnosticSeverity): string => {
	if (severity === "error") return "Error";
	if (severity === "warning") return "Warning";
	return "Info";
};

export const sourceLabel = (source: BtDiagnosticListItem["source"]): string => {
	if (source === "preview") return "Preview";
	if (source === "definition") return "Definition";
	return "Authoring";
};

export const severityClass = (severity: BtAuthoringDiagnosticSeverity): string => {
	if (severity === "warning") return "bg-amber-500/10 text-amber-600";
	if (severity === "info") return "bg-area-color text-main-text-color";
	return "bg-brand-color-3rd/10 text-brand-color-3rd";
};

export const toDiagnosticListItem = (
	diagnostic: BtAuthoringDiagnostic,
	source: "authoring" | "preview",
	document: EditableBtDocument,
): BtDiagnosticListItem => {
	const root = diagnostic.rootKey ? document.roots.find((item) => item.key === diagnostic.rootKey) : undefined;
	const nodeResult = diagnostic.nodeId ? findEditableDocumentNode(document, diagnostic.nodeId) : undefined;
	return {
		id: `${source}:${diagnostic.severity}:${diagnostic.code}:${diagnostic.rootKey ?? ""}:${diagnostic.nodeId ?? ""}:${diagnostic.message}`,
		severity: diagnostic.severity,
		source,
		code: diagnostic.code,
		rootKey: diagnostic.rootKey,
		nodeId: diagnostic.nodeId,
		rootLabel: root ? getEditableRootDisplayName(root) : undefined,
		nodeSummary: nodeResult ? getEditableNodeCaption(nodeResult.node) : undefined,
		message: diagnostic.message,
	};
};
