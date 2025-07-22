import { Column } from "@tanstack/solid-table";
import { JSX } from "solid-js";

// 获取表头样式
export const getCommonPinningStyles = <T>(column: Column<T>): JSX.CSSProperties => {
  const isPinned = column.getIsPinned();
  const isLastLeft = isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRight = isPinned === "right" && column.getIsFirstColumn("right");
  const styles: JSX.CSSProperties = {
    position: isPinned ? "sticky" : "relative",
    width: column.getSize().toString(),
    "z-index": isPinned ? 1 : 0,
  };
  if (isPinned) {
    styles.left = isLastLeft ? `${column.getStart("left")}px` : undefined;
    styles.right = isFirstRight ? `${column.getAfter("right")}px` : undefined;
    styles["border-width"] = isLastLeft ? "0px 2px 0px 0px" : isFirstRight ? "0px 0px 0px 2px" : undefined;
  }
  return styles;
};
