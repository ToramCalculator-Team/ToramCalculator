import { MemberWithRelations } from "~/repositories/member";

export interface MemberState extends MemberWithRelations {
    isDead: boolean;
    isActive: boolean;
    statusEffects: string[];
    extraData: Record<string, any>;
}