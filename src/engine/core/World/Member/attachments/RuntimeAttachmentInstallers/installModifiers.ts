import type { RuntimeAttachment, RuntimeAttachmentMember } from "../RuntimeAttachment";
import { runtimeAttachmentModifierSource } from "../RuntimeAttachmentSource";

/** 将声明中的 modifier 写入 AttributeContainer；缺少 provenance 时由 attachment 来源补齐。 */
export function installModifiers<TAttrKey extends string>(
	member: RuntimeAttachmentMember<TAttrKey>,
	attachment: RuntimeAttachment<TAttrKey>,
): void {
	for (const modifier of attachment.modifiers ?? []) {
		const source = modifier.source ?? runtimeAttachmentModifierSource(member.id, attachment.source);
		member.attributeContainer.addModifier(modifier.attribute, modifier.modifierType, modifier.value, source);
	}
}

/** 按来源前缀移除静态和动态 modifier，保证重复安装不会叠加旧值。 */
export function uninstallModifiers(member: RuntimeAttachmentMember, sourceId: string): void {
	member.attributeContainer.removeModifiersBySourceKeyPrefix(sourceId);
}
