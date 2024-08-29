import { onMount, ParentProps } from "solid-js";
import { Motion } from "solid-motionone";
import Nav from "~/components/nav";
import { store } from "~/store";

export default function Home(props: ParentProps) {
  const PageWidth = 1536;
  const minPaddingX = 12;
  const scollbarWidth = 17;
  let contentRef: HTMLDivElement;

  function hasVerticalScrollBar(element: HTMLElement) {
    return element.scrollHeight > element.clientHeight;
  }

  const setPaddingX = () => {
    const contentWidth = PageWidth + 2 * minPaddingX;
    let paddingX = minPaddingX;
    const actualScollbarWidth = hasVerticalScrollBar(contentRef) ? scollbarWidth : 0;
    if (contentRef.offsetWidth > contentWidth) {
      paddingX = (contentRef.offsetWidth - actualScollbarWidth - PageWidth) / 2;
    }
    contentRef.style.paddingLeft = `${paddingX + 20}px`;
    contentRef.style.paddingRight = `${paddingX + 20}px`;
    console.log(`
      ------------
      版心宽度：${contentRef.offsetWidth}
      边距宽度：${paddingX}
      ------------
      `);
  };

  onMount(() => {
    setPaddingX();
    window.addEventListener("resize", setPaddingX);
    return () => {
      window.removeEventListener("resize", setPaddingX);
    };
  });

  return (
    <Motion.main class="flex h-dvh w-dvw flex-col-reverse lg:flex-row">
      <Nav />
      <Motion.div
        ref={contentRef!}
        animate={{ opacity: 1 }}
        transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
        class="Content flex w-full flex-col overflow-auto opacity-0 lg:h-dvh lg:py-5"
      >
        {props.children}
      </Motion.div>
    </Motion.main>
  );
}
