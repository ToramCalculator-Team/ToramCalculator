export const stringArrayCellRenderer = (data: string[]) => (
	<div class="flex flex-wrap gap-2">
		{data.map((item) => (
			<span class="text-sm text-nowrap">{item}</span>
		))}
	</div>
);
