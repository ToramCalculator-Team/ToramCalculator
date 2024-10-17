// @refresh reload
import { StartServer, createHandler } from "@solidjs/start/server";
import { env } from "process";

const APP_NAME = "托拉姆计算器-ToramCalculator:一个简单的托拉姆数值计算器";
const APP_DEFAULT_TITLE = "托拉姆计算器-ToramCalculator";
const APP_TITLE_TEMPLATE = "ToramCalculator";
const APP_DESCRIPTION = "Wiki、角色配置、连击计算等";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="zh-CN" class="">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/icons/48.ico" />
          <title>{APP_TITLE_TEMPLATE}</title>
          <meta name="theme-color" content="#ffffff" />
          <meta name="application-name" content={APP_NAME} />
          <meta name="description" content={APP_DESCRIPTION} />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="mobile-web-app-status-bar-style" content="default" />
          <meta name="mobile-web-app-title" content={APP_NAME} />
          <meta property="og:title" content={APP_DEFAULT_TITLE} />
          <meta property="og:description" content={APP_DESCRIPTION} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={APP_NAME} />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={APP_DEFAULT_TITLE} />
          <meta name="twitter:description" content={APP_DESCRIPTION} />
          <link rel="manifest" href="/manifest.json" />
          {/* <meta name="baidu-site-verification" content={env.BAIDU_HTML_LABEL} /> */}
          {assets}
        </head>
        <body>
          <div id="app" class="flex h-dvh w-dvw flex-col-reverse lg:flex-row">
            {children}
          </div>
          {scripts}
          {/* <script id="umami" defer src="https://cloud.umami.is/script.js" data-website-id={env.UMAMI_ID}></script> */}
        </body>
      </html>
    )}
  />
));
