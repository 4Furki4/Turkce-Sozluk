"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Database,
  ExternalLink,
  Github,
  HandHeart,
  HeartHandshake,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";

type DonationPageClientProps = {
  githubSponsorsUrl: string;
  patreonUrl?: string;
};

const supportIcons = [Server, Search, Database, Wrench, Users] as const;

export default function DonationPageClient({
  githubSponsorsUrl,
  patreonUrl,
}: DonationPageClientProps) {
  const t = useTranslations("Donation");
  const supportItems = t.raw("supportItems") as string[];

  return (
    <div className="w-full overflow-hidden">
      <section className="relative min-h-[calc(100svh-4rem)] w-full border-b border-border/60">
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(169,17,1,0.22),rgba(17,24,39,0.08)_38%,rgba(234,179,8,0.12)_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(169,17,1,0.28),transparent_62%)] lg:block"
          aria-hidden="true"
        />

        <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-md border border-primary/25 bg-background/70 px-3 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur">
              <HandHeart className="h-4 w-4" />
              {t("eyebrow")}
            </div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              {t("subtitle")}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                as="a"
                href={githubSponsorsUrl}
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
                size="lg"
                className="h-12 rounded-md px-5 font-semibold"
                startContent={<Github className="h-5 w-5" />}
                endContent={<ExternalLink className="h-4 w-4" />}
              >
                {t("githubCta")}
              </Button>
              {patreonUrl ? (
                <Button
                  as="a"
                  href={patreonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="bordered"
                  size="lg"
                  className="h-12 rounded-md border-primary/35 px-5 font-semibold"
                  startContent={<HeartHandshake className="h-5 w-5" />}
                  endContent={<ExternalLink className="h-4 w-4" />}
                >
                  {t("patreonCta")}
                </Button>
              ) : (
                <Button
                  isDisabled
                  variant="bordered"
                  size="lg"
                  className="h-12 rounded-md border-default-300 px-5 font-semibold"
                  startContent={<HeartHandshake className="h-5 w-5" />}
                >
                  {t("patreonUnavailable")}
                </Button>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}
            className="relative hidden lg:block"
            aria-hidden="true"
          >
            <div className="aspect-[4/5] rounded-md border border-border/70 bg-background/72 p-7 shadow-2xl shadow-primary/10 backdrop-blur-xl">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-border/70 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("visualLabel")}</p>
                        <p className="text-lg font-semibold">{t("visualTitle")}</p>
                      </div>
                    </div>
                    <ShieldCheck className="h-6 w-6 text-success" />
                  </div>
                  <div className="space-y-4 pt-7">
                    {supportItems.slice(0, 4).map((item, index) => {
                      const Icon = supportIcons[index];
                      return (
                        <div key={item} className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="h-2 flex-1 rounded-full bg-foreground/10">
                            <div
                              className="h-full rounded-full bg-primary/75"
                              style={{ width: `${86 - index * 9}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-md bg-foreground p-5 text-background">
                  <p className="text-sm font-medium opacity-75">{t("visualNoteLabel")}</p>
                  <p className="mt-2 text-2xl font-bold">{t("visualNote")}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">{t("supportEyebrow")}</p>
            <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              {t("supportTitle")}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              {t("supportDescription")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {supportItems.map((item, index) => {
              const Icon = supportIcons[index] ?? ArrowRight;
              return (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: index * 0.04, duration: 0.35 }}
                  className="flex items-center gap-4 rounded-md border border-border/70 bg-background/65 px-4 py-4 backdrop-blur"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-medium text-foreground">{item}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-background/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground">{t("finalTitle")}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("externalNote")}</p>
          </div>
          <Button
            as="a"
            href={githubSponsorsUrl}
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            size="lg"
            className="h-12 rounded-md px-5 font-semibold"
            startContent={<Github className="h-5 w-5" />}
            endContent={<ExternalLink className="h-4 w-4" />}
          >
            {t("githubCta")}
          </Button>
        </div>
      </section>
    </div>
  );
}
