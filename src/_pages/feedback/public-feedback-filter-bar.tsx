"use client";

import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import { X } from "lucide-react";
import { CustomInput } from "../../components/customs/heroui/custom-input";
import { CustomSelect, OptionsMap } from "../../components/customs/heroui/custom-select";
import { CustomMultiSelect } from "../../components/customs/heroui/custom-multi-select";
import { CustomDateRangePicker } from "../../components/customs/heroui/custom-date-range-picker";
import { feedbackTypeEnum, feedbackStatusEnum } from "@/db/schema/feedbacks";

export interface PublicFeedbackFilters {
  type: (typeof feedbackTypeEnum.enumValues[number])[];
  status: (typeof feedbackStatusEnum.enumValues[number])[];
  searchTerm: string;
  sortBy: "votes" | "createdAt";
  sortOrder: "asc" | "desc";
  startDate?: Date;
  endDate?: Date;
}

interface PublicFeedbackFilterBarProps {
  filters: PublicFeedbackFilters;
  onFiltersChange: (filters: PublicFeedbackFilters) => void;
  onClearFilters: () => void;
}

export function PublicFeedbackFilterBar({
  filters,
  onFiltersChange,
  onClearFilters,
}: PublicFeedbackFilterBarProps) {
  const tCommon = useTranslations("Common");
  const tFeedback = useTranslations("Feedback");
  const tDashboardFeedback = useTranslations("Dashboard.feedback");

  const typeOptions = feedbackTypeEnum.enumValues.map((type) => ({
    key: type,
    label: tDashboardFeedback(`types.${type}`),
  }));

  // For public page, show fewer status options (exclude admin-only statuses)
  const publicStatusOptions = feedbackStatusEnum.enumValues
    .filter(status => !["closed", "rejected", "duplicate", "fixed", "wont_implement"].includes(status))
    .map((status) => ({
      key: status,
      label: tDashboardFeedback(`statuses.${status}`),
    }));

  const sortOptions = [
    { key: "votes", label: tDashboardFeedback("sort.votes") },
    { key: "createdAt", label: tDashboardFeedback("sort.createdAt") },
  ];

  const sortOrderOptions = [
    { key: "desc", label: tCommon("desc") },
    { key: "asc", label: tCommon("asc") },
  ];

  const handleDateRangeChange = (startDate: Date | null, endDate: Date | null) => {
    onFiltersChange({
      ...filters,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const hasActiveFilters =
    filters.type.length > 0 ||
    filters.status.length > 0 ||
    filters.searchTerm.length > 0 ||
    filters.startDate ||
    filters.endDate ||
    filters.sortBy !== "votes" ||
    filters.sortOrder !== "desc";

  return (
    <div className="space-y-4 p-4 border border-border rounded-md bg-background/50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{tFeedback("title")}</h3>
        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onPress={onClearFilters}
            startContent={<X className="h-4 w-4" />}
          >
            {tDashboardFeedback("filter.clear")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="col-span-1 lg:col-span-2 grid lg:grid-cols-2 gap-4">
          <CustomInput
            placeholder={tDashboardFeedback("filter.searchPlaceholder")}
            value={filters.searchTerm}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, searchTerm: value })
            }
            isClearable
            classNames={{
              base: "w-full"
            }}
          />

          {/* Type Filter */}
          <CustomMultiSelect
            label={tDashboardFeedback("filter.typeLabel")}
            placeholder={tDashboardFeedback("filter.typePlaceholder")}
            selectedKeys={filters.type}
            onSelectionChange={(keys) =>
              onFiltersChange({
                ...filters,
                type: keys as (typeof feedbackTypeEnum.enumValues[number])[],
              })
            }
            options={typeOptions}
            classNames={{
              base: "w-full"
            }}
          />

          {/* Status Filter */}
          <CustomMultiSelect
            label={tDashboardFeedback("filter.statusLabel")}
            placeholder={tDashboardFeedback("filter.statusPlaceholder")}
            selectedKeys={filters.status}
            onSelectionChange={(keys) =>
              onFiltersChange({
                ...filters,
                status: keys as (typeof feedbackStatusEnum.enumValues[number])[],
              })
            }
            options={publicStatusOptions}
            classNames={{
              base: "w-full"
            }}
          />

          {/* Date Range Picker */}
          <CustomDateRangePicker
            label={tDashboardFeedback("filter.dateRangeLabel")}
            onDateRangeChange={handleDateRangeChange}
            value={filters.startDate && filters.endDate ? {
              start: filters.startDate,
              end: filters.endDate
            } : null}
            classNames={{
              base: "w-full"
            }}
          />
        </div>

        {/* Sort By */}
        <div className="grid grid-cols-2 md:grid-cols-1 md:grid-rows-2  gap-4">
          <CustomSelect
            label={tDashboardFeedback("filter.sortByLabel")}
            placeholder={tDashboardFeedback("filter.sortByPlaceholder")}
            selectedKeys={[filters.sortBy]}
            onSelectionChange={(keys) => {
              const sortBy = Array.from(keys)[0] as "votes" | "createdAt";
              onFiltersChange({ ...filters, sortBy });
            }}
            options={sortOptions.reduce((acc, option) => {
              acc[option.key] = option.label;
              return acc;
            }, {} as OptionsMap)}
            classNames={{
              base: "w-full"
            }}
          />

          {/* Sort Order */}
          <CustomSelect
            label={tDashboardFeedback("filter.sortOrderLabel")}
            placeholder={tDashboardFeedback("filter.sortOrderPlaceholder")}
            selectedKeys={[filters.sortOrder]}
            onSelectionChange={(keys) => {
              const sortOrder = Array.from(keys)[0] as "asc" | "desc";
              onFiltersChange({ ...filters, sortOrder });
            }}
            options={sortOrderOptions.reduce((acc, option) => {
              acc[option.key] = option.label;
              return acc;
            }, {} as OptionsMap)}
            classNames={{
              base: "w-full"
            }}
          />
        </div>
      </div>
    </div>
  );
}
