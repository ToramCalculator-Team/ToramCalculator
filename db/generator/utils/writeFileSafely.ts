import fs from "node:fs";
import path from "node:path";

export const writeFileSafely = async (writeLocation: string, content: string) => {
	fs.mkdirSync(path.dirname(writeLocation), {
		recursive: true,
	});

	fs.writeFileSync(writeLocation, content);
};

export const writeFileSafelyWithoutFormatting = async (writeLocation: string, content: string) => {
	fs.mkdirSync(path.dirname(writeLocation), {
		recursive: true,
	});

	fs.writeFileSync(writeLocation, content);
};
