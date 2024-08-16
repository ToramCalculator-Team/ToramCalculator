import { type Prisma } from "@prisma/client";
import { ComboStepSchema } from "prisma/generated/zod";
import { type ZodType } from "zod";

export const ComboStepInclude = {
    include: {
    }
}

export type ComboStep = Prisma.ComboStepGetPayload<typeof ComboStepInclude>;
export const ComboStepInputSchema = ComboStepSchema.extend({}) satisfies ZodType<ComboStep>;