"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun, Monitor } from "lucide-react";

// 明暗主题切换按钮（客户端，避免 SSR 闪烁）
// 用 useSyncExternalStore 判断「是否已挂载」：服务端快照 false、客户端快照 true，
// 无需在 effect 里 setState，也不会触发额外的级联渲染。
// 三态循环：亮 → 暗 → 跟随系统
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const ORDER = ["light", "dark", "system"] as const;
const LABEL: Record<(typeof ORDER)[number], string> = {
  light: "切换到暗色",
  dark: "切换到跟随系统",
  system: "切换到亮色",
};

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) {
    return <span className="inline-block h-9 w-9" aria-hidden />;
  }

  const current = (theme as (typeof ORDER)[number]) ?? "dark";
  const isDark = resolvedTheme === "dark";
  const Icon = current === "system" ? Monitor : isDark ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={LABEL[current]}
      title={LABEL[current]}
      onClick={() => {
        const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
        setTheme(next);
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
