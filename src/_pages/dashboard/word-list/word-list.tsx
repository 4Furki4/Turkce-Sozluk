"use client";
import React, { useCallback, useEffect } from "react";
import {
  useDisclosure,
  Button,
} from "@heroui/react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/react";
import { Edit3, MoreVertical, Plus, Trash2 } from "lucide-react";
import { api } from "@/src/trpc/react";
import { Link as NextUILink } from "@heroui/react";
import { usePathname, useSearchParams } from "next/navigation";
import NextLink from "next/link";
import WordListDeleteModal from "./word-list-delete-modal";
import { useTaskMenuLinks, TaskButton } from "@/src/components/task-pages/task-link";
import { keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useTranslations } from "next-intl";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomPagination } from '@/src/components/customs/heroui/custom-pagination'
import { CustomSelect, OptionsMap } from '@/src/components/customs/heroui/custom-select'
import { CustomInput } from '@/src/components/customs/heroui/custom-input'
import { getWordCanonicalPath } from "@/src/lib/seo-utils";


const wordPerPageOptions = [
  {
    label: "5",
    key: "5"
  },
  {
    label: "10",
    key: "10"
  },
  {
    label: "20",
    key: "20"
  },
  {
    label: "50",
    key: "50"
  }
]
export default function WordList() {
  const taskMenuLink = useTaskMenuLinks();
  const t = useTranslations();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onOpenChange: onDeleteModalChange } = useDisclosure();
  const [selectedWord, setSelectedWord] = React.useState<{
    wordId: number;
    name: string;
  }>({ wordId: 0, name: "" });

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawPage = Number(searchParams.get("page") ?? 1);
  const pageNumber = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawSize = Number(searchParams.get("per_page") ?? 10);
  const wordsPerPage = [5, 10, 20, 50].includes(rawSize) ? rawSize : 10;
  const urlSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = React.useState(urlSearch);
  useEffect(() => {
    if (urlSearch === (new URLSearchParams(window.location.search).get("search") ?? "")) setSearch(urlSearch);
  }, [urlSearch]);
  const updateQuery = useCallback((changes: Record<string, string | number>) => {
    const query = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) query.set(key, String(value));
    const next = `${pathname}?${query}`;
    if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, "", next + window.location.hash);
  }, [pathname]);
  const debouncedSearch = useDebounce(search, 500);

  const { data: wordCount } = api.word.getWordCount.useQuery({
    search: debouncedSearch
  })
  const totalPageNumber = wordCount == null ? undefined : Math.max(1, Math.ceil(wordCount / wordsPerPage));
  useEffect(() => {
    if (totalPageNumber != null && pageNumber > totalPageNumber) updateQuery({ page: totalPageNumber });
  }, [totalPageNumber, pageNumber, updateQuery]);
  const wordsQuery = api.word.getWords.useQuery({
    take: wordsPerPage,
    skip: (pageNumber - 1) * wordsPerPage,
    search: debouncedSearch
  }, {
    placeholderData: keepPreviousData
  })
  type Row = (typeof rows)[0];
  const rows = wordsQuery.data?.map((word, idx) => {
    return {
      id: word.word_id, // Added word_id for the new ID column
      name: word.name,
      key: word.word_id,
      meaning: word.meaning,
    };
  }) || []
  const columns = [
    {
      key: "id",
      label: t("Dashboard.Columns.Id"), // New ID column
    },
    {
      key: "name",
      label: t("Dashboard.Columns.Word"),
    },
    {
      key: "meaning",
      label: t("Dashboard.Columns.Meaning"),
    },
    {
      key: "actions",
      label: t("Dashboard.Columns.Actions"),
    },
  ];
  const renderCell = useCallback((item: Row, columnKey: React.Key) => {
    const cellValue = item[columnKey as keyof Row];
    switch (columnKey) {
      case "actions":
        return (
          <Dropdown>
            <DropdownTrigger key={cellValue} className="flex justify-around items-center">
              <Button isIconOnly variant="light" className="ml-auto h-11 min-w-11" aria-label={t("Dashboard.Columns.Actions")}>
                <MoreVertical aria-description="more action button" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              onAction={(key) => {
                if (key === "Delete") {
                  setSelectedWord({
                    wordId: item.key,
                    name: item.name,
                  });
                  onDeleteModalOpen();
                }

              }}
            >
              <DropdownSection title={t("Dashboard.Columns.Actions")}>
                <DropdownItem
                  key={"Delete"}
                  startContent={<Trash2 />}
                  color={"danger"}
                >
                  {t("Dashboard.Actions.Delete")}
                </DropdownItem>
                <DropdownItem
                  key="Edit"
                  textValue={t("Dashboard.Actions.Edit")}
                  startContent={<Edit3 />}
                  {...taskMenuLink({ pathname: "/dashboard/word-list/[wordId]/edit", params: { wordId: item.key } })}
                >
                  {t("Dashboard.Actions.Edit")}
                </DropdownItem>
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>
        );
      case "id":
        return (
          <span>{item.id}</span>
        );
      case "meaning":
        if (item.meaning) {
          return <span>{item.meaning}</span>;
        }
        return (
          <NextUILink target='_blank' as={NextLink} href={getWordCanonicalPath(item.name, "tr")}>
            {t("Dashboard.NavigationWordLink")}
          </NextUILink>
        );
      case "name":
        return (
          <NextUILink target='_blank' as={NextLink} href={getWordCanonicalPath(item.name, "tr")}>
            {cellValue}
          </NextUILink>
        );
      default:
        return cellValue;
    }
  }, [onDeleteModalOpen, t, setSelectedWord, taskMenuLink]);
  return (
    <section>
      <CustomTable
        columns={columns}
        items={rows}
        renderCell={renderCell}
        bottomContent={
          <CustomPagination
            total={totalPageNumber ?? 1} page={pageNumber} onChange={async (page) => {
              updateQuery({ page });
            }}
          />
        }
        topContent={
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <TaskButton href="/dashboard/create-word" className="w-fit shrink-0" startContent={<Plus className="h-4 w-4 shrink-0" />} color="primary" size="lg">
                {t("Dashboard.CreateWord")}
              </TaskButton>
              <CustomInput className="min-w-0 sm:flex-1" value={search} onValueChange={value => { setSearch(value); updateQuery({ search: value, page: 1 }); }} aria-label={t("SearchWord")} placeholder={t("SearchWord")} size="lg" />
              <CustomSelect
                className="min-w-0 sm:flex-1"
                options={wordPerPageOptions.reduce((acc, option) => {
                  acc[option.key] = option.label;
                  return acc;
                }, {} as OptionsMap)}
                label={t("WordList.wordsPerPage")}
                selectedKeys={[wordsPerPage.toString()]}
                onChange={(e) => updateQuery({ per_page: e.target.value, page: 1 })}
              />
            </div>
          </div>
        }
      />

      <WordListDeleteModal key={`word-delete-modal-${selectedWord.wordId}-${selectedWord.name}`} isOpen={isDeleteModalOpen} onOpen={onDeleteModalOpen} onOpenChange={onDeleteModalChange} wordId={selectedWord.wordId} name={selectedWord.name} take={wordsPerPage} skip={(pageNumber - 1) * wordsPerPage} />

    </section>
  );
}
