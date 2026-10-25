"use client";

import DynamicParameterTable from "@/src/components/dynamic-parameter-table";
import { useListState } from "@/src/hooks/use-list-state";
import { api } from "@/src/trpc/react";

export default function PartOfSpeechPage() {
  const [list, setList] = useListState({ page: 1, size: 10, search: "" });
  const page = list.page; const search = list.search; const itemsPerPage = list.size;
  const setPage = (page: number) => setList(old => ({ ...old, page }));
  const setSearch = (search: string) => setList(old => ({ ...old, page: 1, search }));
  const setItemsPerPage = (size: number) => setList(old => ({ ...old, page: 1, size }));
  const skip = (page - 1) * itemsPerPage;
  const { data, refetch, isLoading } = api.admin.dynamicParameters.getPartOfSpeeches.useQuery({
    take: itemsPerPage,
    skip,
    search
  });

  const deleteMutation = api.admin.dynamicParameters.deletePartOfSpeech.useMutation({
    onSuccess: () => refetch()
  });

  const columns = [
    { key: "id", label: "ID" },
    { key: "partOfSpeech", label: "Part of Speech" },
    { key: "actions", label: "Actions" }
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Parts of Speech</h1>
      <DynamicParameterTable
        columns={columns}
        data={data?.items || []}
        totalCount={data?.total || 1}
        setPageNumber={setPage}
        setItemsPerPage={setItemsPerPage}
        search={search}
        onSearch={setSearch}
        taskType="part-of-speech"
        onDelete={(item) => deleteMutation.mutate({ id: item.id })}
        isLoading={isLoading}
        itemsPerPage={itemsPerPage}
        pageNumber={page}
      />

    </div>
  );
}
