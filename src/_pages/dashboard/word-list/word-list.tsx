"use client";
import React, { useCallback, useEffect, useRef } from "react";
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
import { useProgressRouter as useRouter } from "@/src/hooks/use-progress-router";
import { Link } from "@/src/i18n/routing";
import WordListDeleteModal from "./word-list-delete-modal";
import EditWordModal from "./edit-modal/edit-word-modal";
import { keepPreviousData } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useDebounce } from "@uidotdev/usehooks";
import { Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomPagination } from '@/src/components/customs/heroui/custom-pagination'
import { CustomSelect, OptionsMap } from '@/src/components/customs/heroui/custom-select'
import { CustomInput } from '@/src/components/customs/heroui/custom-input'


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
  const t = useTranslations();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onOpenChange: onDeleteModalChange } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onOpenChange: onEditModalChange } = useDisclosure();
  const [selectedWord, setSelectedWord] = React.useState<{
    wordId: number;
    name: string;
  }>({ wordId: 0, name: "" });

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial values from URL params
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialPerPage = Number(searchParams.get('per_page')) || 10;
  const initialSearch = searchParams.get('search') || "";

  const [pageNumber, setPageNumber] = React.useState<number>(initialPage);
  const [wordsPerPage, setWordsPerPage] = React.useState<number>(initialPerPage);

  const { control, watch, setValue } = useForm({
    defaultValues: {
      search: initialSearch
    }
  });

  // Update URL when parameters change
  const debouncedSearch = useDebounce(watch("search"), 500);
  const isFirstRender = useRef(true);

  // reset to first page when search changes
  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch]);

  // update state on URL param changes (back/forward)
  useEffect(() => {
    if (isFirstRender.current) return;
    const paramPage = Number(searchParams.get('page')) || 1;
    const paramPer = Number(searchParams.get('per_page')) || 10;
    const paramSearch = searchParams.get('search') || '';
    setPageNumber(paramPage);
    setWordsPerPage(paramPer);
    setValue('search', paramSearch, { shouldDirty: false });
  }, [searchParams, setValue]);

  // sync state to URL, enable back/forward history
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    params.set('page', pageNumber.toString());
    params.set('per_page', wordsPerPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  }, [pageNumber, wordsPerPage, debouncedSearch, pathname, router]);


  const { data: wordCount } = api.word.getWordCount.useQuery({
    search: debouncedSearch
  })
  const { data: languages } = api.params.getLanguages.useQuery()
  const { data: partOfSpeechRaw } = api.params.getPartOfSpeeches.useQuery()
  const partOfSpeeches = partOfSpeechRaw?.map(pos => ({
    ...pos,
    id: pos.id.toString()
  })) ?? []
  const totalPageNumber = wordCount ? Math.ceil(wordCount / wordsPerPage) : undefined;
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
              <button className="ml-auto">
                <MoreVertical aria-description="more action button" />
              </button>
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
                if (key === "Edit") {
                  setSelectedWord({
                    wordId: item.key,
                    name: item.name,
                  });
                  onEditModalOpen();
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
                <DropdownItem key={'Edit'} startContent={<Edit3 />} color={"warning"}>
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
          <NextUILink target='_blank' as={Link} href={`/arama/${item.name}`}>
            {t("Dashboard.NavigationWordLink")}
          </NextUILink>
        );
      case "name":
        return (
          <NextUILink target='_blank' as={Link} href={`/arama/${item.name}`}>
            {cellValue}
          </NextUILink>
        );
      default:
        return cellValue;
    }
  }, [onDeleteModalOpen, onEditModalOpen, t, setSelectedWord]);
  return (
    <section>
      <CustomTable
        columns={columns}
        items={rows}
        renderCell={renderCell}
        bottomContent={
          <CustomPagination
            total={totalPageNumber ?? 1} initialPage={pageNumber} onChange={async (page) => {
              setPageNumber(page);
            }}
          />
        }
        topContent={
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <NextUILink as={Link} href={"/dashboard/create-word"} className="w-fit">
                <Button
                  startContent={<Plus className="w-4 h-4" />}
                  color="primary"
                  size="lg"
                >
                  {t("Dashboard.CreateWord")}
                </Button>
              </NextUILink>
              <Controller name="search" control={control} render={({ field }) => (
                <CustomInput {...field} placeholder={t("SearchWord")} size="lg" />
              )}
              />
              <CustomSelect
                options={wordPerPageOptions.reduce((acc, option) => {
                  acc[option.key] = option.label;
                  return acc;
                }, {} as OptionsMap)}
                label={t("WordList.wordsPerPage")}
                selectedKeys={[wordsPerPage.toString()]}
                onChange={(e) => setWordsPerPage(Number(e.target.value))}
              />
            </div>
          </div>
        }
      />

      <WordListDeleteModal key={`word-delete-modal-${selectedWord.wordId}-${selectedWord.name}`} isOpen={isDeleteModalOpen} onOpen={onDeleteModalOpen} onOpenChange={onDeleteModalChange} wordId={selectedWord.wordId} name={selectedWord.name} take={wordsPerPage} skip={(pageNumber - 1) * wordsPerPage} />
      <EditWordModal partOfSpeeches={partOfSpeeches ?? []} languages={languages ?? []} key={`word-edit-modal-${selectedWord.wordId}-${selectedWord.name}`} isOpen={isEditModalOpen} onOpen={onEditModalOpen} onOpenChange={onEditModalChange} wordName={selectedWord.name} wordsPerPage={wordsPerPage} skip={(pageNumber - 1) * wordsPerPage} />
    </section>
  );
}
