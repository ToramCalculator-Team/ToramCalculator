import { CommonActionPool } from "./CommonActions";
import { CommonConditionPool } from "./CommonCondition";
import { CommonContext } from "./CommonContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "./uitls";

/**
 * 行为树公共黑板上的 callables（actions + conditions）。
 * 与 CommonContext 独立：在构建各成员的 runtimeContext 时，将 CommonContext 与此处导出的
 * commonActions、commonConditions 合并，作为行为树查询黑板时的完整内容。
 */
export const commonActions = actionPoolToInvokers(CommonContext, CommonActionPool);
export const commonConditions = conditionPoolToInvokers(CommonContext, CommonConditionPool);

/** 行为树公共黑板内容类型：CommonContext + 公共 actions/conditions */
export type CommonBoard = CommonContext & typeof commonActions & typeof commonConditions;
