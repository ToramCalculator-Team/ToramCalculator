import { Selectable } from 'kysely'
import { combo_step } from '~/repositories/db/types'

export type ComboStep = Selectable<combo_step>
// default
export const defaultComboStep: ComboStep = {
    id: "",
    comboId: "",
    order: 0,
    comboType: "NULL",
    skillId: ""
}
