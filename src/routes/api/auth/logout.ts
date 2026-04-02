import { deleteCookie } from "@solidjs/start/http";
import type { APIEvent } from "@solidjs/start/server";

export async function GET({ params }: APIEvent) {
	deleteCookie("jwt");

	return new Response(`ok ${import.meta.env.ELECTRIC_HOST} ${process.env.ELECTRIC_HOST}`);
}
