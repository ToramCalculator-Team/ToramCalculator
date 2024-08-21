import { JSX, onMount } from "solid-js";

export default function Dialog(props: { children: JSX.Element; state: boolean; setState: (state: boolean) => void }) {
  const { children } = props;

  const handleClose = (): void => {
    props.setState(false);
  }

  onMount(() => {
    console.log("--DialogBox render");
    return () => {
      console.log("--DialogBox unmount");
    };
  });

  return (
    <div
      class={`DialogBox fixed left-0 top-0 z-50 flex h-dvh w-dvw bg-transition-color-8 backdrop-blur ${props.state ? "visible opacity-100" : "invisible opacity-0"}`}
    >
      <div class="DialogCloseBtn flex-1 cursor-pointer" onClick={handleClose}></div>
      <div
        class={`DialogContent flex max-h-[100dvh] min-h-[40dvh] max-w-[100dvw] flex-none flex-col items-center overflow-y-auto bg-primary-color shadow-2xl shadow-transition-color-20 ${props.state ? "lg:translate-x-0" : "lg:translate-x-10"}`}
      >
        {children}
      </div>
      {/* <div class="DialogCloseBtn flex-1 cursor-pointer" onClick={handleClose}></div> */}
    </div>
  );
}
