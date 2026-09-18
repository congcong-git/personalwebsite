"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

// next-themes 包装：技术风第一眼为深色，用 class 策略切换，并支持跟随系统
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
