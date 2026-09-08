import { isDarwin } from "./editorInterface";

import type { ValueOf } from "./utility-types";

export const CODES = {
  EQUAL: "Equal",
  MINUS: "Minus",
  NUM_ADD: "NumpadAdd",
  NUM_SUBTRACT: "NumpadSubtract",
  NUM_ZERO: "Numpad0",
  BRACKET_RIGHT: "BracketRight",
  BRACKET_LEFT: "BracketLeft",
  ONE: "Digit1",
  TWO: "Digit2",
  THREE: "Digit3",
  NINE: "Digit9",
  QUOTE: "Quote",
  ZERO: "Digit0",
  SLASH: "Slash",
  C: "KeyC",
  D: "KeyD",
  H: "KeyH",
  V: "KeyV",
  Z: "KeyZ",
  Y: "KeyY",
  R: "KeyR",
  S: "KeyS",
} as const;

export const KEYS = {
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  ARROW_UP: "ArrowUp",
  PAGE_UP: "PageUp",
  PAGE_DOWN: "PageDown",
  BACKSPACE: "Backspace",
  ALT: "Alt",
  CTRL_OR_CMD: isDarwin ? "metaKey" : "ctrlKey",
  DELETE: "Delete",
  ENTER: "Enter",
  ESCAPE: "Escape",
  QUESTION_MARK: "?",
  SPACE: " ",
  TAB: "Tab",
  CHEVRON_LEFT: "<",
  CHEVRON_RIGHT: ">",
  PERIOD: ".",
  COMMA: ",",
  SUBTRACT: "-",
  SLASH: "/",

  A: "a",
  B: "b",
  C: "c",
  D: "d",
  E: "e",
  F: "f",
  G: "g",
  H: "h",
  I: "i",
  L: "l",
  O: "o",
  P: "p",
  Q: "q",
  R: "r",
  S: "s",
  T: "t",
  V: "v",
  X: "x",
  Y: "y",
  Z: "z",
  K: "k",
  W: "w",

  0: "0",
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
} as const;

export type Key = keyof typeof KEYS;

// 定义 keyCode 映射表:在非拉丁键盘布局上,当 key 匹配失败时回退用 code 匹配对应的按键
export const KeyCodeMap = new Map<ValueOf<typeof KEYS>, ValueOf<typeof CODES>>([
  [KEYS.Z, CODES.Z],
  [KEYS.Y, CODES.Y],
]);

export const isLatinChar = (key: string) => /^[a-z]$/.test(key.toLowerCase());

/**
 * 用于匹配任意键盘布局下的按键事件,尤其是 Windows 和 Linux:
 * 在这些平台上,非拉丁字符加修饰键(CMD)时不会自动替换成对应的拉丁字符。
 *
 * 当 `event.key` 是拉丁字符时直接使用它,否则回退到 `event.code`(如果存在映射)。
 *
 * 例子:在不同布局下按下 "z",方括号 [] 标出最终选用的 key 或 code:
 *
 * 布局                  | Code  | Key | 说明
 * --------------------- | ----- | --- | -------
 * U.S.(美式)           |  KeyZ  | [z] |
 * Czech(捷克)          |  KeyY  | [z] |
 * Turkish(土耳其)      |  KeyN  | [z] |
 * French(法语)         |  KeyW  | [z] |
 * Macedonian(马其顿)   | [KeyZ] |  з  | z + cmd;з 是西里尔字母中对应 z 的字符
 * Russian(俄语)        | [KeyZ] |  я  | z + cmd
 * Serbian(塞尔维亚)    | [KeyZ] |  ѕ  | z + cmd
 * Greek(希腊)          | [KeyZ] |  ζ  | z + cmd;ζ 是希腊字母中对应 z 的字符
 * Hebrew(希伯来)       | [KeyZ] |  ז  | z + cmd;ז 是希伯来字母中对应 z 的字符
 * Pinyin - Simplified(拼音-简体) |  KeyZ  | [z] | 因输入法(IME)介入
 * Cangjie - Traditional(仓颉-繁体) | [KeyZ] |  重 | z + cmd
 * Japanese(日语)       | [KeyZ] |  つ | z + cmd
 * 2-Set Korean(韩语双式)| [KeyZ] |  ㅋ | z + cmd
 *
 * 更多细节见 https://github.com/excalidraw/excalidraw/pull/5944
 */
export const matchKey = (
  event: KeyboardEvent | React.KeyboardEvent<Element>,
  key: ValueOf<typeof KEYS>,
): boolean => {
  // 拉丁布局直接比较 key
  if (key === event.key.toLowerCase()) {
    return true;
  }

  // 非拉丁布局回退用 code 匹配
  const code = KeyCodeMap.get(key);
  return Boolean(code && !isLatinChar(event.key) && event.code === code);
};

export const isArrowKey = (key: string) =>
  key === KEYS.ARROW_LEFT ||
  key === KEYS.ARROW_RIGHT ||
  key === KEYS.ARROW_DOWN ||
  key === KEYS.ARROW_UP;

export const shouldResizeFromCenter = (event: MouseEvent | KeyboardEvent) =>
  event.altKey;

export const shouldMaintainAspectRatio = (event: MouseEvent | KeyboardEvent) =>
  event.shiftKey;

export const shouldRotateWithDiscreteAngle = (
  event: MouseEvent | KeyboardEvent | React.PointerEvent<HTMLCanvasElement>,
) => event.shiftKey;
