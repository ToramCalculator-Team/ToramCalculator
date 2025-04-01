import Button from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import type { AnyFieldApi } from "@tanstack/solid-form";
import { getUserByCookie } from "~/lib/session";
import { setStore, store } from "~/store";
import defaultUserAvatarUrl from "~/../public/icons/512.png?url";
import { Accessor, createMemo, createSignal, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { Motion, Presence } from "solid-motionone";
import * as Icon from "~/components/icon";
import Input from "../controls/input";

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
  userName: string;
  userId: string;
  email: string;
  password: string;
}

const defaultValues: LoginFormProps = {
  userName: "",
  userId: "",
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
        switch (response.status) {
          case 400:
            alert("登录失败");
            break;
          case 404:
            alert("用户不存在");
            break;
          default:
            alert("登录失败");
        }
        return;
      }

      // 从服务端获取用户信息
      const user = await getUserByCookie();
      // console.log("获取到的用户信息:", user);

      if (user) {
        setStore("session", "user", "id", user.id);
        setStore("session", "user", "name", user.name ?? "无名氏");
        setStore("session", "user", "avatar", user.image ?? defaultUserAvatarUrl);
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
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  const formTitle = createMemo(() => {
    const userName = () => store.session.user.name;
    if (!store.session.user.id) return dictionary().ui.actions.logIn;
    return "Hi," + userName();
  });

  const form = createForm(() => ({
    defaultValues: defaultValues,
    onSubmit: (data) => logIn(data.value),
  }));

  return (
    <Presence exitBeforeEnter>
      <Show when={props.state()}>
        <Motion.div
          animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
          exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`DialogBox bg-primary-color-10 fixed top-0 left-0 z-40 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
        >
          <div class="Box max-h-[90vh] overflow-y-auto bg-primary-color shadow-dividing-color flex flex-col items-center gap-6 rounded-lg p-3 lg:p-12 shadow-2xl w-[80vw] lg:w-[560px]">
            <Show
              when={!store.session.user.id && props.state()}
              fallback={
                <>
                  <h1 class="text-3xl font-bold">{formTitle()}</h1>
                  <div class="flex items-center gap-4">
                    <Button class="LoginOut" onClick={logOut}>
                      {dictionary().ui.actions.logOut}
                    </Button>
                    <Button class={`CloseBtn`} onClick={() => props.setState(false)}>
                      {dictionary().ui.actions.close}
                    </Button>
                  </div>
                </>
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
                    name="userId"
                    validators={{
                      onChange: ({ value }) => (!value ? "ID是必填项" : undefined),
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: async ({ value }) => {
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                        return value.includes("error") && 'No "error" allowed in first name';
                      },
                    }}
                    children={(field) => {
                      return (
                        <Input
                          title="用户ID"
                          description="一定要填"
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
                    name="userName"
                    children={(field) => (
                      <Input
                        title="用户名"
                        description="目前是个摆设"
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
                <div>
                  <form.Field
                    name="password"
                    children={(field) => (
                      <Input
                        title="密码"
                        description="也是个摆设"
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
                <form.Subscribe
                  selector={(state) => ({
                    canSubmit: state.canSubmit,
                    isSubmitting: state.isSubmitting,
                  })}
                  children={(state) => {
                    return (
                      <div class="flex items-center gap-1 p-2">
                        <Button level="primary" class={`SubmitBtn flex-1`} type="submit" disabled={!state().canSubmit}>
                          {state().isSubmitting ? "..." : dictionary().ui.actions.logIn}
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
