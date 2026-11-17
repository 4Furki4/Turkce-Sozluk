import { useTranslations } from "next-intl";

export const marks = [
  ["from", "<", "abajur < Fr abat-jour"],
  ["to", ">", "algarna > algarina"],
  ["compare", "~", "~ Tkm ağır"],
  ["reconstructed", "*", "*argarna"],
  ["uncertainty", "?", "alangle (?)"],
  ["affix", "-", "ağ- / -şak"],
  ["homonym", "¹ ²", "ağız¹ / ağız²"],
  ["see", "Bk.", "Bk. ağda"],
  ["regional", "yer.", "adar"],
] as const;

export const languages = [
  ["ar", "Ar"], ["fr", "Fr"], ["far", "Far"], ["r", "R"], ["erm", "Erm"],
  ["ital", "İtal"], ["et", "ET"], ["ot", "OT"], ["az", "Az"], ["tkm", "Tkm"], ["cuv", "Çuv"],
  ["blg", "Blg"], ["srp", "Srp"],
] as const;

export function NotationGuide() {
  const t = useTranslations("EtymologyReader.Guide");
  return (
    <section id="isaretler" aria-labelledby="etymology-guide-title" className="scroll-mt-24 border-t border-foreground/15 pt-7">
      <h2 id="etymology-guide-title" className="font-serif text-3xl">{t("title")}</h2>
      <p className="mt-2 max-w-[68ch] text-sm leading-6 text-foreground/75">{t("intro")}</p>
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <dl className="divide-y divide-foreground/10 rounded-xl border border-foreground/15 bg-background/40 px-4 sm:px-5">
          {marks.map(([key, symbol, example]) => (
            <div key={key} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 py-3">
              <dt className="font-mono text-sm font-semibold text-primary">{symbol}</dt>
              <dd className="text-sm leading-5">
                {t(key)}
                <span lang="tr" className="mt-1 block wrap-anywhere text-foreground/75">{example}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="space-y-5 rounded-xl border border-foreground/15 bg-background/40 p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-semibold">{t("languages")}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {languages.map(([key, code]) => (
                <div key={key} className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="font-mono text-xs font-semibold text-primary">{code}</dt>
                  <dd>{t(`language.${key}`)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="border-t border-foreground/15 pt-4">
            <h3 className="text-sm font-semibold">{t("spellingTitle")}</h3>
            <p className="mt-2 text-sm leading-6 text-foreground/75">{t("spelling")}</p>
          </div>
          <p className="border-t border-foreground/15 pt-4 text-sm leading-6 text-foreground/75">{t("source")}</p>
        </div>
      </div>
    </section>
  );
}
