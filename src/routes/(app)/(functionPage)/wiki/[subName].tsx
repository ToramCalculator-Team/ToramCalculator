import { useNavigate, useParams } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  JSX,
  on,
  onCleanup,
  onMount,
  Show,
  useContext,
} from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { setStore, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import { Button } from "~/components/controls/button";
import { Portal } from "solid-js/web";
import { Sheet } from "~/components/controls/sheet";
import { LoadingBar } from "~/components/loadingBar";
import { defaultData } from "~/../db/defaultData";
import { DB } from "~/../db/kysely/kyesely";
import { dataDisplayConfig } from "./dataConfig/dataConfig";
import { Form } from "~/components/module/form";
import { VirtualTable } from "~/components/module/virtualTable";
import { MediaContext } from "~/contexts/Media";
import { VisibilityState } from "@tanstack/solid-table";
import { Dialog } from "~/components/controls/dialog";
import { getDB } from "~/repositories/database";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { DBDataConfig } from "./dataConfig/dataConfig";

// 弹出层装饰花纹
const Decorate = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg width="44" height="47" viewBox="0 0 44 47" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M9.42128 12.4651C9.31564 12.4651 9.24522 12.4299 9.1748 12.3242C9.10438 12.1834 9.13959 12.0073 9.28043 11.9369C11.9213 10.3524 15.1255 9.82425 18.1185 10.4933C18.2593 10.5285 18.3649 10.6693 18.3297 10.8454C18.2945 10.9862 18.1537 11.0919 17.9776 11.0566C15.1255 10.4228 12.0621 10.951 9.52691 12.4299C9.52691 12.4651 9.45649 12.4651 9.42128 12.4651Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M16.0058 13.7679C15.9706 13.7679 15.9354 13.7679 15.9002 13.7327C13.8931 12.8525 11.5692 12.8172 9.52692 13.6271C9.38608 13.6975 9.21002 13.6271 9.1396 13.451C9.06917 13.3102 9.1396 13.1341 9.31565 13.0637C11.4988 12.2186 13.9635 12.2539 16.1114 13.2046C16.2523 13.275 16.3227 13.451 16.2523 13.5919C16.2171 13.7327 16.1114 13.7679 16.0058 13.7679Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M14.2804 15.1059C14.2452 15.1059 14.1748 15.1059 14.1396 15.0707C13.5058 14.6834 12.6959 14.5073 11.6396 14.5778C10.9706 14.613 10.3015 14.7186 9.66774 14.9299C9.52689 14.9651 9.35084 14.8947 9.31563 14.7186C9.28042 14.5778 9.35084 14.4017 9.52689 14.3665C10.2311 14.1552 10.9353 14.0496 11.6396 14.0144C12.8368 13.944 13.7522 14.12 14.4565 14.5778C14.5973 14.6482 14.6325 14.8242 14.5621 14.9651C14.4565 15.0707 14.386 15.1059 14.2804 15.1059Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M12.6607 16.6552C12.5903 16.6552 12.5551 16.6552 12.5199 16.62C11.71 16.0918 10.6889 15.8805 9.7382 16.0214C9.59735 16.0566 9.4213 15.951 9.4213 15.7749C9.38609 15.6341 9.49172 15.458 9.66778 15.458C10.7593 15.282 11.9213 15.5284 12.872 16.127C13.0128 16.1975 13.0481 16.3735 12.9424 16.5144C12.8368 16.62 12.7312 16.6552 12.6607 16.6552Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M22.872 12.2257C22.4494 12.2257 22.0621 12.1553 21.71 12.0496C20.7593 11.7327 19.7734 10.8172 19.7734 9.65527C19.7734 8.77499 20.3368 7.96513 21.1466 7.64823C21.9565 7.33133 22.9424 7.57781 23.5058 8.24682C23.8227 8.63415 23.9987 9.19753 23.9283 9.69048C23.8579 10.113 23.6466 10.4299 23.3297 10.6412C22.6255 11.0989 21.6748 10.6764 21.2522 10.0426C21.1818 9.90175 21.217 9.72569 21.3227 9.65527C21.4635 9.58485 21.6396 9.62006 21.71 9.72569C21.9565 10.1482 22.5903 10.3947 22.9776 10.1482C23.1889 10.0074 23.2945 9.76091 23.2945 9.62006C23.3297 9.26795 23.2241 8.88062 23.0128 8.63414C22.5903 8.14119 21.8861 7.96513 21.2875 8.1764C20.6889 8.38767 20.2663 9.02147 20.2663 9.65527C20.2663 10.5356 21.041 11.2398 21.8156 11.4863C22.5551 11.7327 23.4353 11.6623 24.5269 11.3102C27.6959 10.2891 30.1607 7.68344 32.3086 5.00738C33.4001 3.63414 34.5621 2.15527 35.4424 0.500342C35.5128 0.359497 35.6889 0.324286 35.8297 0.394708C35.9706 0.465131 36.0058 0.641187 35.9353 0.782032C35.0199 2.47217 33.8579 3.98626 32.7311 5.3595C30.6184 8.14119 28.1184 10.8172 24.7734 11.8736C24.0691 12.1201 23.4706 12.2257 22.872 12.2257Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M7.87199 9.4369C7.73115 9.4369 7.62551 9.33127 7.5903 9.22564C7.41424 8.45099 7.06213 7.81718 6.60439 7.35944C6.53396 7.28902 6.42833 7.18338 6.35791 7.11296C5.65368 6.51437 4.94946 5.88057 4.10439 5.52845C3.96354 5.45803 3.89312 5.28197 3.96354 5.14113C4.03396 5.00028 4.21002 4.92986 4.35086 5.00028C5.26636 5.38761 6.00579 6.05662 6.71002 6.69042C6.81565 6.79606 6.92129 6.86648 6.99171 6.97211C7.55509 7.50028 7.94241 8.23972 8.11847 9.12C8.15368 9.26085 8.04805 9.4369 7.9072 9.47211C7.9072 9.4369 7.9072 9.4369 7.87199 9.4369Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M8.75228 8.20456C8.61143 8.20456 8.47059 8.09892 8.47059 7.95808C8.36495 6.86653 7.76636 5.81019 6.88608 5.14118C6.46355 4.82428 6.0058 4.64822 5.58326 4.64822C5.44242 4.64822 5.30157 4.50737 5.30157 4.36653C5.30157 4.22568 5.40721 4.08484 5.58326 4.08484C6.11143 4.08484 6.67481 4.29611 7.20298 4.68343C8.22411 5.42287 8.92834 6.65526 9.03397 7.92287C9.06918 8.06371 8.96355 8.20456 8.75228 8.20456C8.78749 8.20456 8.78749 8.20456 8.75228 8.20456Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M9.7382 7.28903C9.59736 7.28903 9.45651 7.18339 9.45651 7.04255C9.31567 6.09184 9.21003 5.28198 8.68186 4.7186C8.57623 4.61297 8.57623 4.43691 8.71708 4.33128C8.82271 4.22564 8.99877 4.22564 9.1044 4.36649C9.77341 5.10593 9.91426 6.19748 9.98468 6.97212C10.0199 7.11297 9.91426 7.25381 9.7382 7.28903Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M11.1466 6.8665C10.9706 6.83129 10.8297 6.72565 10.8649 6.5496C10.9353 5.91579 10.7945 5.24678 10.5128 4.6834C10.4424 4.54255 10.4776 4.3665 10.6184 4.29608C10.7593 4.22565 10.9353 4.26086 11.0058 4.40171C11.3579 5.07072 11.5339 5.84537 11.4283 6.62002C11.4283 6.76086 11.2875 6.8665 11.1466 6.8665Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M12.5198 6.47913C12.4846 6.47913 12.4846 6.47913 12.4494 6.47913C12.3086 6.44391 12.2029 6.30307 12.2381 6.12701C12.3438 5.66927 12.3086 5.1411 12.1677 4.68335C12.1325 4.54251 12.2029 4.36645 12.3438 4.33124C12.4846 4.29603 12.6607 4.36645 12.6959 4.50729C12.872 5.07068 12.9072 5.66927 12.8015 6.23265C12.7663 6.4087 12.6255 6.47913 12.5198 6.47913Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M6.34382 28.8735C6.20297 28.8735 6.06213 28.7326 6.06213 28.5918C6.02692 27.3946 5.32269 26.4087 4.61847 25.3523C4.37199 25.0354 4.16072 24.7538 3.94945 24.4368C3.24523 23.3101 2.8579 22.1833 2.78748 21.127C2.71706 19.8242 3.1748 18.5918 4.01987 17.8171C5.00579 16.9368 6.44945 16.7608 7.50579 17.3594C8.45649 17.9228 9.01987 19.1552 8.94945 20.458C8.87903 21.6552 8.38607 22.7467 7.89311 23.6622C7.82269 23.803 7.64663 23.8735 7.50579 23.7678C7.36494 23.6974 7.29452 23.5214 7.40016 23.3805C7.8579 22.5002 8.35086 21.4791 8.38607 20.3876C8.45649 19.296 7.99875 18.2749 7.2241 17.8171C6.41424 17.3242 5.18185 17.5002 4.4072 18.2045C3.66776 18.8735 3.28044 19.9298 3.35086 21.0566C3.38607 22.0073 3.7734 23.0284 4.44241 24.0847C4.61847 24.4016 4.82973 24.6833 5.041 25.0002C5.78044 26.0918 6.5903 27.2185 6.5903 28.5566C6.62551 28.7678 6.48466 28.8735 6.34382 28.8735Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M27.0269 8.52856C26.9917 8.52856 26.9213 8.52856 26.8861 8.52856C26.2171 8.49335 25.5833 8.07081 25.0903 7.36659C24.8086 6.97926 24.5974 6.52152 24.4213 6.09898C24.3509 5.92292 24.2805 5.74687 24.1748 5.57081C23.9636 5.18349 23.7523 4.79616 23.541 4.44405C22.6255 2.89475 21.6748 1.45109 20.1959 0.887713C19.3861 0.570811 18.4354 0.570811 17.6255 0.887713C16.6748 1.23983 15.7945 2.04968 15.2312 3.17645C14.6678 4.19757 14.3861 5.39476 14.1748 6.52152C14.1396 6.66236 13.9988 6.76799 13.8227 6.73278C13.6819 6.69757 13.5762 6.55673 13.6114 6.38067C13.8579 5.2187 14.1396 3.9863 14.7382 2.89475C15.4072 1.66236 16.3579 0.746867 17.4495 0.359544C18.4002 0.00743081 19.4565 0.00743081 20.4072 0.359544C22.0621 0.993346 23.0481 2.50743 24.034 4.16236C24.2452 4.54969 24.4917 4.93701 24.703 5.32433C24.7734 5.50039 24.879 5.67645 24.9495 5.8525C25.1255 6.27504 25.3368 6.66236 25.5833 7.01447C25.9706 7.54264 26.4636 7.89476 26.9565 7.92997C27.5199 7.96518 28.1185 7.61307 28.4354 7.0849C28.7171 6.59194 28.8579 5.99335 28.8579 5.18349C28.8579 3.70461 28.3297 2.22574 27.379 1.06377C27.2734 0.958135 27.3086 0.746868 27.4143 0.676445C27.5199 0.570811 27.7312 0.606022 27.8016 0.711656C28.8227 1.97926 29.3861 3.56377 29.3861 5.18349C29.3861 6.09898 29.21 6.80321 28.8579 7.36659C28.4706 8.07081 27.7664 8.52856 27.0269 8.52856Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M4.44239 46.5848C3.66774 46.5848 2.9283 46.3384 2.40013 45.8806C1.76633 45.3172 1.44943 44.4722 1.48464 43.4862C1.51985 41.8665 2.40013 40.3524 3.28041 39.12C3.45647 38.8736 3.63253 38.6271 3.80858 38.3806C4.51281 37.3595 5.28746 36.3384 5.67478 35.2116C6.23816 33.6623 6.02689 32.1482 5.1114 31.1975C5.00577 31.0919 5.00577 30.9158 5.1114 30.8102C5.21703 30.7045 5.39309 30.7045 5.49872 30.8102C6.55506 31.9369 6.80154 33.6623 6.16774 35.4229C5.7452 36.62 4.97056 37.7116 4.23112 38.7327C4.05506 38.9792 3.87901 39.2257 3.73816 39.4722C2.9283 40.6341 2.08323 42.0426 2.04802 43.5214C2.04802 44.0144 2.11844 44.8947 2.78746 45.4933C3.5621 46.1623 4.97056 46.2679 5.95647 45.6693C6.87196 45.1412 7.40013 44.12 7.40013 42.9933C7.40013 42.5707 7.2945 42.0074 6.83675 41.6905C6.44943 41.4088 5.85084 41.4088 5.35788 41.62C4.90013 41.8313 4.54802 42.2186 4.37196 42.7116C4.30154 42.8876 4.09027 43.4862 4.4776 43.8736C4.61844 44.0144 4.90013 44.0848 5.14661 44.0496C5.21703 44.0496 5.39309 43.9792 5.4283 43.8384C5.49872 43.6975 5.63957 43.6271 5.81563 43.6623C5.95647 43.7327 6.02689 43.8736 5.99168 44.0496C5.88605 44.3313 5.63957 44.5426 5.28746 44.613C4.86492 44.7186 4.37196 44.5778 4.09027 44.2961C3.66774 43.8736 3.5621 43.2045 3.8438 42.5003C4.09027 41.8665 4.54802 41.3384 5.14661 41.0919C5.81563 40.775 6.6607 40.8454 7.18887 41.2327C7.68182 41.5848 7.99872 42.2186 7.99872 42.9933C7.99872 44.2961 7.36492 45.4933 6.27337 46.1623C5.67478 46.444 5.07619 46.5848 4.44239 46.5848Z"
        fill="currentColor"
        fill-opacity="0.55"
      />
      <path
        d="M42.5 1C40.8333 3 36.2 7 31 7C24.5 7 28 6 19.5 6C11 6 6 9.5 2.5 16"
        stroke="currentColor"
        stroke-opacity="0.55"
        stroke-linecap="round"
      />
      <path
        d="M1.5 7C3.16667 8.16667 6.5 11.7 6.5 16.5C6.5 22.5 1 27 1 33.5C1 37 3.5 37.5 5.5 37.5C7.5 37.5 12 36 12 30.5C12 26.5 8.5 26.5 8 26.5C7.5 26.5 4.5 27 4.5 31.5C4.5 33 5.5 33 6 33C7 33 8 32 8 31"
        stroke="currentColor"
        stroke-opacity="0.55"
        stroke-linecap="round"
      />
    </svg>
  );
};

export default function WikiSubPage() {
  // const start = performance.now();
  // console.log("WikiSubPage start", start);
  const media = useContext(MediaContext);
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // url 参数
  const params = useParams();
  const navigate = useNavigate();

  // 状态管理参数
  const [isTableFullscreen, setIsTableFullscreen] = createSignal(false);
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(0);

  const [tableName, setTableName] = createSignal<keyof DB>();
  const [dataConfig, setDataConfig] = createSignal<dataDisplayConfig<any>>();

  const [wikiSelectorIsOpen, setWikiSelectorIsOpen] = createSignal(false);

  // form
  const [formSheetIsOpen, setFormSheetIsOpen] = createSignal(false);

  // table
  const [tableFilterInputRef, setTableFilterInputRef] = createSignal<HTMLInputElement>();
  const [tableGlobalFilterStr, setTableGlobalFilterStr] = createSignal<string>("");
  const [tableColumnVisibility, setTableColumnVisibility] = createSignal<VisibilityState>({});
  const [tableConfigSheetIsOpen, setTableConfigSheetIsOpen] = createSignal(false);

  // card
  const [cardTypeAndIds, setCardTypeAndIds] = createSignal<{ type: keyof DB; id: string }[]>([]);
  const [cardGroupIsOpen, setCardGroupIsOpen] = createSignal(false);
  const [cachedCardDatas, setCachedCardDatas] = createSignal<Record<string, unknown>[]>([]);

  // 获取新数据并更新缓存
  createResource(
    () => cardTypeAndIds().slice(cachedCardDatas().length),
    async (newItems) => {
      if (newItems.length === 0) return;
      const results: Record<string, unknown>[] = [];
      for (const { type, id } of newItems) {
        const config = DBDataConfig(dictionary())[type];
        if (config?.dataFetcher) {
          const result = await config.dataFetcher(id);
          results.push(result);
        }
      }
      setCachedCardDatas((prev) => [...prev, ...results]);
    },
  );

  createEffect(
    on(cardTypeAndIds, (newIds) => {
      // 如果 cardTypeAndIds 长度小于 cachedCardDatas，说明有数据被删除
      if (newIds.length < cachedCardDatas().length) {
        setCachedCardDatas((prev) => prev.slice(0, newIds.length));
      }
      if (cardTypeAndIds().length <= 0) {
        setCardGroupIsOpen(false);
      }
    }),
  );

  createEffect(
    on(
      () => params.subName,
      () => {
        // const start = performance.now();
        // console.log("Effect start", start);
        console.log("Url参数：", params.subName);
        if (params.subName in defaultData) {
          const wikiType = params.subName as keyof DB;
          // 初始化页面状态
          setIsTableFullscreen(false);
          setActiveBannerIndex(0);
          setTableName(wikiType);
          setDataConfig(DBDataConfig(dictionary())[wikiType]);
          const validDataConfig = dataConfig();
          if (validDataConfig) {
          }
        } else {
          navigate(`/404`);
        }
        // console.log("Effect end", performance.now() - start);
      },
    ),
  );

  // wiki 选择器(弹出层)配置
  const wikiSelectorConfig: {
    groupName: string;
    groupFields: {
      name: keyof DB;
      icon: JSX.Element;
    }[];
  }[] = [
    {
      groupName: dictionary().ui.wiki.selector.groupName.combat,
      groupFields: [
        {
          name: "mob",
          icon: <Icon.Filled.Browser />,
        },
        {
          name: "skill",
          icon: <Icon.Filled.Basketball />,
        },
        {
          name: "weapon",
          icon: <Icon.Filled.Box2 />,
        },
        {
          name: "armor",
          icon: <Icon.Filled.Category2 />,
        },
        {
          name: "option",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "special",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "crystal",
          icon: <Icon.Filled.Layers />,
        },
      ],
    },
    {
      groupName: dictionary().ui.wiki.selector.groupName.daily,
      groupFields: [
        {
          name: "address",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "zone",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "npc",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "consumable",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "material",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "task",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "activity",
          icon: <Icon.Filled.Layers />,
        },
      ],
    },
  ];

  const [tableRefetch, setTableRefetch] = createSignal<() => void>();

  onMount(() => {
    console.log(`--Wiki Page Mount`);
  });

  onCleanup(() => {
    console.log(`--Wiki Page Unmount`);
  });

  return (
    <Show when={tableName()} fallback={"init"}>
      {(validTableName) => (
        <Show when={dataConfig()}>
          {(validDataConfig) => (
            <Show
              when={store.database.tableSyncState[validTableName()]}
              fallback={
                <div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
                  <LoadingBar class="w-1/2 min-w-[320px]" />
                  <h1 class="animate-pulse">awaiting DB-{validTableName()} sync...</h1>
                </div>
              }
            >
              <Presence exitBeforeEnter>
                <Show when={!isTableFullscreen()}>
                  <Motion.div
                    class="Title flex flex-col lg:pt-12 landscape:p-3"
                    animate={{ opacity: [0, 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                  >
                    <div class="Content flex flex-row items-center justify-between gap-4 px-6 py-0 lg:px-0 lg:py-3">
                      <h1
                        onClick={() => setWikiSelectorIsOpen((pre) => !pre)}
                        class="Text flex cursor-pointer items-center gap-3 text-left text-2xl font-black lg:bg-transparent lg:text-[2.5rem] lg:leading-[48px] lg:font-normal"
                      >
                        {dictionary().db[validTableName()].selfName}
                        <Icon.Line.Swap />
                      </h1>
                      <input
                        id="DataSearchBox"
                        type="search"
                        placeholder={dictionary().ui.searchPlaceholder}
                        class="border-dividing-color placeholder:text-dividing-color hover:border-main-text-color focus:border-main-text-color hidden h-[50px] w-full flex-1 rounded-none border-b-1 bg-transparent px-3 py-2 backdrop-blur-xl focus:outline-hidden lg:block lg:h-[48px] lg:flex-1 lg:px-5 lg:font-normal"
                        onInput={(e) => {
                          setTableGlobalFilterStr(e.target.value);
                        }}
                      />
                      <Button // 仅移动端显示
                        size="sm"
                        icon={<Icon.Line.InfoCircle />}
                        class="flex bg-transparent lg:hidden"
                        onClick={() => {}}
                      ></Button>
                      <Show when={store.session.user.id}>
                        <Button // 仅PC端显示
                          icon={<Icon.Line.CloudUpload />}
                          class="hidden lg:flex"
                          onClick={() => {
                            setFormSheetIsOpen(true);
                          }}
                        >
                          {dictionary().ui.actions.add}
                        </Button>
                      </Show>
                    </div>
                  </Motion.div>
                </Show>
              </Presence>
              <Presence exitBeforeEnter>
                <Show when={!isTableFullscreen()}>
                  <Motion.div
                    class="Banner hidden h-[260px] flex-initial gap-3 p-3 opacity-0 lg:flex"
                    animate={{ opacity: [0, 1] }}
                    exit={{ opacity: [1, 0] }}
                    transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                  >
                    <div class="BannerContent flex flex-1 gap-6 lg:gap-2">
                      <For each={[0, 1, 2]}>
                        {(_, index) => {
                          const brandColor = {
                            1: "1st",
                            2: "2nd",
                            3: "3rd",
                          }[1 + (index() % 3)];
                          return (
                            <Presence exitBeforeEnter>
                              <Show when={!isTableFullscreen()}>
                                <Motion.div
                                  class={`Banner-${index} flex-none overflow-hidden rounded border-2 ${activeBannerIndex() === index() ? "active shadow-card shadow-dividing-color border-primary-color" : "border-transparent"}`}
                                  onMouseEnter={() => setActiveBannerIndex(index())}
                                  style={{
                                    // "background-image": `url(${mobList()?.[0]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                                    "background-position": "center center",
                                  }}
                                  animate={{
                                    opacity: [0, 1],
                                    transform: ["scale(0.9)", "scale(1)"],
                                  }}
                                  exit={{
                                    opacity: [1, 0],
                                    transform: ["scale(1)", "scale(0.9)"],
                                  }}
                                  transition={{
                                    duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
                                    delay: index() * 0.05,
                                  }}
                                >
                                  <div
                                    class={`mask ${activeBannerIndex() === index() ? `bg-brand-color-${brandColor}` : `bg-area-color`} text-primary-color hidden h-full flex-col justify-center gap-2 p-8 lg:flex`}
                                  >
                                    <span
                                      class={`text-3xl font-bold ${activeBannerIndex() === index() ? `text-primary-color` : `text-accent-color`}`}
                                    >
                                      TOP.{index() + 1}
                                    </span>
                                    <div
                                      class={`h-[1px] w-[110px] ${activeBannerIndex() === index() ? `bg-primary-color` : `bg-accent-color`}`}
                                    ></div>
                                    <span
                                      class={`text-xl ${activeBannerIndex() === index() ? `text-primary-color` : `text-accent-color`}`}
                                    >
                                      {/* {"name" in defaultData[tableName()] ? dataConfig().table.dataList?.latest?.[index()].name : ""} */}
                                    </span>
                                  </div>
                                </Motion.div>
                              </Show>
                            </Presence>
                          );
                        }}
                      </For>
                    </div>
                  </Motion.div>
                </Show>
              </Presence>

              <div class="Table&News flex h-full flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:p-3">
                <div class="TableModule flex flex-1 flex-col overflow-hidden">
                  <div class="Title hidden h-12 w-full items-center gap-3 lg:flex">
                    <div class={`Text px-6 text-xl`}>{dictionary().db[validTableName()].selfName}</div>
                    <div
                      class={`Description ${!isTableFullscreen() ? "opacity-0" : "opacity-100"} bg-area-color flex-1 rounded p-3`}
                    >
                      {dictionary().db[validTableName()].description}
                    </div>
                    <Button
                      level="quaternary"
                      icon={isTableFullscreen() ? <Icon.Line.Collapse /> : <Icon.Line.Expand />}
                      onClick={() => {
                        setIsTableFullscreen((pre) => !pre);
                      }}
                    />
                  </div>
                  {VirtualTable({
                    dataFetcher: validDataConfig().datasFetcher,
                    columnsDef: validDataConfig().table.columnDef,
                    hiddenColumnDef: validDataConfig().table.hiddenColumns,
                    tdGenerator: validDataConfig().table.tdGenerator,
                    defaultSort: validDataConfig().table.defaultSort,
                    globalFilterStr: tableGlobalFilterStr,
                    dictionary: validDataConfig().table.dic,
                    columnVisibility: tableColumnVisibility(),
                    onColumnVisibilityChange: (updater) => {
                      if (typeof updater === "function") {
                        setTableColumnVisibility((prev) => (prev ? updater(prev) : updater({})));
                      } else {
                        setTableColumnVisibility(() => updater);
                      }
                    },
                    columnHandleClick: (id) => {
                      setCardTypeAndIds((pre) => [...pre, { type: validTableName(), id }]);
                      setCardGroupIsOpen(true);
                    },
                    onRefetch: (refetch) => setTableRefetch(() => refetch),
                  })}
                </div>
                <Presence exitBeforeEnter>
                  <Show when={!isTableFullscreen()}>
                    <Motion.div
                      animate={{ opacity: [0, 1] }}
                      exit={{ opacity: 0 }}
                      class="News hidden w-[248px] flex-initial flex-col gap-2 lg:flex"
                    >
                      <div class="Title flex h-12 text-xl">{dictionary().ui.wiki.news.title}</div>
                      <div class="Content flex flex-1 flex-col gap-3">
                        <For each={[0, 1, 2]}>
                          {(_, index) => {
                            return (
                              <Motion.div
                                class="Item bg-area-color h-full w-full flex-1 rounded"
                                animate={{
                                  opacity: [0, 1],
                                  transform: ["scale(0.9)", "scale(1)"],
                                }}
                                exit={{
                                  opacity: [1, 0],
                                  transform: ["scale(1)", "scale(0.9)"],
                                }}
                                transition={{
                                  duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
                                  delay: index() * 0.05,
                                }}
                              ></Motion.div>
                            );
                          }}
                        </For>
                      </div>
                    </Motion.div>
                  </Show>
                </Presence>
              </div>

              <Presence exitBeforeEnter>
                <Show when={isTableFullscreen() || media.width < 1024}>
                  <Motion.div
                    class="Control bg-primary-color shadow-dividing-color shadow-dialog absolute bottom-3 left-1/2 z-10 flex w-1/2 min-w-80 gap-1 rounded p-1 lg:min-w-2xl landscape:bottom-6"
                    animate={{
                      opacity: [0, 1],
                      transform: ["translateX(-50%)", "translateX(-50%)"],
                    }}
                    exit={{ opacity: 0, transform: "translateX(-50%)" }}
                    transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                  >
                    <Show when={store.session.user.id}>
                      <Button
                        size="sm"
                        class="bg-transparent"
                        icon={<Icon.Line.CloudUpload />}
                        onClick={() => {
                          setFormSheetIsOpen(true);
                        }}
                      ></Button>
                    </Show>
                    <input
                      id="filterInput"
                      ref={setTableFilterInputRef}
                      type="text"
                      placeholder={dictionary().ui.actions.filter}
                      value={tableGlobalFilterStr()}
                      tabIndex={1}
                      onInput={(e) => {
                        setTableGlobalFilterStr(e.target.value);
                      }}
                      class="focus:placeholder:text-accent-color bg-area-color placeholder:text-boundary-color w-full flex-1 rounded px-4 py-2 text-lg font-bold mix-blend-multiply outline-hidden! placeholder:text-base placeholder:font-normal focus-within:outline-hidden landscape:flex landscape:bg-transparent dark:mix-blend-normal"
                    />
                    <Button
                      size="sm"
                      class="bg-transparent"
                      onclick={() => {
                        setTableConfigSheetIsOpen((pre) => !pre);
                      }}
                      icon={<Icon.Line.Settings />}
                    />
                  </Motion.div>
                </Show>
              </Presence>
              <Portal>
                <Sheet state={formSheetIsOpen()} setState={setFormSheetIsOpen}>
                  {validDataConfig().form((table, id) => {
                    const refetch = tableRefetch();
                    if (refetch) refetch();
                    setCardTypeAndIds((pre) => [...pre, { type: table, id }]);
                    setCardGroupIsOpen(true);
                    setFormSheetIsOpen(false);
                  })}
                </Sheet>
              </Portal>

              <Portal>
                <Presence exitBeforeEnter>
                  <Show when={cardGroupIsOpen()}>
                    <Motion.div
                      animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
                      exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
                      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                      class={`DialogBG bg-primary-color-10 fixed top-0 left-0 z-40 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
                      onClick={() => setCardTypeAndIds((pre) => pre.slice(0, -1))}
                    >
                      <For each={cachedCardDatas()}>
                        {(cardData, index) => {
                          return (
                            <Show when={cachedCardDatas().length - index() < 5}>
                              <Motion.div
                                animate={{
                                  transform: [
                                    `rotate(0deg)`,
                                    `rotate(${(cachedCardDatas().length - index() - 1) * 2}deg)`,
                                  ],
                                  opacity: [0, 1],
                                }}
                                exit={{
                                  transform: [
                                    `rotate(${(cachedCardDatas().length - index() - 1) * 2}deg)`,
                                    `rotate(0deg)`,
                                  ],
                                  opacity: [1, 0],
                                }}
                                transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                                class="DialogBox drop-shadow-dividing-color bg-primary-color fixed top-1/2 left-1/2 z-10 flex h-[70vh] w-full max-w-[90vw] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded p-2 drop-shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  "z-index": `${index()}`,
                                }}
                              >
                                <Show when={cardTypeAndIds()[index()]?.type}>
                                  {(type) => {
                                    return (
                                      <>
                                        <div class="DialogTitle drop-shadow-dividing-color absolute -top-3 z-10 flex items-center drop-shadow-xl">
                                          <svg
                                            width="30"
                                            height="48"
                                            viewBox="0 0 30 48"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M13.8958 -6.07406e-07L-1.04907e-06 24L13.8958 48L29 48L29 -1.26763e-06L13.8958 -6.07406e-07Z"
                                              fill="rgb(var(--primary))"
                                            />
                                            <path
                                              d="M19 6.99999L9 24L19 41L29 41L29 6.99999L19 6.99999Z"
                                              fill="currentColor"
                                            />
                                            <path
                                              d="M29.5 3.49999L29.5 44.5L16.2109 44.5L16.0664 44.249L4.56641 24.249L4.42285 24L4.56641 23.751L16.0664 3.75097L16.2109 3.49999L29.5 3.49999Z"
                                              stroke="currentColor"
                                              stroke-opacity="0.55"
                                            />
                                          </svg>

                                          <div class="bg-primary-color z-10 -mx-[1px] py-[3px]">
                                            <div class="border-boundary-color border-y py-[3px]">
                                              <h1 class="text-primary-color bg-accent-color py-[3px] text-xl font-bold">
                                                {"name" in cardData
                                                  ? (cardData["name"] as string)
                                                  : dictionary().db[type()].selfName}
                                              </h1>
                                            </div>
                                          </div>
                                          <svg
                                            width="30"
                                            height="48"
                                            viewBox="0 0 30 48"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M16.1042 -6.07406e-07L30 24L16.1042 48L0.999998 48L1 -1.26763e-06L16.1042 -6.07406e-07Z"
                                              fill="rgb(var(--primary))"
                                            />
                                            <path
                                              d="M0.500063 3.49999L0.500061 44.5L13.7891 44.5L13.9337 44.249L25.4337 24.249L25.5772 24L25.4337 23.751L13.9337 3.75097L13.7891 3.49999L0.500063 3.49999Z"
                                              stroke="currentColor"
                                              stroke-opacity="0.55"
                                            />
                                            <path
                                              d="M11 6.99999L21 24L11 41L1.00003 41L1.00003 6.99999L11 6.99999Z"
                                              fill="currentColor"
                                            />
                                          </svg>
                                        </div>
                                        <div class="Content flex h-full w-full justify-center overflow-hidden">
                                          <div class="Left z-10 flex flex-none flex-col">
                                            <Decorate class="" />
                                            <div class="Divider bg-boundary-color ml-1 h-full w-[1px] flex-1 rounded-full"></div>
                                            <Decorate class="-scale-y-100" />
                                          </div>
                                          <div class="Center -mx-10 flex w-full flex-1 flex-col items-center">
                                            <div
                                              class="Divider bg-boundary-color mt-1 h-[1px] w-full rounded-full"
                                              style={{
                                                width: "calc(100% - 80px)",
                                              }}
                                            ></div>

                                            <OverlayScrollbarsComponent
                                              element="div"
                                              options={{ scrollbars: { autoHide: "scroll" } }}
                                              class="border-primary-color h-full w-full flex-1 rounded border-8"
                                            >
                                              <div class="Childern mx-3 my-6 flex flex-col gap-3">
                                                {DBDataConfig(dictionary())[type()]?.card.cardRender(
                                                  cardData,
                                                  setCardTypeAndIds,
                                                )}

                                                <section class="FunFieldGroup flex w-full flex-col gap-2">
                                                  <h3 class="text-accent-color flex items-center gap-2 font-bold">
                                                    {dictionary().ui.actions.operation}
                                                    <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
                                                  </h3>
                                                  <div class="FunGroup flex flex-col gap-3">
                                                    <Button
                                                      class="w-fit"
                                                      icon={<Icon.Line.Edit />}
                                                      onclick={() => {
                                                        const { type, id } = cardTypeAndIds()[index()];
                                                        setCardTypeAndIds((pre) => pre.slice(0, -1));
                                                        // setFormSheetIsOpen(true);
                                                      }}
                                                    />
                                                  </div>
                                                </section>
                                              </div>
                                            </OverlayScrollbarsComponent>
                                            <div
                                              class="Divider bg-boundary-color mb-1 h-[1px] w-full rounded-full"
                                              style={{
                                                width: "calc(100% - 80px)",
                                              }}
                                            ></div>
                                          </div>
                                          <div class="Right z-10 flex flex-none -scale-x-100 flex-col">
                                            <Decorate />
                                            <div class="Divider bg-boundary-color ml-1 h-full w-[1px] flex-1 rounded-full"></div>
                                            <Decorate class="-scale-y-100" />
                                          </div>
                                        </div>
                                      </>
                                    );
                                  }}
                                </Show>
                              </Motion.div>
                            </Show>
                          );
                        }}
                      </For>
                    </Motion.div>
                  </Show>
                </Presence>
              </Portal>

              <Portal>
                <Dialog
                  state={tableConfigSheetIsOpen()}
                  setState={setTableConfigSheetIsOpen}
                  title={dictionary().ui.wiki.tableConfig.title}
                >
                  <div class="flex h-52 w-2xs flex-col gap-3"></div>
                </Dialog>
              </Portal>

              <Portal>
                <Dialog
                  state={wikiSelectorIsOpen()}
                  setState={setWikiSelectorIsOpen}
                  title={dictionary().ui.wiki.selector.title}
                >
                  <div class="flex flex-col gap-3">
                    <For each={wikiSelectorConfig}>
                      {(group, index) => {
                        return (
                          <div class="Group flex flex-col gap-2">
                            <div class="GroupTitle flex flex-col gap-3">
                              <h3 class="text-accent-color flex items-center gap-2 font-bold">
                                {group.groupName}
                                <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
                              </h3>
                            </div>
                            <div class="GroupContent flex flex-wrap gap-2">
                              <For each={group.groupFields}>
                                {(field, index) => {
                                  return (
                                    <a
                                      href={`/wiki/${field.name}`}
                                      onClick={() => {
                                        setWikiSelectorIsOpen(false);
                                      }}
                                      class="border-dividing-color flex w-[calc(33.333333%-8px)] flex-col items-center gap-2 rounded border px-2 py-3"
                                    >
                                      {field.icon}
                                      <span class="text-nowrap overflow-ellipsis">
                                        {dictionary().db[field.name].selfName}
                                      </span>
                                    </a>
                                  );
                                }}
                              </For>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Dialog>
              </Portal>
            </Show>
          )}
        </Show>
      )}
    </Show>
  );
}
