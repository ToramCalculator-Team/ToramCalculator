import type { AnyFieldApi } from "@tanstack/solid-form";
import { createForm } from "@tanstack/solid-form";
import { createEffect, createMemo, createSignal, on, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { z } from "zod/v4";
import defaultUserAvatarUrl from "~/../public/icons/512.png?url";
import { Button } from "~/components/controls/button";
import { syncControl } from "~/initialWorker";
import { bindLocalAccountToUser, ensureLocalAccount } from "~/lib/localAccount";
import { emailExists, getUserByCookie } from "~/lib/utils/session";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import { Dialog } from "../containers/dialog";
import type { InputStateType } from "../controls/input";
import { Input } from "../controls/input";

function fieldInfo(field: AnyFieldApi): string {
	const errors =
		field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(",") : null;
	const isValidating = field.state.meta.isValidating ? "..." : null;
	if (errors) {
		return errors;
	}
	if (isValidating) {
		return isValidating;
	}
	return "";
}

interface LoginFormProps {
	email: string;
	userName: string;
	password: string;
	bindLocalAccount: boolean;
}

const defaultValues: LoginFormProps = {
	userName: "",
	email: "",
	password: "",
	bindLocalAccount: false,
};

export const LoginDialog = () => {
	const [passwordInputRef, setPasswordInputRef] = createSignal<HTMLInputElement | undefined>(undefined);
	const [passwordInputState, setPasswordInputState] = createSignal<InputStateType>("default");

	// UI文本字典
	const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

	const logIn = async (value: LoginFormProps) => {
		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(value),
				credentials: "include", // 关键：确保请求携带 Cookie
			});

			const responseText = await response.text(); // 读取返回内容
			// console.log("服务器响应:", response.status, responseText); // 打印返回状态码和内容

			if (!response.ok) {
				console.error("登录失败", response.status, responseText);
				setPasswordInputState("error");
				const passwordInput = passwordInputRef();
				if (passwordInput) {
					passwordInput.focus();
				}
			}

			// 从服务端获取用户信息
			const user = await getUserByCookie();
			// console.log("获取到的用户信息:", user);

			if (user) {
				console.log(value.bindLocalAccount);
				if (value.bindLocalAccount) {
					await bindLocalAccountToUser(store.session.account.id, user.id);
				}
				setStore("session", "user", {
					id: user.id,
					name: user.name ?? "未命名用户",
					avatar: user.image ?? defaultUserAvatarUrl,
				});
				if (user.accounts.length > 0) {
					setStore("session", "account", {
						id: user.accounts[0].id,
						type: user.accounts[0].type,
					});
				}

				// 启动数据同步
				syncControl.start();
				setStore("pages", "loginDialogState", false);
				console.log("登录成功，启动数据同步");
			}
		} catch (error) {
			console.error("请求错误:", error);
		}
	};

	const logOut = async () => {
		// 删除 jwt cookie
		await fetch("/api/auth/logout");
		// 清空 session
		setStore("session", "user", undefined);
		setStore("session", "account", {
			id: "",
			type: "User",
			player: undefined,
		});
		// 关闭登录对话框
		setStore("pages", "loginDialogState", false);

		// 停止数据同步
		syncControl.stop();
		await ensureLocalAccount();
		console.log("用户登出，停止数据同步");
	};

	const register = async (value: LoginFormProps) => {
		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(value),
				credentials: "include", // 关键：确保请求携带 Cookie
			});

			const responseText = await response.text(); // 读取返回内容
			// console.log("服务器响应:", response.status, responseText); // 打印返回状态码和内容

			if (!response.ok) {
				console.error("注册失败", response.status, responseText);
				switch (response.status) {
					case 400:
						alert("注册失败");
						break;
					default:
						alert("注册失败");
				}
				return;
			}

			// 从服务端获取用户信息
			const user = await getUserByCookie();
			// console.log("获取到的用户信息:", user);

			if (user) {
				// 此时已知userId，将本地数据库内的匿名账号绑定到该userId
				if (value.bindLocalAccount) {
					await bindLocalAccountToUser(store.session.account.id, user.id);
				}
				setStore("session", "user", {
					id: user.id,
					name: user.name ?? "未命名用户",
					avatar: user.image ?? defaultUserAvatarUrl,
				});
				if (user.accounts.length > 0) {
					setStore("session", "account", {
						id: user.accounts[0].id,
						type: user.accounts[0].type,
					});
				}

				// 启动数据同步
				syncControl.start();
				console.log("注册成功，启动数据同步");
			}

			setStore("pages", "loginDialogState", false);
		} catch (error) {
			console.error("请求错误:", error);
		}
	};

	const [formModule, setFormModule] = createSignal<"logIn" | "register" | "unknown">("unknown");

	const formTitle = createMemo(() => {
		const userName = () => store.session.user?.name;
		if (!store.session.user?.id) {
			switch (formModule()) {
				case "logIn":
					return dictionary().ui.actions.logIn;
				case "register":
					return dictionary().ui.actions.register;
				default:
					return `${dictionary().ui.actions.logIn}/${dictionary().ui.actions.register}`;
			}
		}
		return `Hi,${userName()}`;
	});

	const form = createForm(() => ({
		defaultValues: defaultValues,
		onSubmit: async (data) => {
			console.log(data.value);
			switch (formModule()) {
				case "logIn":
					logIn(data.value);
					break;
				case "register":
					register(data.value);
					break;
				default:
					break;
			}
		},
	}));

	// 关闭弹出层时重置表单
	createEffect(
		on(
			() => store.pages.loginDialogState,
			() => {
				setFormModule("unknown");
				form.reset();
			},
		),
	);

	return (
		<Dialog
			state={store.pages.loginDialogState}
			setState={() => setStore("pages", "loginDialogState", false)}
			title={formTitle()}
			maxWith="480px"
		>
			<Show
				when={!store.session.user?.id && store.pages.loginDialogState}
				fallback={
					// 登出弹窗
					<div class="flex w-full flex-col items-center gap-4 lg:py-0">
						<div class="flex w-full items-center gap-1">
							<Button class="LoginOut flex-1" onClick={logOut}>
								{dictionary().ui.actions.logOut}
							</Button>
						</div>
					</div>
				}
			>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					class="flex w-full flex-col"
				>
					<form.Field
						name="email"
						asyncDebounceMs={500}
						validators={{
							onChange: ({ value }) => {
								const result = z.email().safeParse(value); // ✅ 使用 `safeParse` 避免抛出错误
								if (!result.success) {
									return "请输入正确的邮箱格式"; // ⬅️ 返回字符串，避免 `[object Object]`
								}
							},
							onChangeAsync: async ({ value }) => {
								const result = await emailExists(value);
								if (result) {
									setFormModule("logIn");
								} else {
									setFormModule("register");
								}
							},
						}}
						children={(field) => {
							return (
								<Input
									title="邮箱"
									// description="一定要填"
									autocomplete="email"
									type="text"
									id={field().name}
									name={field().name}
									value={field().state.value}
									onBlur={field().handleBlur}
									onInput={(e) => field().handleChange(e.target.value)}
									validationMessage={fieldInfo(field())}
									class="w-full"
								/>
							);
						}}
					/>
					<form.Field
						name="password"
						validators={{
							onChange: ({ value }) => {
								const result = z.string().min(6).safeParse(value); // ✅ 使用 `safeParse` 避免抛出错误
								if (!result.success) {
									return "密码至少6位"; // ⬅️ 返回字符串，避免 `[object Object]`
								}
							},
						}}
						children={(field) => (
							<Input
								ref={setPasswordInputRef}
								title="密码"
								// description="也是个摆设"
								state={passwordInputState()}
								autocomplete="current-password"
								type="password"
								id={field().name}
								name={field().name}
								value={field().state.value}
								onBlur={field().handleBlur}
								onInput={(e) => field().handleChange(e.target.value)}
								validationMessage={fieldInfo(field())}
								class="w-full"
							/>
						)}
					/>
					<Presence exitBeforeEnter>
						<Show when={formModule() === "register"}>
							<Motion.div
								class={`grid`}
								animate={{
									gridTemplateRows: ["0fr", "1fr"],
									paddingBlock: ["0rem", "0.75rem"],
								}}
								exit={{
									paddingBlock: "0rem",
									gridTemplateRows: ["1fr", "0fr"],
								}}
								transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
							>
								<div class="h-full w-full overflow-hidden">
									<form.Field
										name="userName"
										children={(field) => (
											<Input
												title="用户名"
												// description="目前是个摆设"
												autocomplete="off"
												type="text"
												id={field().name}
												name={field().name}
												value={field().state.value}
												onBlur={field().handleBlur}
												onInput={(e) => field().handleChange(e.target.value)}
												validationMessage={fieldInfo(field())}
												class="w-full"
											/>
										)}
									/>
									<form.Field
										name="bindLocalAccount"
										children={(field) => (
											<Input
												title="是否从本地数据创建"
												// description="目前是个摆设"
												autocomplete="off"
												type="boolean"
												id={field().name}
												name={field().name}
												onBlur={field().handleBlur}
												onClick={() => {
													field().setValue(!field().state.value);
												}}
												checked={field().state.value}
												validationMessage={fieldInfo(field())}
												class="w-full"
											/>
										)}
									/>
								</div>
							</Motion.div>
						</Show>
					</Presence>
					<form.Field
						name="bindLocalAccount"
						children={(field) => (
							<Input
								title="是否绑定本地数据"
								type="boolean"
								id={field().name}
								name={field().name}
								onBlur={field().handleBlur}
								onClick={() => field().setValue((pre) => !pre)}
								checked={field().state.value}
								validationMessage={fieldInfo(field())}
								class="w-full"
							/>
						)}
					/>
					<form.Subscribe
						selector={(state) => ({
							canSubmit: state.canSubmit,
							isSubmitting: state.isSubmitting,
						})}
						children={(state) => {
							return (
								<div class="flex items-center gap-1 p-2">
									<Button
										level="primary"
										class={`SubmitBtn flex-1`}
										type="submit"
										disabled={formModule() === "unknown" || !state().canSubmit}
									>
										{state().isSubmitting ? "..." : formTitle()}
									</Button>
								</div>
							);
						}}
					/>
				</form>
			</Show>
		</Dialog>
	);
};
