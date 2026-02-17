import { redirect } from "@/src/i18n/routing";
import SearchPageClient from "./_pages/search-page-client";

export default async function Page(
  props: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;

  // Handle query parameter based search (normal online flow)
  if (searchParams.word !== undefined) {
    const parsedWord = decodeURIComponent(searchParams.word as string);
    if (!parsedWord) {
      // redirect to home page if word param is empty
      redirect({
        href: "/",
        locale,
      });
    } else {
      redirect({
        href: {
          pathname: "/search/[word]",
          params: {
            word: parsedWord,
          },
        },
        locale,
      });
    }
  }

  // If no query parameter, render the client component that can handle offline routing
  // This handles the case where service worker serves this page for dynamic routes like /en/search/word
  return <SearchPageClient />;
}
