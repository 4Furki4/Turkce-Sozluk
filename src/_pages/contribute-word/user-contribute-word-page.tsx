"use client";

import React, { useState } from "react";
import { Tab } from "@heroui/react";
import { useTranslations } from "next-intl";
import type { Session } from "@/src/lib/auth";

import SimpleContributionForm from "./components/simple-contribution-form";
import DetailedContributionForm from "./components/detailed-contribution-form";
import {
  TaskPage,
  useTaskActions,
} from "@/src/components/task-pages/task-page";
import { useSearchParams, usePathname } from "next/navigation";
import { CustomTabs } from "@/src/components/customs/heroui/custom-tabs";

export interface UserContributeWordPageProps {
  session: Session | null;
  locale: "en" | "tr";
  prefillWord?: string;
}

export default function UserContributeWordPage({
  session,
  locale,
  prefillWord,
}: UserContributeWordPageProps) {
  const search = useSearchParams();
  const mode = search.get("mode") === "simple" ? "simple" : "detailed";
  const t = useTranslations("ContributeWord");

  return (
    <TaskPage
      key={mode}
      title={t("title")}
      parent="/search"
      parentLabel={t("wordName")}
      media
    >
      <ContributionTabs
        session={session}
        locale={locale}
        prefillWord={prefillWord}
        mode={mode}
      />
    </TaskPage>
  );
}

function ContributionTabs({
  session,
  locale,
  prefillWord,
  mode,
}: UserContributeWordPageProps & { mode: string }) {
  const search = useSearchParams();
  const pathname = usePathname();
  const { navigateTo } = useTaskActions();
  const t = useTranslations("ContributeWord");
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <div className="mt-8">
      <CustomTabs
        aria-label={t("contributionTabs")}
        selectedKey={mode}
        onSelectionChange={(key) => {
          const query = new URLSearchParams(search);
          query.set("mode", String(key));
          navigateTo(`${pathname}?${query}`);
        }}
        color="primary"
        variant="bordered"
      >
        <Tab
          key="detailed"
          title={
            <div className="flex items-center space-x-2">
              <span>{t("detailedTab")}</span>
            </div>
          }
        >
          <div className="mt-6">
            <DetailedContributionForm
              session={session}
              locale={locale}
              prefillWord={prefillWord}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
            />
          </div>
        </Tab>
        <Tab
          key="simple"
          title={
            <div className="flex items-center space-x-2">
              <span>{t("simpleTab")}</span>
            </div>
          }
        >
          <div className="mt-6">
            <SimpleContributionForm
              session={session}
              locale={locale}
              prefillWord={prefillWord}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
            />
          </div>
        </Tab>
      </CustomTabs>
    </div>
  );
}
