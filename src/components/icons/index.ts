import { OutlineIcons } from "./outlineIcons";
import { FillIcons } from "./fillIcons";
import { BrandIcons } from "./brandIcons";
import { GameIcons } from "./gameIcons";
import { getSpriteIcon } from "./spriteIcons";

const Icons = {
  Outline: OutlineIcons,
  Filled: FillIcons,
  Brand: BrandIcons,
  Game: GameIcons,
  Spirits: getSpriteIcon,
};

export { Icons };