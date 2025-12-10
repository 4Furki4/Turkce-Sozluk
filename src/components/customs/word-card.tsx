"use client"
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Chip } from "@heroui/chip";
import { WordSearchResult } from "@/types";
import SaveWord from "./save-word";
import { Button, useDisclosure, Popover, PopoverTrigger, PopoverContent, Tabs, Tab } from "@heroui/react";
import { Link as NextUILink } from "@heroui/react"
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/src/i18n/routing";
import { Camera, Share2, Volume2, WifiOff, WifiSync } from "lucide-react";
import Image from "next/image";
import { useRef, } from "react";
import { captureElementScreenshot } from "../../utils/screenshot";
import { copyPageUrl } from "../../utils/clipboard";
import clsx from "clsx";
import WordCardRequestModal from "./modals/word-card-request-modal";
import CustomCard from "./heroui/custom-card";
import PronunciationCard from "./pronunciation-card";
import { Session } from '@/src/lib/auth-client';

type WordCardProps = {
  word_data: WordSearchResult["word_data"] & { source?: "online" | "offline" };
  locale: "en" | "tr";
  session: Session | null;
  isWordFetching?: boolean
  isOnline?: boolean
};

export default function WordCard({ word_data, locale, session, isWordFetching, isOnline }: WordCardProps) {

  const { isOpen, onOpenChange, onClose } = useDisclosure()
  const t = useTranslations("WordCard");
  const router = useRouter();
  const pathname = usePathname();
  const isOffline = word_data.source === "offline";

  const cardRef = useRef<HTMLDivElement>(null);
  const handleCameraPress = async () => {
    if (cardRef.current) {
      await captureElementScreenshot(cardRef.current, {
        processingMessage: t("screenshotProcessing") || "Creating screenshot...",
        successMessage: t("screenshotCopied") || "Screenshot copied to clipboard!",
        failureMessage: t("screenshotFailed") || "Failed to create screenshot.", // General failure
        clipboardCopyFailureMessage: t("screenshotDownloadFallback") || "Screenshot copy to clipboard failed. Downloading image instead.", // Specific for clipboard fail + download
        fileName: `${word_data.word_name}.png`
      });
    }
  };
  // Handler for the share button to copy the current page URL
  const handleSharePress = () => {
    copyPageUrl({
      successMessage: t("urlCopiedDescription") || "URL copied to clipboard!"
    });
  };
  return (
    <CustomCard
      ref={cardRef}
      as={"article"}
      aria-label={t("Words")}
      role="article"
    >
      <CardHeader className="w-full flex flex-col items-start">
        <div className="flex w-full items-center gap-4">
          <Button className="bg-transparent mr-auto" isIconOnly isDisabled> {/* TODO: add voice to word */}
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          {isWordFetching ? (
            <WifiSync className="text-green-400 w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          ) : !isOnline ? (
            <WifiOff className="text-amber-500 w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            // Optional: Show a "synced" checkmark when not fetching and online
            null
          )}
          <SaveWord word_data={word_data} isSavedWord={!session ? false : undefined} />
          <Button disableRipple isIconOnly className="bg-transparent" onPress={(e) => {
            handleCameraPress();
          }}>
            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <Button disableRipple isIconOnly className="bg-transparent" onPress={() => handleSharePress()}>
            <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>

        </div>
        <div className="w-full flex items-center justify-between">
          <div className="w-full flex items-center gap-2">
            <div className="flex items-baseline gap-2">
              {word_data.prefix && (
                <span className="text-fs-0">
                  <span aria-label="word prefix">{word_data.prefix}</span>
                  <span aria-hidden>- </span>
                </span>
              )}
              <h2 className="text-fs-2 md:text-fs-3 text-start break-words hyphens-auto">
                {word_data.word_name}
              </h2>
              {word_data.suffix && (
                <span className="text-fs-0">
                  <span aria-hidden> -</span>
                  <span aria-label="word-suffix">{word_data.suffix}</span>
                </span>
              )}

              {/* Phonetic pronunciation inline with word */}
              {word_data.phonetic && (
                <span className="text-muted-foreground text-fs-0 italic">
                  <span aria-label="word-phonetic">[{word_data.phonetic}]</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2 mt-2">
          {/* Root information section */}
          {word_data.root?.root && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium mr-2">{t("Root")}:</span>
              <span>
                <span className="text-fs--1 font-medium">{word_data.root?.root}</span>
                {word_data.root?.[`language_${locale}`] && (
                  <span className="ml-1 text-fs--2">
                    ({word_data.root?.[`language_${locale}`]})
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Word attributes section */}
          {word_data.attributes && word_data.attributes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {word_data.attributes.map((attribute) => (
                <Chip
                  key={attribute.attribute_id}
                  size="sm"
                  variant="solid"
                  className="flex rounded-lg dark:text-primary-50 bg-primary-100 dark:bg-primary/50"
                >
                  {attribute.attribute}
                </Chip>
              ))}
            </div>
          )}
        </div>


      </CardHeader>
      <CardBody>
        <>
          <Tabs color="primary" disableAnimation classNames={{
            tabList: "w-full bg-primary/10 border border-primary",
            tabContent: "text-primary md:w-full",
            tab: "data-[selected=true]:bg-primary/60",
          }}>
            <Tab value={"meaning"} title={t("Meanings")} >
              {word_data.meanings && word_data.meanings.length > 0 ? (
                <ul className="grid gap-2">
                  {word_data.meanings.map((meaning, index) => (
                    <li key={meaning.meaning_id} className="grid gap-1">
                      {(meaning.part_of_speech || (meaning.attributes && meaning.attributes.length > 0)) && (
                        <div className="flex gap-2 items-center">
                          <Divider orientation="vertical" className="w-[2px] bg-primary h-5" />
                          <p className="my-auto">
                            {meaning.part_of_speech}
                            {meaning.attributes && meaning.attributes.length > 0 && (
                              <>
                                {meaning.part_of_speech ? ", " : ""}
                                {meaning.attributes.map(attr => attr.attribute).join(", ")}
                              </>
                            )}
                          </p>
                        </div>
                      )}
                      <></>
                      <div className='flex flex-col md:flex-row gap-4'>
                        <div className={clsx('w-full', {
                          'md:w-2/3': meaning.imageUrl
                        })}>
                          {meaning.meaning.search('Bakınız: ') === -1 ? (
                            <>
                              <p className="text-fs-1 break-words hyphens-auto">
                                {meaning.meaning}
                              </p>
                              {meaning.sentence ? (
                                <div className="w-full italic px-2 text-fs--1 text-left bg-primary/15 p-2">
                                  <p>
                                    <q>{meaning.sentence}</q>
                                  </p>
                                  {meaning.author && <p>-{meaning.author}</p>}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <p>
                              {locale === "en" ? "See Also: " : "Bakınız: "}
                              <NextUILink
                                href={`/search/${meaning.meaning.split('Bakınız: ')[1]}`}
                                as={Link}
                                size="lg"
                                showAnchorIcon
                                underline="always"
                              >
                                {meaning.meaning.split('Bakınız: ')[1]}
                              </NextUILink>
                            </p>
                          )}
                        </div>
                        {meaning.imageUrl && (
                          <div className="md:w-1/3 h-auto rounded-md overflow-hidden">

                            <Image
                              src={meaning.imageUrl}
                              alt={meaning.meaning}
                              width={300}
                              height={200}
                              className="w-full h-auto object-cover rounded-md"
                            />
                          </div>
                        )}
                      </div>

                      {/* do not render a divider after the last meaning. */}
                      {index === word_data.meanings.length - 1 ? null : <Divider />}
                    </li>
                  ))}
                </ul>
              ) : (
                // Handle navigation-only words (words with no meanings but with related words)
                <div className="p-4 border border-primary/20 rounded-md bg-primary/5">
                  {word_data.relatedWords && word_data.relatedWords.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-fs-1">{t("NavigationWord")}</p>
                      <div className="flex flex-wrap gap-2">
                        {word_data.relatedWords.filter((related) => related.relation_type !== "relatedWord" && related.relation_type !== "compoundWord").map((related) => (
                          <NextUILink
                            key={related.related_word_id}
                            as={Link}
                            href={`/search/${related.related_word_name}`}
                            className="px-3 py-1 bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                          >
                            {related.related_word_name}
                            {related.relation_type && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({t(related.relation_type)})
                              </span>
                            )}
                          </NextUILink>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <p>{t("NoMeaningsFound")}</p>
                    </div>
                  )}
                </div>
              )}
            </Tab>
            <Tab value={"related_words"} title={t("RelatedWords")}>
              {word_data.relatedWords && word_data.relatedWords.length > 0 ? (
                <div className="p-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {word_data.relatedWords.map((related_word) => (
                      <Card key={related_word.related_word_id} classNames={{
                        base: "bg-background/10",
                      }}>
                        <CardBody className="flex flex-row items-center justify-between">
                          <NextUILink
                            underline="hover"
                            as={Link}
                            href={`/search/${related_word.related_word_name}`}
                          >
                            {related_word.related_word_name}
                            {related_word.relation_type && related_word.relation_type !== 'relatedWord' && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({t(related_word.relation_type) || related_word.relation_type})
                              </span>
                            )}
                          </NextUILink>

                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <p>{t("NoRelatedWordsFound") || "No related words found"}</p>
                </div>
              )}
            </Tab>
            <Tab value={"related_phrases"} title={t("RelatedPhrases")}>
              {word_data.relatedPhrases && word_data.relatedPhrases.length > 0 ? (
                <div className="p-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {word_data.relatedPhrases.map((related_phrase) => (
                      <Card classNames={{
                        base: "bg-background/10",
                      }} key={related_phrase.related_phrase_id}>
                        <CardBody>
                          <NextUILink
                            underline="hover"
                            as={Link}
                            href={`/search/${related_phrase.related_phrase}`}
                          >
                            {related_phrase.related_phrase}
                          </NextUILink>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <p>{t("NoRelatedPhrasesFound") || "No related phrases found"}</p>
                </div>
              )}
            </Tab>
            <Tab value={"pronunciations"} title={t("Pronunciations")}>
              <PronunciationCard
                wordId={word_data.word_id}
                session={session}
              />
            </Tab>
          </Tabs>
        </>
      </CardBody>
      <CardFooter className="flex justify-between">
        <>
          {
            session ?
              (<Button onPress={onOpenChange} color="primary" variant="solid">
                {t("RequestEdit")}
              </Button>)
              : (
                <Popover showArrow placement="bottom">
                  <PopoverTrigger>
                    <Button color="primary" variant="faded">
                      {t("RequestEdit")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="flex flex-col items-center">
                      <div>
                        <p>
                          {t("You can request an edit if you are signed in")}
                        </p>
                        <button onClick={() => router.push({
                          pathname: "/signin",
                          query: {
                            callbackUrl: pathname
                          }
                        })} className="text-primary underline underline-offset-2 cursor-pointer">
                          {t("SignIn")}
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )
          }
        </>
        <WordCardRequestModal word={{ word_data }} session={session} isOpen={isOpen} onOpenChange={onOpenChange} onClose={onClose} />
      </CardFooter>
      <div data-screenshot-watermark className="w-full text-center text-xs text-muted-foreground pt-2">
        turkce-sozluk.com
      </div>
    </CustomCard>
  );
}
