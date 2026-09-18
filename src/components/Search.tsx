"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Search as SearchIcon } from "lucide-react";
import { buildIndex, search, type SearchDoc, type IndexedDoc } from "@/lib/search";

// 站内搜索：下拉即时结果，键盘可达（Esc 关闭 / Enter 进首条）
export function Search({ docs }: { docs: SearchDoc[] }) {
  const t = useTranslations("Search");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const index = useMemo<IndexedDoc[]>(() => buildIndex(docs), [docs]);
  const results = useMemo(() => (q.trim() ? search(index, q) : []), [q, index]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-foreground/70 transition-colors hover:bg-black/5 dark:hover:bg-white/10">
        <SearchIcon className="h-4 w-4 shrink-0" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && results[0]) {
              setOpen(false);
              setQ("");
              router.push(results[0].doc.url);
            }
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="w-24 bg-transparent text-sm outline-none transition-all placeholder:text-muted focus:w-40"
        />
      </div>

      {open && q.trim() && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-auto rounded-xl border border-border bg-background p-1 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">{t("noResults")}</p>
          ) : (
            results.map((r) => (
              <Link
                key={r.doc.slug}
                href={r.doc.url}
                onClick={() => {
                  setOpen(false);
                  setQ("");
                }}
                className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                <p className="text-sm font-medium text-foreground">{r.doc.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{r.snippet}</p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
