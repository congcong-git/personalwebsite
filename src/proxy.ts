import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // 跳过 api、_next、_vercel 以及带后缀的静态资源
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
