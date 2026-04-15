import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import WebSocket from "ws";

// ===================== 配置常量 =====================
const CONFIG = {
	MAX_MESSAGE_LENGTH: 2000,        // 最大消息长度
	MAX_COMMAND_RATE: 10,            // 每分钟最大命令数
	COMMAND_COOLDOWN: 1000,          // 命令冷却时间
	WS_RECONNECT_DELAY: 3000,        // WebSocket重连延迟
	WS_MAX_RECONNECT_ATTEMPTS: 10,   // 最大重连尝试次数
	HEARTBEAT_INTERVAL: 30000,       // 心跳间隔
	DEFAULT_TRIGGER: ".",            // 默认触发头
};

// 转义 LIKE 通配符，防止通配符注入
function escapeLikePattern(str: string): string {
	return str.replace(/[%_\\]/g, "\\$&");
}

// 过滤日志中的 ANSI 转义序列和控制字符，防止日志注入
function sanitizeLogMessage(msg: string): string {
	return msg
		.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "") // 移除 ANSI 转义序列
		.replace(/[\r\n]/g, " ")                // 替换换行符为空格
		.replace(/[\x00-\x1f]/g, "");           // 移除其他控制字符
}

// ===================== 日志函数 =====================
function log(msg: string, type: 'info' | 'error' | 'warn' | 'success' = 'info') {
	const stamp = new Date().toISOString().replace("T", " ").split(".")[0];
	const prefix = {
		info: '\x1b[36m',
		success: '\x1b[32m',
		warn: '\x1b[33m',
		error: '\x1b[31m',
	};
	const reset = '\x1b[0m';
	const safeMsg = sanitizeLogMessage(msg);
	console.log(`${prefix[type]}[${stamp}] [DishWS] ${safeMsg}${reset}`);
}

// ===================== 命令冷却系统 =====================
interface CooldownInfo {
	count: number;
	lastTime: number;
	blocked: boolean;
}
const commandCooldown = new Map<number, CooldownInfo>();

function checkCommandCooldown(userId: number): { allowed: boolean; reason?: string } {
	const now = Date.now();
	const userCooldown = commandCooldown.get(userId) || { count: 0, lastTime: 0, blocked: false };

	if (now - userCooldown.lastTime > 60000) {
		userCooldown.count = 0;
		userCooldown.blocked = false;
	}

	userCooldown.count++;
	userCooldown.lastTime = now;

	if (userCooldown.count > CONFIG.MAX_COMMAND_RATE) {
		userCooldown.blocked = true;
		commandCooldown.set(userId, userCooldown);
		return { allowed: false, reason: 'rate_limit' };
	}

	if (userCooldown.blocked) {
		commandCooldown.set(userId, userCooldown);
		return { allowed: false, reason: 'cooldown' };
	}

	commandCooldown.set(userId, userCooldown);
	return { allowed: true };
}

// ===================== 配置缓存 =====================
interface DishBotConfig {
	triggers: string[];         // 触发头数组，如 [".", "#"]
	aliases: Map<string, string>; // 别名映射: 别名 -> 料理名
}
let configCache: DishBotConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60000; // 配置缓存1分钟

async function getBotConfig(): Promise<DishBotConfig> {
	const now = Date.now();
	if (configCache && now - configCacheTime < CONFIG_CACHE_TTL) {
		return configCache;
	}

	try {
		const db = await getDB();
		const configs = await db
			.selectFrom("dish_config")
			.where("key", "in", ["ws_trigger", "dish_aliases"])
			.selectAll()
			.execute();

		const triggerConfig = configs.find(c => c.key === "ws_trigger");
		const aliasesConfig = configs.find(c => c.key === "dish_aliases");

		// 解析多个触发头（逗号分隔）
		const triggerStr = triggerConfig?.value || CONFIG.DEFAULT_TRIGGER;
		const triggers = triggerStr.split(",").map(t => t.trim()).filter(Boolean);
		
		const aliases = new Map<string, string>();

		if (aliasesConfig?.value) {
			try {
				const aliasObj = JSON.parse(aliasesConfig.value);
				for (const [alias, name] of Object.entries(aliasObj)) {
					aliases.set(alias, name as string);
				}
			} catch {}
		}

		configCache = { triggers, aliases };
		configCacheTime = now;
		return configCache;
	} catch {
		return { triggers: [CONFIG.DEFAULT_TRIGGER], aliases: new Map() };
	}
}

// ===================== WebSocket客户端类 =====================
class DishWebSocketClient {
	private ws: WebSocket | null = null;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private heartbeatTimer: NodeJS.Timeout | null = null;
	private isConnected: boolean = false;
	private url: string = "";
	private token: string = "";
	private reconnectAttempts: number = 0;
	private messageCounter: number = 0;
	private activeGroups: Set<number> = new Set();

	private static instance: DishWebSocketClient | null = null;

	public static getInstance(): DishWebSocketClient {
		if (!DishWebSocketClient.instance) {
			DishWebSocketClient.instance = new DishWebSocketClient();
		}
		return DishWebSocketClient.instance;
	}

	private constructor() {}

	async connect(url: string, token?: string): Promise<boolean> {
		if (this.isConnected && this.ws) {
			log("已经连接", 'info');
			return true;
		}

		this.url = url;
		this.token = token || "";

		return new Promise((resolve) => {
			try {
				if (this.ws) {
					this.ws.removeAllListeners?.();
					if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
						this.ws.close();
					}
				}

				const options = this.token 
					? { headers: { Authorization: `Bearer ${this.token}` } }
					: {};
				
				this.ws = new WebSocket(url, options as any);

				this.ws.onopen = () => {
					log(`已连接: ${url}`, 'success');
					this.isConnected = true;
					this.reconnectAttempts = 0;
					this.startHeartbeat();
					
					if (this.reconnectTimer) {
						clearTimeout(this.reconnectTimer);
						this.reconnectTimer = null;
					}
					
					resolve(true);
				};

				this.ws.onclose = (event) => {
					log(`连接关闭 (code: ${event.code})`, 'warn');
					this.isConnected = false;
					this.stopHeartbeat();
					this.handleReconnect();
				};

				this.ws.onerror = () => {
					log(`连接错误`, 'error');
					this.isConnected = false;
					resolve(false);
				};

				this.ws.onmessage = (event) => {
					this.handleMessage(event.data);
				};

			} catch (error) {
				log(`创建连接失败: ${error}`, 'error');
				resolve(false);
			}
		});
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeatTimer = setInterval(() => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.ws.ping?.();
			}
		}, CONFIG.HEARTBEAT_INTERVAL);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	disconnect(): void {
		this.stopHeartbeat();
		
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.isConnected = false;
		log("已断开连接", 'info');
	}

	private handleReconnect(): void {
		if (this.reconnectAttempts >= CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
			log(`达到最大重连次数，停止重连`, 'error');
			return;
		}

		this.reconnectAttempts++;
		const delay = CONFIG.WS_RECONNECT_DELAY * Math.min(this.reconnectAttempts, 5);
		log(`${delay/1000}秒后尝试第${this.reconnectAttempts}次重连...`, 'info');

		this.reconnectTimer = setTimeout(() => {
			this.connect(this.url, this.token);
		}, delay);
	}

	private async handleMessage(data: string): Promise<void> {
		let e: any;
		try {
			e = JSON.parse(data);
		} catch {
			return;
		}

		if (e.post_type !== "message" || e.message_type !== "group") return;

		const text = this.extractText(e.message || []).trim();
		if (!text) return;

		if (text.length > CONFIG.MAX_MESSAGE_LENGTH) {
			return;
		}

		this.messageCounter++;
		this.activeGroups.add(e.group_id);

		// 获取配置（触发头和别名）
		const botConfig = await getBotConfig();
		const { triggers, aliases } = botConfig;

		// 检查是否以任一触发头开头
		let matchedTrigger: string | null = null;
		for (const trigger of triggers) {
			if (text.startsWith(trigger)) {
				matchedTrigger = trigger;
				break;
			}
		}
		if (!matchedTrigger) return;

		const cooldown = checkCommandCooldown(e.user_id);
		if (!cooldown.allowed) {
			if (cooldown.reason === 'rate_limit') {
				return this.sendGroupMessage(e.group_id, "命令频率过高，请稍后再试");
			}
			return;
		}

		// 去掉触发头，获取命令内容
		const cmdContent = text.slice(matchedTrigger.length).trim();
		
		const result = await this.parseCommand(cmdContent, e.user_id, matchedTrigger, aliases);
		if (result) {
			this.sendGroupMessage(e.group_id, result);
		}
	}

	private extractText(message: any[]): string {
		if (!Array.isArray(message)) return '';
		return message
			.filter((m: any) => m.type === 'text')
			.map((m: any) => m.data?.text || '')
			.join('');
	}

	private async parseCommand(
		cmd: string, 
		userId: number, 
		trigger: string,
		aliases: Map<string, string>
	): Promise<string | null> {
		const cmdLower = cmd.toLowerCase();

		// help - 帮助
		if (cmdLower === 'help' || cmdLower === '帮助') {
			return this.getHelp(trigger);
		}

		// 加餐 - 提交料理
		if (cmdLower.startsWith('加餐')) {
			return await this.handleAddDish(cmd, userId);
		}

		// 别名映射检查
		const resolvedName = aliases.get(cmd) || cmd;

		// 检查是否带等级参数: 料理名 10 或 料理名10
		const levelMatch = resolvedName.match(/^(.+?)\s*(\d+)$/);
		if (levelMatch) {
			const name = levelMatch[1].trim();
			const level = parseInt(levelMatch[2]);
			return await this.queryDishByName(name, level, aliases);
		}

		// 查询该料理的所有等级
		return await this.queryDishByName(resolvedName, null, aliases);
	}

	private getHelp(trigger: string): string {
		return `料理查询帮助:
${trigger}help - 显示此帮助
${trigger}<料理名> - 查询该料理所有等级
${trigger}<料理名> <等级> - 查询指定等级
${trigger}加餐<等级><料理名><门牌号> - 提交料理

别名示例: ${trigger}暴击 = 查询暴击料理
别名: ${trigger}攻回 = 查询攻击回复料理

已处理 ${this.messageCounter} 条消息`;
	}

	private async handleAddDish(cmd: string, userId: number): Promise<string> {
		// 紧凑格式: 加餐10暴击158800
		const match1 = cmd.match(/^加餐(\d+)(.+?)(\d{5,})$/);
		if (match1) {
			const level = parseInt(match1[1]);
			const name = match1[2].trim();
			const playerId = match1[3];
			return await this.submitDish(name, level, playerId, userId);
		}

		// 空格格式: 加餐 暴击 10 158800
		const match2 = cmd.match(/^加餐\s+(.+?)\s+(\d+)\s+(\d{5,})$/);
		if (match2) {
			const name = match2[1].trim();
			const level = parseInt(match2[2]);
			const playerId = match2[3];
			return await this.submitDish(name, level, playerId, userId);
		}

		return `提交格式:
加餐<等级><料理名><门牌号>
例: 加餐10暴击158800

或: 加餐 料理名 等级 门牌号
例: 加餐 暴击 10 158800`;
	}

	private async queryDishByName(
		name: string,
		level: number | null,
		aliases: Map<string, string>
	): Promise<string> {
		try {
			const db = await getDB();

			// 解析别名并转义通配符
			const resolvedName = aliases.get(name) || name;
			const escapedName = escapeLikePattern(resolvedName);

			let query = db
				.selectFrom("dish")
				.where("status", "=", "Approved")
				.where("name", "like", `%${escapedName}%`)
				.selectAll();

			if (level !== null) {
				query = query.where("level", "=", level);
			}

			const dishes = await query.orderBy("level", "desc").execute();

			if (dishes.length === 0) {
				const levelText = level ? `${level}级` : '';
				return `暂无${levelText}${resolvedName}料理`;
			}

			const formatted = dishes.map(d => `(${d.level})${d.name}+${d.playerId}`).join(" ");
			const header = level 
				? `${resolvedName}${level}级(${dishes.length}个):\n` 
				: `${resolvedName}(${dishes.length}个):\n`;
			
			const fullMsg = header + formatted;
			if (fullMsg.length > CONFIG.MAX_MESSAGE_LENGTH) {
				const truncated = formatted.substring(0, CONFIG.MAX_MESSAGE_LENGTH - header.length - 10) + "...";
				return header + truncated + `\n(共${dishes.length}个)`;
			}
			
			return fullMsg;
		} catch (error) {
			log(`查询料理失败: ${error}`, 'error');
			return "查询失败";
		}
	}

	private async submitDish(name: string, level: number, playerId: string, userId: number): Promise<string> {
		try {
			const db = await getDB();
			const id = createId();
			const now = new Date();

			let systemAccount = await db
				.selectFrom("account")
				.where("provider", "=", "system")
				.where("providerAccountId", "=", "qq-bot")
				.selectAll()
				.executeTakeFirst();

			if (!systemAccount) {
				const accountId = createId();
				await db.insertInto("account").values({
					id: accountId,
					type: "User",
					provider: "system",
					providerAccountId: "qq-bot",
				}).execute();
				systemAccount = { id: accountId } as any;
			}

			await db.insertInto("dish").values({
				id,
				name,
				level,
				playerId,
				source: "QQBot",
				status: "Pending",
				qqNumber: String(userId),
				remark: null,
				createdAt: now,
				updatedAt: now,
				reviewedAt: null,
				reviewedById: null,
				submittedById: systemAccount.id,
			}).execute();

			log(`提交: ${name}(${level})${playerId} by ${userId}`, 'success');
			return `提交成功，等待审核\n${name}(${level}) 门牌号:${playerId}`;
		} catch (error) {
			log(`提交失败: ${error}`, 'error');
			return "提交失败";
		}
	}

	private sendGroupMessage(groupId: number, text: string): void {
		if (!this.ws || !this.isConnected) {
			log("未连接，无法发送消息", 'error');
			return;
		}

		if (text.length > CONFIG.MAX_MESSAGE_LENGTH) {
			text = text.substring(0, CONFIG.MAX_MESSAGE_LENGTH) + '...';
		}

		try {
			this.ws.send(JSON.stringify({
				action: "send_group_msg",
				params: { group_id: groupId, message: text },
			}));
		} catch (error) {
			log(`发送失败: ${error}`, 'error');
		}
	}

	getStatus(): { isConnected: boolean; url: string; messageCount: number; activeGroups: number } {
		return {
			isConnected: this.isConnected,
			url: this.url,
			messageCount: this.messageCounter,
			activeGroups: this.activeGroups.size,
		};
	}
}

export const dishWebSocketClient = DishWebSocketClient.getInstance();

export async function initDishWebSocket(): Promise<boolean> {
	try {
		const db = await getDB();

		const configs = await db
			.selectFrom("dish_config")
			.where("key", "in", ["ws_url", "ws_enabled", "ws_token"])
			.selectAll()
			.execute();

		const wsUrlConfig = configs.find((c) => c.key === "ws_url");
		const wsEnabledConfig = configs.find((c) => c.key === "ws_enabled");
		const wsTokenConfig = configs.find((c) => c.key === "ws_token");

		if (!wsUrlConfig || !wsEnabledConfig) {
			log("未配置WebSocket", 'info');
			return false;
		}

		if (wsEnabledConfig.value !== "true") {
			log("WebSocket未启用", 'info');
			return false;
		}

		return await dishWebSocketClient.connect(wsUrlConfig.value, wsTokenConfig?.value);
	} catch (error) {
		log(`初始化失败: ${error}`, 'error');
		return false;
	}
}

// 清除配置缓存（配置更新后调用）
export function clearConfigCache() {
	configCache = null;
}