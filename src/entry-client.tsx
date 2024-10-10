// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import "~/initialWorker";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";

OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);
