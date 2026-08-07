import { BrandIcons } from "./brandIcons";
import { FillIcons } from "./fillIcons";
import { GameIcons } from "./gameIcons";
import { OutlineIcons } from "./outlineIcons";
import { getSpriteIcon } from "./spriteIcons";

const Icons = {
	Outline: OutlineIcons,
	Filled: FillIcons,
	Brand: BrandIcons,
	Game: GameIcons,
	Spirits: getSpriteIcon,
};

export { Icons };
