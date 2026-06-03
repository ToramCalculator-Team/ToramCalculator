import { getCurrentReleaseManifest } from "~/lib/version/release";

export function GET() {
	return new Response(JSON.stringify(getCurrentReleaseManifest()), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}
