type abi = {
  str: number;
  int: number;
  vit: number;
  agi: number;
  dex: number;
};
type abiName = keyof abi;
type petTypeName =
  | "天才"
  | "博而不精"
  | "物理攻击"
  | "物理防御"
  | "命中"
  | "回避"
  | "魔法攻击"
  | "魔法防御"
  | "强化技能"
  | "平凡";
const petTypeArray = {
  天才: {
    str: 80,
    int: 80,
    vit: 80,
    agi: 80,
    dex: 80,
  },
  博而不精: {
    str: 60,
    int: 60,
    vit: 60,
    agi: 60,
    dex: 60,
  },
  物理攻击: {
    str: 120,
    int: 10,
    vit: 40,
    agi: 80,
    dex: 50,
  },
  物理防御: {
    str: 60,
    int: 30,
    vit: 110,
    agi: 50,
    dex: 50,
  },
  命中: {
    str: 40,
    int: 40,
    vit: 40,
    agi: 60,
    dex: 120,
  },
  回避: {
    str: 40,
    int: 40,
    vit: 20,
    agi: 120,
    dex: 80,
  },
  魔法攻击: {
    str: 10,
    int: 120,
    vit: 40,
    agi: 60,
    dex: 70,
  },
  魔法防御: {
    str: 30,
    int: 70,
    vit: 80,
    agi: 50,
    dex: 70,
  },
  强化技能: {
    str: 50,
    int: 50,
    vit: 50,
    agi: 50,
    dex: 50,
  },
  平凡: {
    str: 40,
    int: 40,
    vit: 40,
    agi: 40,
    dex: 40,
  },
};

class Pet {
  generations: number;
  maxLv: number;
  potential: abi;
  type: string;
  character: number;
  wea: number;
  abi: abi;
  mainAbiName: abiName;

  constructor(
    generations: number,
    maxLv: number,
    potential: abi,
    type: string,
    mainAbiName: abiName,
    character: number,
  ) {
    this.generations = generations;
    this.maxLv = maxLv;
    this.potential = potential;
    this.type = type;
    this.character = character;
    this.wea = 255 * 2;
    this.abi = {
      str: 0,
      int: 0,
      vit: 0,
      agi: 0,
      dex: 0,
    };
    this.mainAbiName = mainAbiName;

    // 计算最终能力值
    for (const abiName in this.abi) {
      if (abiName === this.mainAbiName) {
        if (this.generations !== 0) {
          this.abi[abiName] = this.maxLv - 1;
        }
        for (let lv = 0; lv < this.maxLv; lv++) {
          if (this.abi[abiName] < 255) {
            this.abi[abiName] = this.abi[abiName] + 1 + this.potential[abiName] / 100;
          } else {
            this.abi[abiName] = this.abi[abiName] + this.potential[abiName] / 100;
          }
        }
      } else {
        for (let lv = 0; lv < this.maxLv; lv++) {
          this.abi[abiName as keyof abi] = this.abi[abiName as keyof abi] + this.potential[abiName as keyof abi] / 100;
        }
      }
    }
  }

  public matk = (): number => {
    return this.abi.int * 4 + this.abi.dex + this.wea + this.maxLv;
  };

  public maxHp = (): number => {
    return 93 + (this.abi.vit / 3 + 127 / 17) * this.maxLv;
  };

  public synthesisWith = (
    otherPet: Pet,
    {
      childType,
      childMainAbiName,
      childeCharacter,
    }: { childType: petTypeName; childMainAbiName: abiName; childeCharacter: number },
  ): Pet => {
    const childGeneration = this.generations + otherPet.generations + 1;
    const childMaxLv = 1 + (this.maxLv + otherPet.maxLv) / 2;
    const childPotential = { ...petTypeArray[childType] };
    for (const potentialName in otherPet.potential) {
      if (potentialName === childMainAbiName) {
        childPotential[potentialName] =
          petTypeArray[childType][potentialName] +
          195 +
          (this.potential[potentialName] + otherPet.potential[potentialName]) / 10;
      } else {
        childPotential[potentialName as keyof abi] =
          petTypeArray[childType][potentialName as keyof abi] +
          (this.potential[potentialName as keyof abi] + otherPet.potential[potentialName as keyof abi]) / 10;
      }
    }
    return new Pet(childGeneration, childMaxLv, childPotential, childType, childMainAbiName, childeCharacter);
  };

  public display = () => {
    return {
      类型: this.type,
      性格加成倍率: this.character,
      合成代数: this.generations,
      最大等级: Math.ceil(this.maxLv),
      教育时选择的能力: this.mainAbiName,
      最终潜力: {
        str: Math.ceil(this.potential.str),
        int: Math.ceil(this.potential.int),
        vit: Math.ceil(this.potential.vit),
        agi: Math.ceil(this.potential.agi),
        dex: Math.ceil(this.potential.dex),
      },
      满级时的能力值: {
        str: Math.ceil(this.abi.str),
        int: Math.ceil(this.abi.int),
        vit: Math.ceil(this.abi.vit),
        agi: Math.ceil(this.abi.agi),
        dex: Math.ceil(this.abi.dex),
      },
      武器为杖和魔导时的最终魔攻: Math.ceil(this.matk()),
      最大HP: Math.ceil(this.maxHp()),
    };
  };
}

export default function PetPage() {
  const sacrificialPet = new Pet(0, 250, { str: 88, int: 285, vit: 88, agi: 88, dex: 88 }, "天才", "int", 1);
  let mainPet = new Pet(0, 2, { str: 96, int: 285, vit: 96, agi: 96, dex: 96 }, "天才", "int", 1);
  const NumberOfSacrificialPets = 8;
  const childEducationMainAbi = "int";
  const childSubAbi = "";
  const completeDisplay = () => {
    for (let i = 0; i < NumberOfSacrificialPets; i++) {
      mainPet = mainPet.synthesisWith(sacrificialPet, {
        childType: "天才",
        childMainAbiName: childEducationMainAbi,
        childeCharacter: 1,
      });
      console.table(mainPet.display());
      return <p>{JSON.stringify(mainPet.display(), null, 2)}</p>;
    }
  };

  for (let i = 0; i < NumberOfSacrificialPets; i++) {
    mainPet = mainPet.synthesisWith(sacrificialPet, {
      childType: "天才",
      childMainAbiName: childEducationMainAbi,
      childeCharacter: 1,
    });
    console.table(mainPet.display());
  }

  return (
    <>
      <div class="Content flex flex-col gap-4 p-3">
        <div id="title">
          <div id="mianTitle">Pet</div>
          <div id="subTitle">宠物相关计算</div>
        </div>
        <div id="content">
          <div id="inputModule"></div>
          <pre class="outModule flex flex-col gap-4">{completeDisplay()}</pre>
        </div>
      </div>
    </>
  );
}
