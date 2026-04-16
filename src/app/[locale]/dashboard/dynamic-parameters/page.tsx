import { Link } from "@/src/i18n/routing";

const parameterPages = [
  {
    title: "Word Attributes",
    href: "/dashboard/dynamic-parameters/word-attributes" as const,
    description: "Manage word attributes used in word creation"
  },
  {
    title: "Meaning Attributes",
    href: "/dashboard/dynamic-parameters/meaning-attributes" as const,
    description: "Manage meaning attributes used in meanings"
  },
  {
    title: "Authors",
    href: "/dashboard/dynamic-parameters/authors" as const,
    description: "Manage authors for word examples"
  },
  {
    title: "Part of Speech",
    href: "/dashboard/dynamic-parameters/part-of-speech" as const,
    description: "Manage parts of speech for word meanings"
  },
  {
    title: "Languages",
    href: "/dashboard/dynamic-parameters/languages" as const,
    description: "Manage languages for words and roots"
  },
  {
    title: "Roots",
    href: "/dashboard/dynamic-parameters/roots" as const,
    description: "Manage word roots"
  }
] as const;

export default function DynamicParameters() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {parameterPages.map((page) => (
        <div
          key={page.href}
          className="rounded-lg border border-border bg-background/40 p-4 transition-transform hover:scale-105"
        >
            <Link href={page.href} className="text-xl font-bold">
              {page.title}
            </Link>
            <p className="text-gray-600 mt-2">{page.description}</p>
        </div>
      ))}
    </div>
  );
}
