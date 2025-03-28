import Button from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import type { AnyFieldApi } from "@tanstack/solid-form";
import { getUser } from "~/lib/session";
import { setStore } from "~/store";
import defaultUserAvatarUrl from "/icons/512.png?url";

interface FieldInfoProps {
  field: AnyFieldApi;
}

function FieldInfo(props: FieldInfoProps) {
  return (
    <>
      {props.field.state.meta.isTouched && props.field.state.meta.errors.length ? (
        <em>{props.field.state.meta.errors.join(",")}</em>
      ) : null}
      {props.field.state.meta.isValidating ? "Validating..." : null}
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
  userId: "cluhz95c5000078elg5r46831",
  email: "",
  password: "",
};

export default function LoginForm() {
  const form = createForm(() => ({
    defaultValues: defaultValues,
    onSubmit: async ({ value }) => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
          credentials: "include",  // 关键：确保请求携带 Cookie
        });
  
        const responseText = await response.text(); // 读取返回内容
        console.log("服务器响应:", response.status, responseText); // 打印返回状态码和内容
  
        if (!response.ok) {
          console.error("登录失败", response.status, responseText);
          return;
        }
  
        const user = await getUser();
        console.log("获取到的用户信息:", user);
  
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
    <div>
      <h1>登录</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div>
          {/* A type-safe field component*/}
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => (!value ? "邮件地址不填写的话，没办法找到你的信息哦" : undefined),
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
                  <label for={field().name}>First Name:</label>
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
        <div>
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
        </div>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
          children={(state) => {
            return (
              <button type="submit" disabled={!state().canSubmit}>
                {state().isSubmitting ? "..." : "Submit"}
              </button>
            );
          }}
        />
      </form>
    </div>
  );
}
