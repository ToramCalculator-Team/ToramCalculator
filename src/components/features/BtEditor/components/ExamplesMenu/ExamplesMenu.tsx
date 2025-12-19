import { Component, For, Show, createSignal } from 'solid-js';
import { Button, Menu, MenuList, MenuItem, Divider } from '../';
import { Example, ExampleCategory } from '../../types';
import { Examples } from '../../data/Examples';

export type ExamplesMenuProps = {
  /** MDSL 插入口：当用户选择 example 时，将对应的 MDSL 和 Agent 发送到此函数 */
  onMDSLInsert: (mdsl: string, agent: string) => void;
};

export const ExamplesMenu: Component<ExamplesMenuProps> = (props) => {
  const [anchorEl, setAnchorEl] = createSignal<HTMLElement | null>(null);
  const open = () => Boolean(anchorEl());

  const handleClick = (e: MouseEvent) => {
    setAnchorEl(e.currentTarget as HTMLElement);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const onExampleClick = (example: Example) => {
    setAnchorEl(null);
    
    // 将对应的 MDSL 和 Agent 发送到插入口
    props.onMDSLInsert(example.definition, example.board);
  };

  const getExampleListItemsForCategory = (category: ExampleCategory) => {
    return Examples.filter((example) => example.category === category);
  };

  return (
    <div class="ml-1.25">
      <Button
        variant="default"
        size="small"
        color="inherit"
        onClick={handleClick}
        class="p-1"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 18h18v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z" />
        </svg>
      </Button>
      <Menu anchorEl={anchorEl()} open={open()} onClose={handleClose}>
        <Show when={getExampleListItemsForCategory('advanced').length > 0}>
          <MenuList dense>
            <For each={getExampleListItemsForCategory('advanced')}>
              {(example) => (
                <MenuItem dense onClick={() => onExampleClick(example)}>
                  {example.caption}
                </MenuItem>
              )}
            </For>
          </MenuList>
        </Show>
        <Show when={getExampleListItemsForCategory('leaf').length > 0}>
          <>
            <Divider />
            <div class="px-1.25 py-0.5 text-xs text-accent-color/70">Leaves</div>
            <MenuList dense>
              <For each={getExampleListItemsForCategory('leaf')}>
                {(example) => (
                  <MenuItem dense onClick={() => onExampleClick(example)}>
                    {example.caption}
                  </MenuItem>
                )}
              </For>
            </MenuList>
          </>
        </Show>
        <Show when={getExampleListItemsForCategory('composite').length > 0}>
          <>
            <Divider />
            <div class="px-1.25 py-0.5 text-xs text-accent-color/70">Composites</div>
            <MenuList dense>
              <For each={getExampleListItemsForCategory('composite')}>
                {(example) => (
                  <MenuItem dense onClick={() => onExampleClick(example)}>
                    {example.caption}
                  </MenuItem>
                )}
              </For>
            </MenuList>
          </>
        </Show>
        <Show when={getExampleListItemsForCategory('decorator').length > 0}>
          <>
            <Divider />
            <div class="px-1.25 py-0.5 text-xs text-accent-color/70">Decorators</div>
            <MenuList dense>
              <For each={getExampleListItemsForCategory('decorator')}>
                {(example) => (
                  <MenuItem dense onClick={() => onExampleClick(example)}>
                    {example.caption}
                  </MenuItem>
                )}
              </For>
            </MenuList>
          </>
        </Show>
        <Show when={getExampleListItemsForCategory('misc').length > 0}>
          <>
            <Divider />
            <div class="px-1.25 py-0.5 text-xs text-accent-color/70">Misc</div>
            <MenuList dense>
              <For each={getExampleListItemsForCategory('misc')}>
                {(example) => (
                  <MenuItem dense onClick={() => onExampleClick(example)}>
                    {example.caption}
                  </MenuItem>
                )}
              </For>
            </MenuList>
          </>
        </Show>
      </Menu>
    </div>
  );
};

