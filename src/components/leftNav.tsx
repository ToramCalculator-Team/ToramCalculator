import { useLocation } from "@solidjs/router";

import * as Icon from "./icon";
import { getDictionary } from "~/i18n";
import { JSX } from "solid-js";
import { store } from "~/store";

export default function Nav() {
  const dictionary = getDictionary(store.settings.language);
  const location = useLocation();
  const active = (path: string) => (path.includes(location.pathname) ? "bg-brand-color-1st" : "");
  const NavBtnConfig: [string, JSX.Element | undefined, string | undefined][] = [
    [dictionary.ui.nav.monsters, < Icon.Line.Calendar />, "/monster"],
    ["LineA", , ,],
    [dictionary.ui.nav.skills, < Icon.Line.Basketball />, "/skill"],
    [dictionary.ui.nav.equipments, < Icon.Line.Category2 />, "/equipment"],
    [dictionary.ui.nav.crystals, < Icon.Line.Box2 />, "/crystal"],
    [dictionary.ui.nav.pets, < Icon.Line.Money />, "/pet"],
    [dictionary.ui.nav.items, < Icon.Line.Coins />, "/building"],
    ["LineB", , ,],
    [dictionary.ui.nav.character, < Icon.Line.Gamepad />, "/character"],
    [dictionary.ui.nav.comboAnalyze, < Icon.Line.Filter />, "/analyze"],
  ];

  return (
    <div
      class={`Nav border-t-1 z-10 flex w-dvw flex-shrink-0 overflow-x-auto border-transition-color-20 backdrop-blur lg:h-dvh lg:w-24 lg:flex-col lg:gap-10 lg:border-none lg:bg-transition-color-8 lg:py-5`}
    >
      <div class="flex items-center justify-center lg:flex-none">
        <a
          href={"/"}
          class="Home group flex flex-shrink-0 flex-col items-center gap-0.5 px-1 py-2 lg:gap-4"
          tabIndex={1}
        >
          <div class="iconArea rounded-full px-4 py-1 group-hover:bg-brand-color-1st group-focus:bg-brand-color-1st lg:hidden">
            < Icon.Line.Home />
          </div>
          < Icon.Line.Logo class="hidden lg:block" />
          <div class="text-xs lg:hidden">{dictionary.ui.nav.home}</div>
        </a>
      </div>
      <div class="NavBtnList flex flex-1 items-center lg:flex-col lg:gap-4 lg:overflow-y-auto">
        {NavBtnConfig.map(([btnName, icon, url]) => {
          if (icon !== undefined && url !== undefined) {
            return (
              <a
                href={url}
                tabIndex={0}
                class={`NavBtn btn-${btnName} group flex flex-shrink-0 flex-col items-center gap-0.5 px-1 py-2 lg:gap-1 lg:p-0`}
              >
                <div
                  class={`iconArea rounded-full px-4 py-1 ${active(url)} group-hover:bg-brand-color-1st group-focus:bg-brand-color-1st`}
                >
                  {icon}
                </div>
                <div class="text-xs">{btnName}</div>
              </a>
            );
          } else {
            return <div class={"Line h-line flex-none lg:w-12 lg:bg-brand-color-1st"}></div>;
          }
        })}
      </div>
      <div class="FunctionGroup flex items-center justify-center gap-3 px-6 lg:flex-col lg:p-0"></div>
    </div>
  );
}
