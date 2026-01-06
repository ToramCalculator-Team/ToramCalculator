import type { APIEvent } from "@solidjs/start/server";
import { deleteCookie } from "vinxi/http";

export async function GET({ params }: APIEvent) {
	deleteCookie("jwt");

	return new Response(`ok ${import.meta.env.ELECTRIC_HOST} ${process.env.ELECTRIC_HOST}`);
}
