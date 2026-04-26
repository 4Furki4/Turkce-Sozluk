"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/src/lib/utils";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
}) => {
  // Define the components with proper typing
  const components: Components = {
    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
    p: ({ node, ...props }) => <p className="my-3" {...props} />,
    a: ({ node, ...props }) => (
      <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
    ),
    ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-3" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-3" {...props} />,
    li: ({ node, ...props }) => <li className="my-1" {...props} />,
    blockquote: ({ node, ...props }) => (
      <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic my-4" {...props} />
    ),
    // Use a more specific type for the code component
    code: ({ node, inline, className, children, ...props }: {
      node?: any;
      inline?: boolean;
      className?: string;
      children?: React.ReactNode;
      [key: string]: any;
    }) => {
      return inline ? (
        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
          {children ? String(children) : ''}
        </code>
      ) : (
        <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-x-auto my-4" {...props}>
          {children ? String(children) : ''}
        </code>
      );
    },
    pre: ({ node, ...props }) => <pre className="bg-transparent p-0" {...props} />,
    hr: ({ node, ...props }) => <hr className="my-6 border-gray-300 dark:border-gray-700" {...props} />,
    img: ({ node, alt, ...props }) => (
      <img alt={alt} className="rounded-md max-w-full my-4" {...props} />
    ),
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,
    tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200 dark:divide-gray-800" {...props} />,
    tr: ({ node, ...props }) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-800" {...props} />,
    th: ({ node, ...props }) => (
      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400" {...props} />
    ),
  };

  return (
    <div className={cn("prose prose-slate dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
