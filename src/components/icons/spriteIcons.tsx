import { Show } from "solid-js";
import sprites from "~/../public/app-image/sprites.json";
import spritesUrl from "~/../public/app-image/icon-sprites.png?url";

export const getSpriteIcon = (props: { iconName: string; size?: number; outline?: boolean }) => {
  // 不区分大小写查找精灵图
  const sprite = sprites.find((sprite) => sprite.name.toLowerCase() === props.iconName.toLowerCase());
  const actSize = props.size ?? 24;
  return (
    <Show
      when={sprite}
      fallback={
        <div
          class={`DefaultIcon rounded-full ${props.outline ? "outline-dividing-color bg-[radial-gradient(ellipse_50.00%_50.00%_at_50.00%_50.00%,_#2F1A49_0%,_rgba(47,_26,_73,_0)_100%)] outline-1 outline-offset-[-1px]" : ""}`}
          style={{
            width: `${actSize}px`,
            height: `${actSize}px`,
          }}
        ></div>
      }
    >
      {(sprite) => {
        return (
          <div
            class={`relative grid flex-none rounded-full ${props.outline ? "outline-dividing-color bg-[radial-gradient(ellipse_50.00%_50.00%_at_50.00%_50.00%,_#2F1A49_0%,_rgba(47,_26,_73,_0)_100%)] outline-1 outline-offset-[-1px]" : ""}`}
            style={{
              width: `${actSize}px`,
              height: `${actSize}px`,
            }}
          >
            <img
              src={spritesUrl}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${actSize / sprite().width})`,
                width: `${sprite().width}px`,
                height: `${sprite().height}px`,
                "object-position": `${-sprite().x}px ${-sprite().y}px`,
                "object-fit": "none",
                "max-width": "none",
                "max-height": "none",
              }}
              class="place-items-center"
              alt={props.iconName}
            />
          </div>
        );
      }}
    </Show>
  );
};
