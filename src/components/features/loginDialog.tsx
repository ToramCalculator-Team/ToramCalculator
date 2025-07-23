import { Button  } from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import type { AnyFieldApi } from "@tanstack/solid-form";
import { emailExists, getUserByCookie } from "~/lib/utils/session";
import { setStore, store } from "~/store";
import defaultUserAvatarUrl from "~/../public/icons/512.png?url";
import { Accessor, createEffect, createMemo, createSignal, on, onMount, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { Motion, Presence } from "solid-motionone";
import Icons from "~/components/icons/index";
import { Input } from "../controls/input";
import { z } from "zod";
import { findAccountById } from "../../../db/repositories/account";

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
}

const defaultValues: LoginFormProps = {
  userName: "",
  email: "",
  password: "",
};

export const LoginDialog = (props: { state: Accessor<boolean>; setState: (isOpen: boolean) => void }) => {
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
        alert(responseText);
      }

      // 从服务端获取用户信息
      const user = await getUserByCookie();
      // console.log("获取到的用户信息:", user);

      if (user) {
        setStore("session", "user", {
          id: user.id,
          name: user.name ?? "未命名用户",
          avatar: user.image ?? defaultUserAvatarUrl,
        });
        if (user.accounts) {
          setStore("session", "user", "account", {
            id: user.accounts[0].id,
            type: user.accounts[0].type,
          });
        }
      }

      props.setState(false);
    } catch (error) {
      console.error("请求错误:", error);
    }
  };

  const logOut = async () => {
    await fetch("/api/auth/logout");
    setStore("session", "user", {
      id: "",
      name: "",
      avatar: "",
    });
    props.setState(false);
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
        setStore("session", "user", {
          id: user.id,
          name: user.name ?? "未命名用户",
          avatar: user.image ?? defaultUserAvatarUrl,
        });
        if (user.accounts) {
          setStore("session", "user", "account", {
            id: user.accounts[0].id,
            type: user.accounts[0].type,
          });
        }
      }

      props.setState(false);
    } catch (error) {
      console.error("请求错误:", error);
    }
  };

  const [deleteCount, setDeleteCount] = createSignal(0);

  const deleteUser = async () => {
    await fetch("/api/auth/delete");
    setStore("session", "user", {
      id: "",
      name: "",
      avatar: "",
    });
    props.setState(false);
  };

  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  const [formModule, setFormModule] = createSignal<"logIn" | "register" | "unknown">("unknown");

  const formTitle = createMemo(() => {
    const userName = () => store.session.user.name;
    if (!store.session.user.id) {
      switch (formModule()) {
        case "logIn":
          return dictionary().ui.actions.logIn;
        case "register":
          return dictionary().ui.actions.register;
        default:
          return dictionary().ui.actions.logIn + "/" + dictionary().ui.actions.register;
      }
    }
    return "Hi," + userName();
  });

  const form = createForm(() => ({
    defaultValues: defaultValues,
    onSubmit: (data) => {
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
      () => props.state(),
      () => {
        setFormModule("unknown");
        form.reset();
      },
    ),
  );

  return (
    <Presence exitBeforeEnter>
      <Show when={props.state()}>
        <Motion.div
          animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
          exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`SheetBox bg-primary-color-10 fixed top-0 left-0 z-40 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
        >
          <div class="Box bg-primary-color shadow-dividing-color flex max-h-[90vh] w-[80vw] flex-col items-center gap-6 overflow-y-auto rounded-lg p-3 shadow-2xl lg:w-[560px] lg:p-12">
            <Show
              when={!store.session.user.id && props.state()}
              fallback={
                <div class="flex flex-col w-full items-center gap-4 lg:py-0">
                  <h1 class="text-3xl font-bold">{formTitle()}</h1>
                  <div class="flex w-full items-center gap-1">
                    <Button class="LoginOut flex-1" onClick={logOut}>
                      {dictionary().ui.actions.logOut}
                    </Button>
                    <Button class={`CloseBtn flex-1`} onClick={() => props.setState(false)}>
                      {dictionary().ui.actions.close}
                    </Button>
                  </div>
                </div>
              }
            >
              <h1 class="text-3xl font-bold">{formTitle()}</h1>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
                class="flex w-full flex-col"
              >
                <div>
                  {/* A type-safe field component*/}
                  <form.Field
                    name="email"
                    asyncDebounceMs={500}
                    validators={{
                      onChange: ({ value }) => {
                        const result = z.string().email().safeParse(value); // ✅ 使用 `safeParse` 避免抛出错误
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
                          state={fieldInfo(field())}
                          class="w-full"
                        />
                      );
                    }}
                  />
                </div>
                <div>
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
                        title="密码"
                        // description="也是个摆设"
                        autocomplete="current-password"
                        type="password"
                        id={field().name}
                        name={field().name}
                        value={field().state.value}
                        onBlur={field().handleBlur}
                        onInput={(e) => field().handleChange(e.target.value)}
                        state={fieldInfo(field())}
                        class="w-full"
                      />
                    )}
                  />
                </div>
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
                              state={fieldInfo(field())}
                              class="w-full"
                            />
                          )}
                        />
                      </div>
                    </Motion.div>
                  </Show>
                </Presence>
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
                        <Button level="secondary" class={`CloseBtn w-fit`} onClick={() => props.setState(false)}>
                          {dictionary().ui.actions.close}
                        </Button>
                      </div>
                    );
                  }}
                />
              </form>
            </Show>
          </div>
        </Motion.div>
      </Show>
    </Presence>
  );
};
