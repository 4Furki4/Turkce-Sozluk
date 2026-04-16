"use client";
import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Textarea,
  DatePicker,
} from "@heroui/react";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import { useProgressRouter as useRouter } from "@/src/hooks/use-progress-router";
import { MarkdownRenderer } from "@/src/components/markdown-renderer";
import { CalendarDate } from "@internationalized/date";
// Schema for form validation
const announcementFormSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  status: z.enum(["draft", "published", "archived"]),
  imageUrl: z.string().url().optional().nullable(),
  actionUrl: z.string().url().optional().nullable(),
  actionTextKey: z.string().optional().nullable(),
  publishedAt: z.instanceof(CalendarDate).optional().nullable(),
  translations: z.object({
    en: z.object({
      title: z.string().min(1, "Title is required"),
      content: z.string().optional().nullable(),
      excerpt: z.string().optional().nullable(),
    }),
    tr: z.object({
      title: z.string().min(1, "Title is required"),
      content: z.string().optional().nullable(),
      excerpt: z.string().optional().nullable(),
    }),
  }),
});

type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

interface AnnouncementFormProps {
  initialData?: {
    id: number;
    slug: string;
    status: string;
    imageUrl: string | null;
    actionUrl: string | null;
    actionTextKey: string | null;
    publishedAt: { year: number; month: number; day: number } | null;
    translations: {
      en: {
        title: string;
        content: string | null;
        excerpt: string | null;
      } | null;
      tr: {
        title: string;
        content: string | null;
        excerpt: string | null;
      } | null;
    };
  };
}

export default function AnnouncementForm({ initialData }: AnnouncementFormProps) {
  const t = useTranslations("Dashboard.Announcements");
  const router = useRouter();
  const [previewTab, setPreviewTab] = React.useState<"en" | "tr">("en");
  // Default values for the form
  const defaultValues: AnnouncementFormValues = {
    slug: initialData?.slug || "",
    status: (initialData?.status as "draft" | "published" | "archived") || "draft",
    imageUrl: initialData?.imageUrl || null,
    actionUrl: initialData?.actionUrl || null,
    actionTextKey: initialData?.actionTextKey || null,
    publishedAt: initialData?.publishedAt
      ? new CalendarDate(initialData.publishedAt.year, initialData.publishedAt.month, initialData.publishedAt.day)
      : null,
    translations: {
      en: {
        title: initialData?.translations?.en?.title || "",
        content: initialData?.translations?.en?.content || null,
        excerpt: initialData?.translations?.en?.excerpt || null,
      },
      tr: {
        title: initialData?.translations?.tr?.title || "",
        content: initialData?.translations?.tr?.content || null,
        excerpt: initialData?.translations?.tr?.excerpt || null,
      },
    },
  };

  // Initialize form
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues,
  });

  // Watch content for preview
  const enContent = watch("translations.en.content");
  const trContent = watch("translations.tr.content");

  // Create mutation
  const { mutate: createAnnouncement } = api.admin.announcements.createAnnouncement.useMutation({
    onSuccess: () => {
      toast.success(t("createSuccess"));
      router.push("/dashboard/announcements");
    },
    onError: (error) => {
      toast.error(t("createError", { error: t(error.message) }));
    },
  });

  // Update mutation
  const { mutate: updateAnnouncement } = api.admin.announcements.updateAnnouncement.useMutation({
    onSuccess: () => {
      toast.success(t("updateSuccess"));
      router.push("/dashboard/announcements");
    },
    onError: (error) => {
      toast.error(t("updateError", { error: error.message }));
    },
  });

  // Form submission handler
  const onSubmit = (data: AnnouncementFormValues) => {
    // Create a copy of the data to avoid modifying the original
    const submissionData = { ...data };

    // Ensure translations object is properly structured
    if (!submissionData.translations) {
      submissionData.translations = {
        en: { title: "", content: null, excerpt: null },
        tr: { title: "", content: null, excerpt: null }
      };
    }

    // Ensure English translation is properly handled
    if (!submissionData.translations.en) {
      submissionData.translations.en = { title: "", content: null, excerpt: null };
    } else {
      submissionData.translations.en = {
        ...submissionData.translations.en,
        title: submissionData.translations.en.title || "",
        content: submissionData.translations.en.content === null ? null : submissionData.translations.en.content,
        excerpt: submissionData.translations.en.excerpt === null ? null : submissionData.translations.en.excerpt
      };
    }

    // Ensure Turkish translation is properly handled
    if (!submissionData.translations.tr) {
      submissionData.translations.tr = { title: "", content: null, excerpt: null };
    } else {
      submissionData.translations.tr = {
        ...submissionData.translations.tr,
        title: submissionData.translations.tr.title || "",
        content: submissionData.translations.tr.content === null ? null : submissionData.translations.tr.content,
        excerpt: submissionData.translations.tr.excerpt === null ? null : submissionData.translations.tr.excerpt
      };
    }

    // Handle publishedAt date conversion if needed
    if (submissionData.publishedAt && typeof submissionData.publishedAt === 'object' && 'toDate' in submissionData.publishedAt) {
      try {
        // If it's a DateValue with toDate method, convert it to a JavaScript Date
        const dateValue = submissionData.publishedAt as any;
        if (typeof dateValue.toDate === 'function') {
          submissionData.publishedAt = dateValue.toDate();
        }
      } catch (e) {
        console.error("Error converting date:", e);
        // Keep the original value if conversion fails
      }
    }

    // Log the data being sent (remove in production)
    console.log('Submitting announcement data:', JSON.stringify(submissionData, null, 2));

    if (initialData) {
      // Update existing announcement
      updateAnnouncement({
        id: initialData.id,
        ...submissionData,
      } as any);
      // Success and error handling is done in the mutation hooks
    } else {
      // Create new announcement
      createAnnouncement(submissionData as any);
      // Success and error handling is done in the mutation hooks
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">{t("generalInfo")}</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Controller
            name="slug"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label={t("form.slug")}
                placeholder={t("form.slugPlaceholder")}
                errorMessage={errors.slug?.message}
                isInvalid={!!errors.slug}
              />
            )}
          />

          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                label={t("form.status")}
                selectedKeys={[field.value]}
                onChange={(e) => field.onChange(e.target.value)}
                errorMessage={errors.status?.message}
                isInvalid={!!errors.status}
              >
                <SelectItem key="draft">
                  {t("statuses.draft")}
                </SelectItem>
                <SelectItem key="published">
                  {t("statuses.published")}
                </SelectItem>
                <SelectItem key="archived">
                  {t("statuses.archived")}
                </SelectItem>
              </Select>
            )}
          />

          <Controller
            name="imageUrl"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                label={t("form.imageUrl")}
                placeholder={t("form.imageUrlPlaceholder")}
                errorMessage={errors.imageUrl?.message}
                isInvalid={!!errors.imageUrl}
              />
            )}
          />

          <Controller
            name="actionUrl"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                label={t("form.actionUrl")}
                placeholder={t("form.actionUrlPlaceholder")}
                errorMessage={errors.actionUrl?.message}
                isInvalid={!!errors.actionUrl}
              />
            )}
          />

          <Controller
            name="actionTextKey"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                label={t("form.actionTextKey")}
                placeholder={t("form.actionTextKeyPlaceholder")}
                errorMessage={errors.actionTextKey?.message}
                isInvalid={!!errors.actionTextKey}
              />
            )}
          />

          <Controller
            name="publishedAt"
            control={control}
            render={({ field }) => (
              <DatePicker
                label={t("form.publishedAt")}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                }}
                errorMessage={errors.publishedAt?.message ? String(errors.publishedAt.message) : undefined}
                isInvalid={!!errors.publishedAt}
              />
            )}
          />
        </CardBody>
      </Card>

      <Tabs aria-label="Announcement Content Tabs">
        <Tab key="content" title={t("form.contentTab")}>
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">{t("form.englishContent")}</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <Controller
                name="translations.en.title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t("form.title")}
                    placeholder={t("form.titlePlaceholder")}
                    errorMessage={errors.translations?.en?.title?.message}
                    isInvalid={!!errors.translations?.en?.title}
                  />
                )}
              />

              <Controller
                name="translations.en.excerpt"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    label={t("form.excerpt")}
                    placeholder={t("form.excerptPlaceholder")}
                    errorMessage={errors.translations?.en?.excerpt?.message}
                    isInvalid={!!errors.translations?.en?.excerpt}
                  />
                )}
              />

              <Controller
                name="translations.en.content"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    label={t("form.content")}
                    placeholder={t("form.contentPlaceholder")}
                    errorMessage={errors.translations?.en?.content?.message}
                    isInvalid={!!errors.translations?.en?.content}
                    minRows={10}
                  />
                )}
              />
            </CardBody>

            <hr className="my-4 border-t border-gray-200" />

            <CardHeader>
              <h2 className="text-xl font-bold">{t("form.turkishContent")}</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <Controller
                name="translations.tr.title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t("form.title")}
                    placeholder={t("form.titlePlaceholder")}
                    errorMessage={errors.translations?.tr?.title?.message}
                    isInvalid={!!errors.translations?.tr?.title}
                  />
                )}
              />

              <Controller
                name="translations.tr.excerpt"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    label={t("form.excerpt")}
                    placeholder={t("form.excerptPlaceholder")}
                    errorMessage={errors.translations?.tr?.excerpt?.message}
                    isInvalid={!!errors.translations?.tr?.excerpt}
                  />
                )}
              />

              <Controller
                name="translations.tr.content"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    label={t("form.content")}
                    placeholder={t("form.contentPlaceholder")}
                    errorMessage={errors.translations?.tr?.content?.message}
                    isInvalid={!!errors.translations?.tr?.content}
                    minRows={10}
                  />
                )}
              />
            </CardBody>
          </Card>
        </Tab>

        <Tab key="preview" title={t("form.previewTab")}>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{t("form.preview")}</h2>
                <Tabs
                  aria-label="Preview Language"
                  selectedKey={previewTab}
                  onSelectionChange={(key) => setPreviewTab(key as "en" | "tr")}
                  size="sm"
                >
                  <Tab key="en" title={t("languages.en")} />
                  <Tab key="tr" title={t("languages.tr")} />
                </Tabs>
              </div>
            </CardHeader>
            <CardBody>
              {previewTab === "en" ? (
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold">{watch("translations.en.title") || t("form.noTitle")}</h1>
                  {watch("translations.en.excerpt") && (
                    <p className="text-gray-600 dark:text-gray-400 italic">{watch("translations.en.excerpt")}</p>
                  )}
                  {enContent ? (
                    <MarkdownRenderer content={enContent} />
                  ) : (
                    <p className="text-gray-500">{t("form.noContent")}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold">{watch("translations.tr.title") || t("form.noTitle")}</h1>
                  {watch("translations.tr.excerpt") && (
                    <p className="text-gray-600 dark:text-gray-400 italic">{watch("translations.tr.excerpt")}</p>
                  )}
                  {trContent ? (
                    <MarkdownRenderer content={trContent} />
                  ) : (
                    <p className="text-gray-500">{t("form.noContent")}</p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button
          variant="flat"
          onPress={() => router.push("/dashboard/announcements")}
          disabled={isSubmitting}
        >
          {t("cancel")}
        </Button>
        <Button
          color="primary"
          type="submit"
          isLoading={isSubmitting}
        >
          {initialData ? t("update") : t("create")}
        </Button>
      </div>
    </form>
  );
}
