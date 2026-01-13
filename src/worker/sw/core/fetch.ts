/**
 * core/fetch.ts - 资源类型判定
 *
 * 职责：
 * - 判别请求路径属于核心、静态资源或页面路由
 * - 供入口选择合适的缓存策略
 */
export function isCoreResource(pathname: string): boolean {
	return (
		pathname === "/" || pathname === "/index.html" || pathname === "/manifest.json" || pathname.startsWith("/icons/")
	);
}

export function isAssetResource(pathname: string): boolean {
	const patterns = [
		"/_build/assets/",
		".js",
		".css",
		".ico",
		".png",
		".jpg",
		".jpeg",
		".gif",
		".svg",
		".woff",
		".woff2",
		".ttf",
	];
	return patterns.some((p) => pathname.includes(p));
}

export function isPageResource(pathname: string): boolean {
	return !pathname.includes(".") && !pathname.startsWith("/api/") && pathname !== "/";
}
