// Renders assistant markdown with dark-theme-tuned typography for the Advisor.
import ReactMarkdown from "react-markdown";

export function AdvisorMarkdown({ content }: { content: string }) {
  return (
    <div className="text-[13px] leading-relaxed text-zinc-100 space-y-2.5">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-1 marker:text-[#D29A43]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 marker:text-[#D29A43]">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-bold text-white">{children}</strong>
          ),
          h1: ({ children }) => (
            <h3 className="text-sm font-bold text-white mt-1">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="text-sm font-bold text-white mt-1">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-[13px] font-bold text-white mt-1">{children}</h4>
          ),
          code: ({ children }) => (
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-[12px] font-mono text-[#E9C07B]">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-[#E9C07B] underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
