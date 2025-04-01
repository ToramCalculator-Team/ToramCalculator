import Button from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import type { AnyFieldApi } from "@tanstack/solid-form";
import { getUserByCookie } from "~/lib/session";
import { setStore, store } from "~/store";
import defaultUserAvatarUrl from "~/../public/icons/512.png?url";
import { createMemo } from "solid-js";
import { getDictionary } from "~/locales/i18n";

interface FieldInfoProps {
  field: AnyFieldApi;
}

function FieldInfo(props: FieldInfoProps) {
  return (
    <>
      {props.field.state.meta.isTouched && props.field.state.meta.errors.length ? (
        <em>{props.field.state.meta.errors.join(",")}</em>
      ) : null}
      {props.field.state.meta.isValidating ? "校验中..." : null}
    </>
  );
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

export default function LoginForm() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const formTitle = createMemo(() => {
    const userName = () => store.session.user.name;
    if (!store.session.user.id) return dictionary().ui.actions.logIn;
    return "Hi," + userName();
  });

  const form = createForm(() => ({
    defaultValues: defaultValues,
    onSubmit: async ({ value }) => {
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
      } catch (error) {
        console.error("请求错误:", error);
      }
    },
  }));

  return (
    <div class="flex flex-col items-center p-12 rounded-lg bg-primary-color shadow-dividing-color shadow-2xl gap-6">
      <h1 class="text-3xl font-bold">{formTitle()}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class="flex flex-col gap-4 items-start"
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
              // Avoid hasty abstractions. Render props are great!
              return (
                <>
                  <label for={field().name}>用户ID:</label>
                  <input
                    id={field().name}
                    name={field().name}
                    value={field().state.value}
                    onBlur={field().handleBlur}
                    onInput={(e) => field().handleChange(e.target.value)}
                  />
                  <FieldInfo field={field()} />
                </>
              );
            }}
          />
        </div>
        {/* <div>
          <form.Field
            name="userName"
            children={(field) => (
              <>
                <label for={field().name}>用户名（目前是个摆设）:</label>
                <input
                  id={field().name}
                  name={field().name}
                  value={field().state.value}
                  onBlur={field().handleBlur}
                  onInput={(e) => field().handleChange(e.target.value)}
                />
                <FieldInfo field={field()} />
              </>
            )}
          />
        </div>
        <div>
          <form.Field
            name="password"
            children={(field) => (
              <>
                <label for={field().name}>密码（也是个摆设）:</label>
                <input
                  id={field().name}
                  name={field().name}
                  value={field().state.value}
                  onBlur={field().handleBlur}
                  onInput={(e) => field().handleChange(e.target.value)}
                />
                <FieldInfo field={field()} />
              </>
            )}
          />
        </div> */}
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
          children={(state) => {
            return (
              <Button type="submit" disabled={!state().canSubmit}>
                {state().isSubmitting ? "..." : "Submit"}
              </Button>
            );
          }}
        />
      </form>
    </div>
  );
}
