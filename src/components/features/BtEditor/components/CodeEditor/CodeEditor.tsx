import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker&url";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker&url";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker&url";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker&url";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker&url";
import { type Component, createEffect, onCleanup, onMount } from "solid-js";
import { rgbToBase16 } from "~/lib/utils/color";
import { store } from "~/store";
import { mdslLanguageDefinition } from "../../modes/mdsl";
import {
	defaultMdslIntellisenseRegistry,
	type MdslCallableSpec,
	type MdslIntellisenseRegistry,
	type MdslTypeSpec,
} from "../../modes/mdslIntellisense";

// 配置 Monaco Editor 的 worker
if (typeof window !== "undefined" && !self.MonacoEnvironment) {
	self.MonacoEnvironment = {
		getWorkerUrl: (_moduleId: string, label: string) => {
			if (label === "json") {
				return JsonWorker;
			}
			if (label === "css" || label === "scss" || label === "less") {
				return CssWorker;
			}
			if (label === "html" || label === "handlebars" || label === "razor") {
				return HtmlWorker;
			}
			if (label === "typescript" || label === "javascript") {
				return TsWorker;
			}
			// 默认 editor worker（用于 MDSL 和其他语言）
			return EditorWorker;
		},
	};
}

export type CodeEditorProps = {
	value: string;
	mode?: "mdsl" | "json" | "javascript";
	theme?: string;
	readOnly?: boolean;
	onChange?: (value: string) => void;
	class?: string;
	style?: string | Record<string, string>;
	/** MDSL 的补全/诊断配置；不传则使用 simulator 默认注册表（CommonActions/GlobalCondition + DefaultAgent） */
	mdslIntellisense?: MdslIntellisenseRegistry;
};

// 注册 MDSL 语言（只需要注册一次）
let languageInitialized = false;
let mdslProvidersInitialized = false;
let currentMdslRegistry: MdslIntellisenseRegistry | null = null;

const getMdslRegistry = () => {
	if (!currentMdslRegistry) {
		currentMdslRegistry = defaultMdslIntellisenseRegistry();
	}
	return currentMdslRegistry;
};

const getDefaultCompletionRange = (
	model: monaco.editor.ITextModel,
	position: monaco.Position,
) => {
	const word = model.getWordUntilPosition(position);
	return new monaco.Range(
		position.lineNumber,
		word.startColumn,
		position.lineNumber,
		word.endColumn,
	);
};

type ParsedArg = {
	raw: string;
	startOffset: number;
	endOffset: number;
	kind: "string" | "number" | "boolean" | "null" | "property" | "identifier";
};

const hasTrailingComma = (text: string) => text.trimEnd().endsWith(",");

const parseSimpleArgList = (
	text: string,
	absoluteStartOffset: number,
): ParsedArg[] => {
	const args: ParsedArg[] = [];
	let i = 0;
	let current = "";
	let currentStart = 0;
	let inString: '"' | null = null;

	const flush = (endIndexExclusive: number) => {
		const raw = current.trim();
		if (!raw) {
			current = "";
			return;
		}
		const rawStartInLocal =
			currentStart + (current.length - current.trimStart().length);
		const startOffset = absoluteStartOffset + rawStartInLocal;
		const endOffset = absoluteStartOffset + endIndexExclusive;

		let kind: ParsedArg["kind"] = "identifier";
		if (raw.startsWith("$") && raw.length > 1) kind = "property";
		else if (raw === "true" || raw === "false") kind = "boolean";
		else if (raw === "null") kind = "null";
		else if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2)
			kind = "string";
		else if (!Number.isNaN(Number(raw))) kind = "number";
		else kind = "identifier";

		args.push({ raw, startOffset, endOffset, kind });
		current = "";
	};

	while (i < text.length) {
		const ch = text[i];
		if (inString) {
			current += ch;
			if (ch === inString) {
				inString = null;
			}
			i++;
			continue;
		}
		if (ch === '"') {
			if (current.length === 0) currentStart = i;
			inString = '"';
			current += ch;
			i++;
			continue;
		}
		if (ch === ",") {
			flush(i);
			i++;
			continue;
		}
		if (current.length === 0) currentStart = i;
		current += ch;
		i++;
	}
	flush(text.length);
	return args;
};

const typeSpecLabel = (spec: MdslTypeSpec): string => {
	if (spec.kind === "enum") return `enum(${spec.values.join(" | ")})`;
	return spec.type;
};

const callableSignatureLabel = (spec: MdslCallableSpec): string => {
	const params = spec.params
		.map((p) => `${p.label}: ${typeSpecLabel(p.type)}`)
		.join(", ");
	return `${spec.name}(${params})`;
};

const callableDocumentation = (
	spec: MdslCallableSpec,
): monaco.IMarkdownString => {
	const lines: string[] = [];
	lines.push(`**${spec.name}**`);
	if (spec.description) lines.push(`\n${spec.description}`);
	if (spec.params.length) {
		lines.push(`\n**参数**`);
		for (const p of spec.params) {
			const head = `- \`${p.label}\`: \`${typeSpecLabel(p.type)}\``;
			lines.push(p.description ? `${head} — ${p.description}` : head);
		}
	}
	return { value: lines.join("\n") };
};

const isValueCompatible = (
	arg: ParsedArg,
	expected: MdslTypeSpec,
	registry: MdslIntellisenseRegistry,
): boolean => {
	if (arg.kind === "property") {
		const propName = arg.raw.slice(1);
		const propType = registry.properties[propName];
		// 没有类型信息时，先放行（避免过度误报）
		if (!propType) return true;
		// enum 要求 property 至少是 string/enum 才算兼容
		if (expected.kind === "enum") {
			return (
				propType.kind === "enum" ||
				(propType.kind === "primitive" && propType.type === "string")
			);
		}
		// primitive：严格匹配
		if (expected.kind === "primitive") {
			if (expected.type === "unknown") return true;
			return (
				propType.kind === "primitive" &&
				(propType.type === expected.type || propType.type === "unknown")
			);
		}
		return true;
	}

	if (expected.kind === "enum") {
		// MDSL 里 enum 通常会写成 identifier（physical）或 string（"physical"）
		const v =
			arg.raw.startsWith('"') && arg.raw.endsWith('"')
				? arg.raw.slice(1, -1)
				: arg.raw;
		// 但在 mistreevous 的 MDSL 解析器里，除 action/condition 名称外，不允许 identifier 作为参数值
		return arg.kind === "string" ? expected.values.includes(v) : false;
	}

	// primitive
	switch (expected.type) {
		case "string":
			// MDSL 参数里的 string 必须是引号包裹的 string literal
			return arg.kind === "string";
		case "number":
			return arg.kind === "number";
		case "boolean":
			return arg.kind === "boolean";
		case "null":
			return arg.kind === "null";
		case "unknown":
			return true;
	}
};

const getEnclosingByKeyword = (
	model: monaco.editor.ITextModel,
	offset: number,
): {
	keyword: "action" | "condition";
	openOffset: number;
	closeOffset: number;
} | null => {
	const text = model.getValue();
	const windowStart = Math.max(0, offset - 2000);
	const slice = text.slice(windowStart, offset);

	const findLast = (kw: "action" | "condition") => {
		const re = new RegExp(`\\b${kw}\\b\\s*\\[`, "gi");
		let last: RegExpExecArray | null = null;
		for (;;) {
			const m = re.exec(slice);
			if (!m) break;
			last = m;
		}
		return last;
	};

	const a = findLast("action");
	const c = findLast("condition");
	const last = !a ? c : !c ? a : a.index > c.index ? a : c;
	if (!last) return null;

	const keyword = last[0].toLowerCase().includes("condition")
		? "condition"
		: "action";
	const openOffset = windowStart + last.index + last[0].lastIndexOf("[");

	// 确认未闭合：从 openOffset 到 offset 之间不能出现 ']'
	const between = text.slice(openOffset, offset);
	if (between.includes("]")) return null;

	// 找到右侧最近的 ']'（用于 marker 范围）
	const closeOffset = (() => {
		const idx = text.indexOf("]", openOffset);
		return idx === -1 ? offset : idx + 1;
	})();

	return { keyword, openOffset, closeOffset };
};

const getEnclosingAttributeCall = (
	model: monaco.editor.ITextModel,
	offset: number,
): {
	keyword: "entry" | "exit" | "step" | "while" | "until";
	openOffset: number;
	closeOffset: number;
} | null => {
	const text = model.getValue();
	const windowStart = Math.max(0, offset - 2000);
	const slice = text.slice(windowStart, offset);

	const kws = ["entry", "exit", "step", "while", "until"] as const;
	let best: { kw: (typeof kws)[number]; idx: number; len: number } | null =
		null;
	for (const kw of kws) {
		const re = new RegExp(`\\b${kw}\\b\\s*\\(`, "gi");
		let last: RegExpExecArray | null = null;
		for (;;) {
			const m = re.exec(slice);
			if (!m) break;
			last = m;
		}
		if (!last) continue;
		const idx = last.index;
		if (!best || idx > best.idx) best = { kw, idx, len: last[0].length };
	}
	if (!best) return null;

	const openOffset = windowStart + best.idx + best.len - 1; // '('
	const between = text.slice(openOffset, offset);
	if (between.includes(")")) return null;
	const closeOffset = (() => {
		const idx = text.indexOf(")", openOffset);
		return idx === -1 ? offset : idx + 1;
	})();
	return { keyword: best.kw, openOffset, closeOffset };
};

const validateMdslModel = (model: monaco.editor.ITextModel) => {
	const registry = getMdslRegistry();
	const text = model.getValue();
	const markers: monaco.editor.IMarkerData[] = [];

	const pushMarker = (
		severity: monaco.MarkerSeverity,
		message: string,
		startOffset: number,
		endOffset: number,
	) => {
		const start = model.getPositionAt(startOffset);
		const end = model.getPositionAt(endOffset);
		markers.push({
			severity,
			message,
			startLineNumber: start.lineNumber,
			startColumn: start.column,
			endLineNumber: end.lineNumber,
			endColumn: end.column,
		});
	};

	// action/condition [...]
	{
		const re = /\b(action|condition)\b\s*\[([\s\S]*?)\]/g;
		for (;;) {
			const match = re.exec(text);
			if (!match) break;
			const kind = match[1] as "action" | "condition";
			const argsText = match[2] ?? "";
			const argsStartOffset = match.index + match[0].indexOf("[") + 1;
			const args = parseSimpleArgList(argsText, argsStartOffset);
			if (args.length === 0) continue;

			const nameArg = args[0];
			const name = nameArg.raw.replace(/^"+|"+$/g, "");
			const specMap =
				kind === "action" ? registry.actions : registry.conditions;
			const spec = specMap[name];

			if (!spec) {
				pushMarker(
					monaco.MarkerSeverity.Warning,
					`未知${kind === "action" ? "动作" : "条件"}：${name}`,
					nameArg.startOffset,
					nameArg.endOffset,
				);
				continue;
			}

			const providedArgs = args.slice(1);
			if (providedArgs.length !== spec.params.length) {
				pushMarker(
					monaco.MarkerSeverity.Error,
					`${kind === "action" ? "动作" : "条件"}「${name}」参数数量不匹配：期望 ${spec.params.length} 个，实际 ${providedArgs.length} 个`,
					match.index,
					match.index + match[0].length,
				);
			}

			const min = Math.min(providedArgs.length, spec.params.length);
			for (let i = 0; i < min; i++) {
				const arg = providedArgs[i];
				const expected = spec.params[i];
				if (!isValueCompatible(arg, expected.type, registry)) {
					pushMarker(
						monaco.MarkerSeverity.Error,
						`「${name}」参数 #${i + 1}（${expected.label}）类型不匹配：期望 ${typeSpecLabel(expected.type)}，实际 ${arg.raw}`,
						arg.startOffset,
						arg.endOffset,
					);
				}
			}
		}
	}

	// entry/exit/step/while/until (...)
	{
		const re = /\b(entry|exit|step|while|until)\b\s*\(([\s\S]*?)\)/g;
		for (;;) {
			const match = re.exec(text);
			if (!match) break;
			const kw = match[1] as "entry" | "exit" | "step" | "while" | "until";
			const argsText = match[2] ?? "";
			const argsStartOffset = match.index + match[0].indexOf("(") + 1;
			const args = parseSimpleArgList(argsText, argsStartOffset);
			if (args.length === 0) continue;

			const nameArg = args[0];
			const name = nameArg.raw.replace(/^"+|"+$/g, "");
			const specMap =
				kw === "while" || kw === "until" ? registry.guards : registry.callbacks;
			const spec = specMap[name];

			if (!spec) {
				pushMarker(
					monaco.MarkerSeverity.Warning,
					`未知${kw === "while" || kw === "until" ? "守卫" : "回调"}：${name}`,
					nameArg.startOffset,
					nameArg.endOffset,
				);
				continue;
			}

			const providedArgs = args.slice(1);
			if (providedArgs.length !== spec.params.length) {
				pushMarker(
					monaco.MarkerSeverity.Error,
					`${kw}「${name}」参数数量不匹配：期望 ${spec.params.length} 个，实际 ${providedArgs.length} 个`,
					match.index,
					match.index + match[0].length,
				);
			}

			const min = Math.min(providedArgs.length, spec.params.length);
			for (let i = 0; i < min; i++) {
				const arg = providedArgs[i];
				const expected = spec.params[i];
				if (!isValueCompatible(arg, expected.type, registry)) {
					pushMarker(
						monaco.MarkerSeverity.Error,
						`${kw}「${name}」参数 #${i + 1}（${expected.label}）类型不匹配：期望 ${typeSpecLabel(expected.type)}，实际 ${arg.raw}`,
						arg.startOffset,
						arg.endOffset,
					);
				}
			}
		}
	}

	monaco.editor.setModelMarkers(model, "mdsl", markers);
};

const initializeMDSLLanguage = () => {
	if (languageInitialized) {
		return;
	}

	// 注册 MDSL 语言
	monaco.languages.register({ id: "mdsl" });
	monaco.languages.setMonarchTokensProvider("mdsl", mdslLanguageDefinition);

	// 设置 MDSL 语言配置
	monaco.languages.setLanguageConfiguration("mdsl", {
		comments: {
			lineComment: "--",
			blockComment: ["/*", "*/"],
		},
		brackets: [
			["{", "}"],
			["[", "]"],
			["(", ")"],
		],
		autoClosingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
			{ open: "'", close: "'" },
			{ open: "`", close: "`" },
		],
		surroundingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
			{ open: "'", close: "'" },
			{ open: "`", close: "`" },
		],
	});

	languageInitialized = true;
};

const initializeMDSLProviders = () => {
	if (mdslProvidersInitialized) return;

	monaco.languages.registerCompletionItemProvider("mdsl", {
		triggerCharacters: ["[", "(", ",", "$", '"'],
		provideCompletionItems(model, position) {
			const registry = getMdslRegistry();
			const offset = model.getOffsetAt(position);
			const defaultRange = getDefaultCompletionRange(model, position);

			// 1) $ 属性补全（任何位置都允许）
			{
				// monaco 的 word 对 '$' 处理不稳定，这里用简单策略：只要左侧字符是 '$' 或当前输入包含 '$'
				const line = model.getLineContent(position.lineNumber);
				const col0 = position.column - 1;
				const left = line.slice(0, col0);
				const m = left.match(/\$[\p{L}\p{N}_$]*$/u);
				if (m) {
					const typed = m[0].slice(1);
					const startColumn = position.column - m[0].length;
					const suggestions = Object.keys(registry.properties)
						.filter((k) => k.startsWith(typed))
						.map(
							(k): monaco.languages.CompletionItem => ({
								label: `$${k}`,
								kind: monaco.languages.CompletionItemKind.Variable,
								insertText: `$${k}`,
								detail: `属性 (${typeSpecLabel(registry.properties[k])})`,
								range: new monaco.Range(
									position.lineNumber,
									startColumn,
									position.lineNumber,
									position.column,
								),
							}),
						);
					if (suggestions.length) return { suggestions };
				}
			}

			// 2) action/condition [...]
			const call = getEnclosingByKeyword(model, offset);
			if (call) {
				const argsText = model.getValueInRange(
					new monaco.Range(
						model.getPositionAt(call.openOffset + 1).lineNumber,
						model.getPositionAt(call.openOffset + 1).column,
						model.getPositionAt(offset).lineNumber,
						model.getPositionAt(offset).column,
					),
				);
				const args = parseSimpleArgList(argsText, call.openOffset + 1);
				const isPickingName =
					args.length === 0 || (args.length === 1 && !argsText.includes(","));
				const comma = hasTrailingComma(argsText);

				const specMap =
					call.keyword === "action" ? registry.actions : registry.conditions;

				if (isPickingName) {
					const suggestions = Object.keys(specMap).map(
						(name): monaco.languages.CompletionItem => {
							const spec = specMap[name];
							const kindLabel = call.keyword === "action" ? "动作" : "条件";
							return {
								label: name,
								kind: monaco.languages.CompletionItemKind.Function,
								insertText: name,
								detail: spec?.description
									? `${kindLabel} · ${spec.description}`
									: kindLabel,
								documentation: spec ? callableDocumentation(spec) : undefined,
								range: defaultRange,
							};
						},
					);
					return { suggestions };
				}

				const name = args[0]?.raw?.replace(/^"+|"+$/g, "") ?? "";
				const spec = specMap[name];
				if (!spec) return { suggestions: [] };

				// args: [name, arg1, arg2, ...]（parse 不包含空参数）
				// 逗号结尾表示正在输入“下一个”参数
				const providedCount = Math.max(0, args.length - 1);
				const paramIndex = comma
					? Math.max(0, providedCount - 1 + 1)
					: Math.max(0, providedCount - 1);
				const expected = spec.params[paramIndex];
				if (!expected) return { suggestions: [] };

				// enum 值补全
				if (expected.type.kind === "enum") {
					const suggestions = expected.type.values.map(
						(v): monaco.languages.CompletionItem => ({
							label: v,
							kind: monaco.languages.CompletionItemKind.EnumMember,
							// MDSL 解析器要求 enum/string 参数使用 string literal
							insertText: `"${v}"`,
							detail: expected.description
								? `枚举值（${expected.label}）· ${expected.description}`
								: `枚举值（${expected.label}）`,
							documentation: expected.description
								? { value: expected.description }
								: undefined,
							range: defaultRange,
						}),
					);
					return { suggestions };
				}
			}

			// 3) entry/exit/step/while/until (...)
			const attr = getEnclosingAttributeCall(model, offset);
			if (attr) {
				const argsText = model.getValueInRange(
					new monaco.Range(
						model.getPositionAt(attr.openOffset + 1).lineNumber,
						model.getPositionAt(attr.openOffset + 1).column,
						model.getPositionAt(offset).lineNumber,
						model.getPositionAt(offset).column,
					),
				);
				const args = parseSimpleArgList(argsText, attr.openOffset + 1);
				const isPickingName =
					args.length === 0 || (args.length === 1 && !argsText.includes(","));
				const comma = hasTrailingComma(argsText);

				const specMap =
					attr.keyword === "while" || attr.keyword === "until"
						? registry.guards
						: registry.callbacks;

				if (isPickingName) {
					const suggestions = Object.keys(specMap).map(
						(name): monaco.languages.CompletionItem => {
							const spec = specMap[name];
							const kindLabel =
								attr.keyword === "while" || attr.keyword === "until"
									? "守卫"
									: "回调";
							return {
								label: name,
								kind: monaco.languages.CompletionItemKind.Function,
								insertText: name,
								detail: spec?.description
									? `${kindLabel} · ${spec.description}`
									: kindLabel,
								documentation: spec ? callableDocumentation(spec) : undefined,
								range: defaultRange,
							};
						},
					);
					return { suggestions };
				}

				const name = args[0]?.raw?.replace(/^"+|"+$/g, "") ?? "";
				const spec = specMap[name];
				if (!spec) return { suggestions: [] };

				const providedCount = Math.max(0, args.length - 1);
				const paramIndex = comma
					? Math.max(0, providedCount - 1 + 1)
					: Math.max(0, providedCount - 1);
				const expected = spec.params[paramIndex];
				if (!expected) return { suggestions: [] };
				if (expected.type.kind === "enum") {
					const suggestions = expected.type.values.map(
						(v): monaco.languages.CompletionItem => ({
							label: v,
							kind: monaco.languages.CompletionItemKind.EnumMember,
							insertText: `"${v}"`,
							detail: expected.description
								? `枚举值（${expected.label}）· ${expected.description}`
								: `枚举值（${expected.label}）`,
							documentation: expected.description
								? { value: expected.description }
								: undefined,
							range: defaultRange,
						}),
					);
					return { suggestions };
				}
			}

			return { suggestions: [] };
		},
	});

	monaco.languages.registerSignatureHelpProvider("mdsl", {
		signatureHelpTriggerCharacters: ["[", "(", ","],
		provideSignatureHelp(model, position) {
			const registry = getMdslRegistry();
			const offset = model.getOffsetAt(position);

			const call = getEnclosingByKeyword(model, offset);
			if (call) {
				const slice = model.getValueInRange(
					new monaco.Range(
						model.getPositionAt(call.openOffset + 1).lineNumber,
						model.getPositionAt(call.openOffset + 1).column,
						position.lineNumber,
						position.column,
					),
				);
				const comma = hasTrailingComma(slice);
				const args = parseSimpleArgList(slice, call.openOffset + 1);
				if (!args.length)
					return {
						value: { signatures: [], activeSignature: 0, activeParameter: 0 },
						dispose() {},
					};

				const name = args[0]?.raw?.replace(/^"+|"+$/g, "") ?? "";
				const specMap =
					call.keyword === "action" ? registry.actions : registry.conditions;
				const spec = specMap[name];
				if (!spec)
					return {
						value: { signatures: [], activeSignature: 0, activeParameter: 0 },
						dispose() {},
					};

				const providedCount = Math.max(0, args.length - 1);
				const activeParameter = comma
					? Math.max(0, providedCount - 1 + 1)
					: Math.max(0, providedCount - 1);
				return {
					value: {
						signatures: [
							{
								label: callableSignatureLabel(spec),
								documentation: spec.description
									? { value: spec.description }
									: undefined,
								parameters: spec.params.map((p) => ({
									label: `${p.label}: ${typeSpecLabel(p.type)}`,
									documentation: p.description
										? { value: p.description }
										: undefined,
								})),
							},
						],
						activeSignature: 0,
						activeParameter: Math.min(
							activeParameter,
							Math.max(0, spec.params.length - 1),
						),
					},
					dispose() {},
				};
			}

			const attr = getEnclosingAttributeCall(model, offset);
			if (attr) {
				const slice = model.getValueInRange(
					new monaco.Range(
						model.getPositionAt(attr.openOffset + 1).lineNumber,
						model.getPositionAt(attr.openOffset + 1).column,
						position.lineNumber,
						position.column,
					),
				);
				const comma = hasTrailingComma(slice);
				const args = parseSimpleArgList(slice, attr.openOffset + 1);
				if (!args.length)
					return {
						value: { signatures: [], activeSignature: 0, activeParameter: 0 },
						dispose() {},
					};

				const name = args[0]?.raw?.replace(/^"+|"+$/g, "") ?? "";
				const specMap =
					attr.keyword === "while" || attr.keyword === "until"
						? registry.guards
						: registry.callbacks;
				const spec = specMap[name];
				if (!spec)
					return {
						value: { signatures: [], activeSignature: 0, activeParameter: 0 },
						dispose() {},
					};

				const providedCount = Math.max(0, args.length - 1);
				const activeParameter = comma
					? Math.max(0, providedCount - 1 + 1)
					: Math.max(0, providedCount - 1);
				return {
					value: {
						signatures: [
							{
								label: callableSignatureLabel(spec),
								documentation: spec.description
									? { value: spec.description }
									: undefined,
								parameters: spec.params.map((p) => ({
									label: `${p.label}: ${typeSpecLabel(p.type)}`,
									documentation: p.description
										? { value: p.description }
										: undefined,
								})),
							},
						],
						activeSignature: 0,
						activeParameter: Math.min(
							activeParameter,
							Math.max(0, spec.params.length - 1),
						),
					},
					dispose() {},
				};
			}

			return {
				value: { signatures: [], activeSignature: 0, activeParameter: 0 },
				dispose() {},
			};
		},
	});

	mdslProvidersInitialized = true;
};

const CodeEditor: Component<CodeEditorProps> = (props) => {
	let editorRef: HTMLDivElement | undefined;
	let editor: monaco.editor.IStandaloneCodeEditor | null = null;
	let isInitialized = false;

	// 初始化 MDSL 语言
	if (typeof window !== "undefined") {
		initializeMDSLLanguage();
		initializeMDSLProviders();
	}

	const darkTheme = "app-theme-dark";
	const lightTheme = "app-theme-light";

	const colorTokens = {
		/* 背景色 */
		white: [255, 255, 255],
		black: [0, 0, 0],
		grey: [40, 40, 40],
		/* 对比度控制颜色 */
		brown: [47, 26, 73],
		/* 品牌色 */
		greenBlue: [110, 221, 229],
		yellow: [255, 153, 25],
		orange: [253, 116, 66],
		navyBlue: [78, 133, 226],
		/* 装饰色 */
		water: [0, 140, 229],
		fire: [233, 62, 38],
		earth: [255, 151, 54],
		wind: [0, 143, 84],
		light: [248, 193, 56],
		dark: [141, 56, 240],
	} as const satisfies Record<string, [number, number, number]>;

	const darkThemeTokens = {
		accent: colorTokens.white,
		primary: colorTokens.grey,
		transition: colorTokens.black,
		brand1st: colorTokens.greenBlue,
		brand2nd: colorTokens.yellow,
		brand3rd: colorTokens.orange,
		brand4th: colorTokens.navyBlue,
	};

	const lightThemeTokens = {
		accent: colorTokens.brown,
		primary: colorTokens.white,
		transition: colorTokens.navyBlue,
		brand1st: colorTokens.greenBlue,
		brand2nd: colorTokens.yellow,
		brand3rd: colorTokens.orange,
		brand4th: colorTokens.navyBlue,
	};

	const darkThemeBase16Colors = {
		brand1st: rgbToBase16(darkThemeTokens.brand1st),
		brand2nd: rgbToBase16(darkThemeTokens.brand2nd),
		brand3rd: rgbToBase16(darkThemeTokens.brand3rd),
		accent: rgbToBase16(darkThemeTokens.accent),
		transition: rgbToBase16(darkThemeTokens.transition),
		primary: rgbToBase16(darkThemeTokens.primary),
	};

	const lightThemeBase16Colors = {
		brand1st: rgbToBase16(lightThemeTokens.brand1st),
		brand2nd: rgbToBase16(lightThemeTokens.brand2nd),
		brand3rd: rgbToBase16(lightThemeTokens.brand3rd),
		accent: rgbToBase16(lightThemeTokens.accent),
		transition: rgbToBase16(lightThemeTokens.transition),
		primary: rgbToBase16(lightThemeTokens.primary),
	};

	// 颜色值应该是base16的值
	monaco.editor.defineTheme(darkTheme, {
		base: "vs-dark",
		inherit: true,
		rules: [
			// // 所有语法高亮颜色都使用 CSS 变量中的品牌色
			{
				token: "keyword",
				foreground: darkThemeBase16Colors.accent,
				fontStyle: "bold",
			},
			// { token: "operator", foreground: darkThemeBase16Colors.accent },
			// { token: "identifier", foreground: darkThemeBase16Colors.accent },
			// { token: "support.function", foreground: darkThemeBase16Colors.brand2nd },
			// { token: "variable.language", foreground: darkThemeBase16Colors.brand1st },
			// { token: "constant.language", foreground: darkThemeBase16Colors.brand3rd },
			// // 注释、字符串、数字等使用 base 主题的默认颜色（会根据 vs/vs-dark 自动调整）
		],
		colors: {
			"editor.background": darkThemeBase16Colors.primary,
			// "editor.foreground": darkThemeBase16Colors.accent,
			// "editorLineNumber.foreground": darkThemeBase16Colors.transition,
			// "editor.selectionBackground": 'rgba(0, 0, 0, 0.5)',
			// "editor.lineHighlightBackground": `#red`,
			// "editorCursor.foreground": darkThemeBase16Colors.accent,
			// "editorWhitespace.foreground": darkThemeBase16Colors.transition,
		},
	});

	monaco.editor.defineTheme(lightTheme, {
		base: "vs",
		inherit: true,
		rules: [
			// // 所有语法高亮颜色都使用 CSS 变量中的品牌色
			{
				token: "keyword",
				foreground: lightThemeBase16Colors.accent,
				fontStyle: "bold",
			},
			// { token: "operator", foreground: lightThemeBase16Colors.accent },
			// { token: "identifier", foreground: lightThemeBase16Colors.accent },
			// { token: "support.function", foreground: lightThemeBase16Colors.brand2nd },
			// { token: "variable.language", foreground: lightThemeBase16Colors.brand1st },
			// { token: "constant.language", foreground: lightThemeBase16Colors.brand3rd },
			// // 注释、字符串、数字等使用 base 主题的默认颜色（会根据 vs/vs-dark 自动调整）
		],
		colors: {
			"editor.background": `#F3F7FD`,
			"editor.foreground": lightThemeBase16Colors.accent,
			// "editorLineNumber.foreground": lightThemeBase16Colors.transition,
			// "editor.selectionBackground": 'rgba(0, 0, 0, 0.5)',
			// "editor.lineHighlightBackground": `#red`,
			// "editorCursor.foreground": lightThemeBase16Colors.accent,
			// "editorWhitespace.foreground": lightThemeBase16Colors.transition,
		},
	});

	onMount(() => {
		if (!editorRef) return;
		// 创建编辑器实例
		editor = monaco.editor.create(editorRef, {
			value: props.value || "",
			language: props.mode || "javascript",
			theme:
				store.settings.userInterface.theme === "dark" ? darkTheme : lightTheme,
			readOnly: props.readOnly || false,
			fontSize: 16,
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			automaticLayout: true,
			tabSize: 2,
			insertSpaces: true,
			wordWrap: "on",
			lineNumbers: "on",
			renderLineHighlight: "all",
			scrollbar: {
				vertical: "auto",
				horizontal: "auto",
			},
		});

		// 设置初始值
		if (props.value) {
			editor.setValue(props.value);
		}

		// 监听内容变化
		editor.onDidChangeModelContent(() => {
			if (editor && props.onChange) {
				const value = editor.getValue();
				props.onChange(value);
			}
		});

		// MDSL：为当前 model 提供 markers 校验（debounce）
		if ((props.mode ?? "javascript") === "mdsl") {
			const model = editor.getModel();
			if (model) {
				let timer: number | null = null;
				const run = () => {
					if (timer) window.clearTimeout(timer);
					timer = window.setTimeout(() => {
						validateMdslModel(model);
					}, 200);
				};
				run();
				const disposable = model.onDidChangeContent(run);
				onCleanup(() => {
					if (timer) window.clearTimeout(timer);
					disposable.dispose();
					monaco.editor.setModelMarkers(model, "mdsl", []);
				});
			}
		}

		isInitialized = true;
	});

	createEffect(() => {
		// 设置主题
		monaco.editor.setTheme(
			store.settings.userInterface.theme === "dark" ? darkTheme : lightTheme,
		);
	});

	// 响应 props.value 变化
	createEffect(() => {
		if (editor && isInitialized && props.value !== undefined) {
			const currentValue = editor.getValue();
			if (currentValue !== props.value) {
				// 保存光标位置
				const position = editor.getPosition();
				editor.setValue(props.value);
				// 恢复光标位置
				if (position) {
					editor.setPosition(position);
				}
			}
		}
	});

	// 响应 mode 变化
	createEffect(() => {
		if (editor && isInitialized && props.mode) {
			const model = editor.getModel();
			if (model) {
				monaco.editor.setModelLanguage(model, props.mode);
				if (props.mode === "mdsl") {
					validateMdslModel(model);
				}
			}
		}
	});

	// 响应 mdslIntellisense 配置变化
	createEffect(() => {
		if (props.mdslIntellisense) {
			currentMdslRegistry = props.mdslIntellisense;
			if (editor && isInitialized && (props.mode ?? "javascript") === "mdsl") {
				const model = editor.getModel();
				if (model) validateMdslModel(model);
			}
		}
	});

	// 响应 readOnly 变化
	createEffect(() => {
		if (editor && isInitialized) {
			editor.updateOptions({
				readOnly: props.readOnly || false,
			});
		}
	});

	onCleanup(() => {
		if (editor) {
			editor.dispose();
			editor = null;
		}
	});

	const styleProps = () => {
		if (!props.style) return {};
		if (typeof props.style === "string") {
			return { style: props.style };
		}
		return { style: props.style };
	};

	return (
		<div
			ref={editorRef}
			class={`h-full min-h-[200px] w-full ${props.class || ""}`}
			{...styleProps()}
		/>
	);
};

export { CodeEditor };
