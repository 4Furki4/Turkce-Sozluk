"use client";

import React, { useEffect } from "react";
import AnnouncementForm from "../../announcement-form";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { Spinner } from "@heroui/react";
import { useParams } from "next/navigation";
import { useProgressRouter as useRouter } from "@/src/hooks/use-progress-router";

export default function EditAnnouncementPage() {
  const t = useTranslations("Dashboard.Announcements");
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  
  const { data, isLoading, isError, error } = api.admin.announcements.getAnnouncementForEdit.useQuery(
    { id },
    {
      enabled: !isNaN(id),
    }
  );

  // Handle error with useEffect instead of onError callback
  useEffect(() => {
    if (isError) {
      router.push("/dashboard/announcements");
    }
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-10">
        <p className="text-danger">{t("announcementNotFound")}</p>
      </div>
    );
  }

  // Transform the Date object to the expected format
  const formattedData = {
    ...data,
    publishedAt: data.publishedAt
      ? {
          year: data.publishedAt.getFullYear(),
          month: data.publishedAt.getMonth() + 1, // JavaScript months are 0-indexed
          day: data.publishedAt.getDate(),
        }
      : null,
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {t("editAnnouncement", { slug: data.slug })}
        </h1>
        <p className="text-gray-500 mt-1">{t("editDescription")}</p>
      </div>
      
      <AnnouncementForm initialData={formattedData} />
    </div>
  );
}
