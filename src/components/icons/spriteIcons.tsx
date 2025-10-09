import { Show } from "solid-js";
import sprites from "~/../public/app-image/sprites.json";
import spritesUrl from "~/../public/app-image/icon-sprites.png?url";

export const getSpriteIcon = (props: {iconName: string, size?: number}) => {
  // if (iconName in defaultData) {
  //   const tableName = iconName as keyof DB;
  //   switch (tableName) {
  //     case "activity":
  //     case "address":
  //     case "armor":
  //     case "avatar":
  //     case "character":
  //     case "character_skill":
  //     case "combo":
  //     case "combo_step":
  //     case "consumable":
  //     case "crystal":
  //     case "drop_item":
  //     case "image":
  //     case "item":
  //     case "material":
  //     case "member":
  //     case "mercenary":
  //     case "mob":
  //     case "npc":
  //     case "option":
  //     case "player":
  //     case "player_armor":
  //     case "player_option":
  //     case "player_pet":
  //     case "player_special":
  //     case "player_weapon":
  //     case "post":
  //     case "recipe":
  //     case "recipe_ingredient":
  //     case "session":
  //     case "simulator":
  //     case "skill":
  //     case "skill_effect":
  //     case "special":
  //     case "statistic":
  //     case "task":
  //     case "task_collect_require":
  //     case "task_kill_requirement":
  //     case "task_reward":
  //     case "team":
  //     case "user":
  //     case "verification_token":
  //     case "weapon":
  //     case "world":
  //     case "zone":
  //     default:
  //       return <Icons.Outline.Gamepad />;
  //   }
  // }
  // 不区分大小写查找
  const backgroundImage = sprites.find((sprite) => sprite.name.toLowerCase() === props.iconName.toLowerCase());

  return (
    <Show when={backgroundImage} fallback={<div class={`DefaultIcon bg-area-color rounded-md`} style={{
      width:`${props.size}px`,
      height:`${props.size}px`
    }}></div>}>
      {(backgroundImage) => {
        // 获取图片收缩比例
        const scaleX = props.size ? props.size / backgroundImage().width : 1;
        const scaleY = props.size ? props.size / backgroundImage().height : 1;
        return (
          <div class="relative h-6 w-6 flex-none">
            <img
              src={spritesUrl}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${scaleX}, ${scaleY})`,
                width: `${backgroundImage().width}px`,
                height: `${backgroundImage().height}px`,
                "object-position": `${-backgroundImage().x}px ${-backgroundImage().y}px`,
                "object-fit": "none",
                "max-width": "none",
                "max-height": "none",
              }}
              alt={props.iconName}
            />
          </div>
        );
      }}
    </Show>
  );
};
