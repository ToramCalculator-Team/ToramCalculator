import { createMemo, Show } from "solid-js";
import spritesUrl from "~/../public/app-image/icon-sprites.png?url";
import sprites from "~/../public/app-image/sprites.json";

const spriteIconMap = {
	player_armor: "Armor",
	player_option: "Option",
	player_special: "Special",
	player_weapon: "Weapon",
	player_pet: "Pet",
	player_skill: "Skill",
};

export const getSpriteIcon = (props: { iconName: string; size?: number; outline?: boolean }) => {
	const sprite = createMemo(() =>{
		const iconName = props.iconName in spriteIconMap ? spriteIconMap[props.iconName as keyof typeof spriteIconMap] : props.iconName;
		return sprites.find((sprite) => sprite.name.toLowerCase() === (iconName ?? "").toLowerCase())
	});
	const actSize = createMemo(() => props.size ?? 24);

	return (
		<Show
			when={sprite()}
			fallback={
				<div
					class={`DefaultIcon rounded-full ${props.outline ? "outline-dividing-color bg-[radial-gradient(ellipse_50.00%_50.00%_at_50.00%_50.00%,#2F1A49_0%,rgba(47,26,73,0)_100%)] outline-1 outline-offset-1" : ""}`}
					style={{
						width: `${actSize()}px`,
						height: `${actSize()}px`,
					}}
				></div>
			}
		>
			{(sprite) => {
				return (
					<div
						class={`relative grid flex-none rounded-full ${props.outline ? "outline-dividing-color bg-[radial-gradient(ellipse_50.00%_50.00%_at_50.00%_50.00%,#2F1A49_0%,rgba(47,26,73,0)_100%)] outline-1 outline-offset-1" : ""}`}
						style={{
							width: `${actSize()}px`,
							height: `${actSize()}px`,
						}}
					>
						<img
							src={spritesUrl}
							style={{
								position: "absolute",
								top: "50%",
								left: "50%",
								transform: `translate(-50%, -50%) scale(${actSize() / sprite().width})`,
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
