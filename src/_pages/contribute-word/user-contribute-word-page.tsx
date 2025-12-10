"use client";

import React, { useState } from "react";
import { Tab } from "@heroui/react";
import { useTranslations } from "next-intl";
import type { Session } from "@/src/lib/auth";

import ContributeWordHeader from "./components/contribute-word-header";
import SimpleContributionForm from "./components/simple-contribution-form";
import DetailedContributionForm from "./components/detailed-contribution-form";
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
  const t = useTranslations("ContributeWord");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="container mx-auto py-8">
      <ContributeWordHeader />

      <div className="mt-8">
        <CustomTabs
          aria-label={t("contributionTabs")}
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
    </div>
  );
}
