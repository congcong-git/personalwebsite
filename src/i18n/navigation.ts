import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// 封装带语言前缀的 Link / router / usePathname 等
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
