"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";
interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Resolved;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = "theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}
function resolveTheme(t: Theme): Resolved {
  if (t === "system") return systemDark() ? "dark" : "light";
  return t;
}
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
}
function getInitialResolved(): Resolved {
  return resolveTheme(getInitialTheme());
}

// 轻量主题 Provider（取代 next-themes）：
// - 不注入任何 <script>，避免 React 19 在客户端渲染 script 时报
//   "Encountered a script tag while rendering React component" 告警 / 水合异常
// - 防闪烁由 layout <head> 中的原生 <script> 完成（React 19 可提升，不告警）
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolved] = useState<Resolved>(getInitialResolved);

  const applyTheme = useCallback((t: Theme) => {
    setThemeState(t);
    const r = resolveTheme(t);
    setResolved(r);
    document.documentElement.classList.toggle("dark", r === "dark");
    if (t === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, t);
  }, []);

  // 同步 DOM class（DOM 副作用，放在 effect 中而非渲染期；state 已在初始化时从 localStorage 读取）
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  // 跟随系统时，系统配色变化要同步 resolvedTheme
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const cur = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
      if (cur === "system") setResolved(systemDark() ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: "dark", resolvedTheme: "dark", setTheme: () => {} };
  return ctx;
}
