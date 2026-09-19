// Markdown 渲染（服务端组件）：GFM + 代码高亮（rehype-highlight / highlight.js）
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children, ...props }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                {...props}
              >
                {children}
              </a>
            );
          },
          // 跳过空 src，避免 <img src=""> 触发浏览器整页重下告警
          img: ({ node, src, alt, ...props }) => {
            if (!src || typeof src !== "string" || src.trim() === "") return null;
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src} alt={alt ?? ""} {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
