import type { AnyArgument } from "./MDSLArguments";
import { popAndCheck, type StringLiteralPlaceholders } from "./MDSLUtilities";

/**
 * Parse an array of argument definitions from the specified tokens array.
 * Supports nested arrays [...] and object literals {key: value, ...}.
 */
export function parseArgumentTokens(
	tokens: string[],
	stringArgumentPlaceholders: StringLiteralPlaceholders,
): AnyArgument[] {
	if (!["[", "("].includes(tokens[0])) {
		return [];
	}
	const closingToken = popAndCheck(tokens, ["[", "("]) === "[" ? "]" : ")";
	return parseCommaSeparatedArgs(tokens, stringArgumentPlaceholders, closingToken);
}

function parseCommaSeparatedArgs(
	tokens: string[],
	placeholders: StringLiteralPlaceholders,
	closer: string,
): AnyArgument[] {
	const args: AnyArgument[] = [];
	while (tokens.length && tokens[0] !== closer) {
		if (args.length > 0) {
			if (tokens[0] !== ",") {
				throw new Error(`invalid argument list, expected ',' or '${closer}' but got '${tokens[0]}'`);
			}
			tokens.shift();
		}
		args.push(parseSingleArgument(tokens, placeholders));
	}
	popAndCheck(tokens, closer);
	return args;
}

function parseSingleArgument(tokens: string[], placeholders: StringLiteralPlaceholders): AnyArgument {
	if (!tokens.length) {
		throw new Error("unexpected end of tokens while parsing argument");
	}
	if (tokens[0] === "[") {
		tokens.shift();
		const elements = parseCommaSeparatedArgs(tokens, placeholders, "]");
		return { value: elements, type: "array" };
	}
	if (tokens[0] === "{") {
		tokens.shift();
		const fields = parseObjectFields(tokens, placeholders);
		return { value: fields, type: "object" };
	}
	const token = tokens.shift()!;
	return getArgumentDefinition(token, placeholders);
}

function parseObjectFields(tokens: string[], placeholders: StringLiteralPlaceholders): Record<string, AnyArgument> {
	const fields: Record<string, AnyArgument> = {};
	while (tokens.length && tokens[0] !== "}") {
		if (Object.keys(fields).length > 0) {
			if (tokens[0] !== ",") {
				throw new Error(`invalid object literal, expected ',' or '}' but got '${tokens[0]}'`);
			}
			tokens.shift();
		}
		const keyToken = tokens.shift()!;
		const key = keyToken.match(/^@@\d+@@$/) ? placeholders[keyToken] : keyToken;
		if (tokens[0] !== ":") {
			throw new Error(`invalid object literal, expected ':' after key '${key}' but got '${tokens[0]}'`);
		}
		tokens.shift();
		fields[key] = parseSingleArgument(tokens, placeholders);
	}
	popAndCheck(tokens, "}");
	return fields;
}

function getArgumentDefinition(token: string, stringArgumentPlaceholders: StringLiteralPlaceholders): AnyArgument {
	if (token === "null") {
		return { value: null, type: "null" };
	}
	if (token === "true" || token === "false") {
		return { value: token === "true", type: "boolean" };
	}
	if (!Number.isNaN(Number(token))) {
		return { value: parseFloat(token), isInteger: parseFloat(token) === parseInt(token, 10), type: "number" };
	}
	if (token.match(/^@@\d+@@$/g)) {
		return { value: stringArgumentPlaceholders[token], type: "string" };
	}
	if (token.startsWith("$") && token.length > 1) {
		return { value: token.slice(1), type: "property_reference" };
	}
	return { value: token, type: "identifier" };
}
