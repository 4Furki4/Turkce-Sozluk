"use client";

import type { ReactNode } from "react";
import { Card, CardBody, Chip } from "@heroui/react";
import { format } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import {
  Activity,
  BarChart3,
  FileClock,
  MessageSquareWarning,
  Search,
  Users,
  WholeWord,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Link } from "@/src/i18n/routing";
import { api } from "@/src/trpc/react";

type MetricCardProps = {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
};

function MetricCard({ label, value, description, icon }: MetricCardProps) {
  const numberFormatter = new Intl.NumberFormat();

  return (
    <Card isBlurred className="bg-background/40">
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="rounded-md bg-primary/10 p-2 text-primary">{icon}</span>
        </div>
        <div>
          <p className="font-mono text-3xl font-semibold text-foreground">{numberFormatter.format(value)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export function DashboardOverview() {
  const locale = useLocale();
  const t = useTranslations("Dashboard.overview");
  const [data] = api.admin.overview.getDashboardOverview.useSuspenseQuery();
  const numberFormatter = new Intl.NumberFormat(locale);
  const dateLocale = locale === "tr" ? tr : enUS;

  const dailySearchData = data.searchAnalytics.dailySearches.map((item) => ({
    ...item,
    label: format(new Date(`${item.date}T00:00:00`), "d MMM", { locale: dateLocale }),
  }));

  const topSearchData = data.searchAnalytics.topSearchedWords.map((item) => ({
    ...item,
    label: item.wordName.length > 16 ? `${item.wordName.slice(0, 15)}...` : item.wordName,
  }));

  const actorSplit = data.searchAnalytics.actorSplit;
  const authenticatedPercent = actorSplit.total > 0
    ? Math.round((actorSplit.authenticated / actorSplit.total) * 100)
    : 0;
  const anonymousPercent = actorSplit.total > 0
    ? 100 - authenticatedPercent
    : 0;

  const metricCards = [
    {
      label: t("metrics.totalWords"),
      value: data.metrics.totalWords,
      description: t("metrics.totalWordsDescription"),
      icon: <WholeWord className="h-4 w-4" />,
    },
    {
      label: t("metrics.totalUsers"),
      value: data.metrics.totalUsers,
      description: t("metrics.totalUsersDescription"),
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: t("metrics.searchesToday"),
      value: data.metrics.searchesToday,
      description: t("metrics.searchesTodayDescription"),
      icon: <Search className="h-4 w-4" />,
    },
    {
      label: t("metrics.searchesLast7Days"),
      value: data.metrics.searchesLast7Days,
      description: t("metrics.searchesLast7DaysDescription"),
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: t("metrics.pendingRequests"),
      value: data.metrics.pendingRequests,
      description: t("metrics.pendingRequestsDescription"),
      icon: <FileClock className="h-4 w-4" />,
    },
    {
      label: t("metrics.openFeedback"),
      value: data.metrics.openFeedback,
      description: t("metrics.openFeedbackDescription"),
      icon: <MessageSquareWarning className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground">{t("title")}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Chip radius="md" variant="flat" className="w-fit">
          {t("generatedAt", {
            date: format(data.generatedAt, "PPp", { locale: dateLocale }),
          })}
        </Chip>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card isBlurred className="bg-background/40 xl:col-span-2">
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("searchTrend.title")}</h2>
                <p className="text-sm text-muted-foreground">{t("searchTrend.description")}</p>
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <ChartContainer
              config={{ count: { label: t("searchTrend.series"), color: "hsl(var(--primary))" } }}
              className="h-72 w-full"
            >
              <AreaChart data={dailySearchData} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="searchTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis width={36} tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent valueFormatter={(value) => numberFormatter.format(Number(value))} />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  fill="url(#searchTrendFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardBody>
        </Card>

        <Card isBlurred className="bg-background/40">
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("actorSplit.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("actorSplit.description")}</p>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{t("actorSplit.authenticated")}</span>
                  <span className="font-mono">{authenticatedPercent}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-primary/10">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${authenticatedPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{t("actorSplit.anonymous")}</span>
                  <span className="font-mono">{anonymousPercent}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-primary/10">
                  <div className="h-full rounded-full bg-muted-foreground" style={{ width: `${anonymousPercent}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-md border border-border/60 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">{t("actorSplit.authenticated")}</p>
                  <p className="font-mono text-xl font-semibold">{numberFormatter.format(actorSplit.authenticated)}</p>
                </div>
                <div className="rounded-md border border-border/60 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">{t("actorSplit.anonymous")}</p>
                  <p className="font-mono text-xl font-semibold">{numberFormatter.format(actorSplit.anonymous)}</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card isBlurred className="bg-background/40">
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("topSearches.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("topSearches.description")}</p>
            </div>
            <Link href="/dashboard/search-history" className="text-sm font-medium text-primary hover:underline">
              {t("topSearches.viewHistory")}
            </Link>
          </div>
          {topSearchData.length > 0 ? (
            <ChartContainer
              config={{ count: { label: t("topSearches.series"), color: "hsl(var(--primary))" } }}
              className="h-80 w-full"
            >
              <BarChart data={topSearchData} layout="vertical" margin={{ left: 12, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <Tooltip content={<ChartTooltipContent valueFormatter={(value) => numberFormatter.format(Number(value))} />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="rounded-md border border-dashed border-border/80 bg-background/30 p-8 text-center text-sm text-muted-foreground">
              {t("topSearches.empty")}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
