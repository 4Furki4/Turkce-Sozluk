import {
  Navbar as NextuiNavbar,
  NavbarContent,
  NavbarItem,
  Button,
  Avatar,
  Link,
  DropdownItem,
  DropdownTrigger,
  DropdownMenu,
  NavbarBrand,
  DropdownSection
} from "@heroui/react";
import { Blocks, BookOpen, ChevronDown, GitPullRequestArrow, Globe, HandHeart, HeartHandshake, HistoryIcon, Languages, Layers, Link2, LogOut, Mic, Monitor, Moon, Search, StarIcon, Sun, UserIcon, WalletCards, Zap } from "lucide-react";
import { Input } from "@heroui/input";
// import { signIn, signOut } from "next-auth/react"; // Removed
import { authClient, type User } from "@/src/lib/auth-client"; // Added
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { useRouter } from "@/src/i18n/routing";
import { usePathname, Link as NextIntlLink } from "@/src/i18n/routing";
// import { Session } from "@/src/lib/auth"; // Removed
import logo from "@/public/svg/navbar/logo.svg";
import Image from "next/image";
import { useSnapshot } from "valtio";
import { preferencesState, toggleBlur } from "@/src/store/preferences";
import { cn } from "@/lib/utils";
import CustomDropdown from "./heroui/custom-dropdown";
import { Session } from "@/src/lib/auth-client";
import { useLocaleSwitchHref } from "@/src/hooks/useLocaleSwitchHref";
import { useState } from "react";
import { startNavigationProgress } from "@/src/lib/navigation-progress";

type NavbarProps = {
  session: Session | null;
} & Record<"TitleIntl" | "WordListIntl" | "WordBuilderIntl" | "SignInIntl" | "HomeIntl" | "ProfileIntl" | "SavedWordsIntl" | "MyRequestsIntl" | "SearchHistoryIntl" | "LogoutIntl" | "AnnouncementsIntl" | "ContributeWordIntl" | "DonateIntl" | "PronunciationsIntl" | "ariaAvatar" | "ariaMenu" | "ariaLanguages" | "ariaSwitchTheme" | "ariaBlur" | "ContributeIntl" | "FeedbackIntl" | "LearnIntl" | "FlashcardGameIntl" | "WordMatchingGameIntl" | "SpeedRoundGameIntl" | "ForeignTermSuggestionsIntl" | "SearchIntl" | "DashboardIntl", string>;

export default function Navbar({
  session,
  TitleIntl,
  WordListIntl,
  SignInIntl,
  HomeIntl,
  ProfileIntl,
  SavedWordsIntl,
  MyRequestsIntl,
  SearchHistoryIntl,
  LogoutIntl,
  AnnouncementsIntl,
  ContributeWordIntl,
  DonateIntl,
  PronunciationsIntl,
  ariaAvatar,
  setIsSidebarOpen,
  ariaMenu,
  ariaLanguages,
  ariaSwitchTheme,
  ariaBlur,
  ContributeIntl,
  FeedbackIntl,
  LearnIntl,
  FlashcardGameIntl,
  WordMatchingGameIntl,
  WordBuilderIntl,
  SpeedRoundGameIntl,
  ForeignTermSuggestionsIntl,
  SearchIntl,
  DashboardIntl
}: NavbarProps & { setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>> }) { // Merged props type
  const { theme, setTheme } = useTheme();
  const pathName = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const [navbarSearchQuery, setNavbarSearchQuery] = useState("");
  const languageSwitchHref = useLocaleSwitchHref();
  const isAuthPage = ["/signup", "/signin", "/forgot-password"].includes(
    pathName
  );
  const snap = useSnapshot(preferencesState);
  const isContributeActive = ["/contribute-word", "/donate", "/pronunciation-voting", "/feedback", "/foreign-term-suggestions"].some((route) => pathName.startsWith(route));
  const isLearnActive = ["/word-list", "/word-builder", "/flashcard-game", "/word-matching", "/speed-round"].some((route) => pathName.startsWith(route));
  const isHomeRoute = pathName === "/";
  const isSearchRoute =
    pathName === "/search" ||
    pathName === "/search/[word]" ||
    pathName.startsWith("/search/");
  const shouldShowNavbarSearch = !isHomeRoute && !isSearchRoute;

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
  };

  const handleNavbarSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const input = navbarSearchQuery.trim();
    if (!input) return;
    setNavbarSearchQuery("");
    startNavigationProgress();
    router.push({
      pathname: "/search/[word]",
      params: { word: encodeURIComponent(input) },
    });
  };

  return (
    <NextuiNavbar
      className="hidden md:flex bg-background-foreground/100 border-b border-border"
      maxWidth="xl"
      shouldHideOnScroll
      classNames={{
        item: [
          "relative",
          "flex",
          "h-full",
          "items-center",
          "data-[active=true]",
          "data-[active=true]:text-primary",
          "data-[active=true]:font-semibold",
          // Active styles
          "data-[active=true]:after:content-['']",
          "data-[active=true]:after:absolute",
          "data-[active=true]:after:bottom-0",
          "data-[active=true]:after:left-0",
          "data-[active=true]:after:right-0",
          "data-[active=true]:after:h-[2px]",
          "data-[active=true]:after:rounded-[2px]",
          "data-[active=true]:after:bg-primary",
          // Hover styles for nav links
          "data-[nav-link=true]:hover:after:content-['']",
          "data-[nav-link=true]:hover:after:absolute",
          "data-[nav-link=true]:hover:after:bottom-0",
          "data-[nav-link=true]:hover:after:left-0",
          "data-[nav-link=true]:hover:after:right-0",
          "data-[nav-link=true]:hover:after:h-[2px]",
          "data-[nav-link=true]:hover:after:rounded-[2px]",
          "data-[nav-link=true]:hover:after:bg-primary",
        ],
        // wrapper: ["sm:px-0"]
      }}
    >
      <NavbarItem>
        <NavbarBrand>
          <NextIntlLink as={Link as any} href="/" className="hidden md:flex items-center gap-2">
            <Image src={logo} alt="Turkish Dictionary Logo" className="h-8 w-8" />
            <span className="text-fs-1 font-bold text-primary">{TitleIntl}</span>
          </NextIntlLink>
          {/* Mobile menu button moved to bottom nav */}
        </NavbarBrand>
      </NavbarItem>
      <NavbarContent justify="end" className="gap-2 md:gap-3 lg:gap-4">
        <CustomDropdown>
          <NavbarItem className="hidden md:flex" isActive={isContributeActive}>
            <DropdownTrigger>
              <Button
                color="primary"
                disableRipple
                className={cn(
                  "capitalize p-0 bg-transparent data-[hover=true]:bg-transparent text-base max-h-6 font-semibold",
                  isContributeActive ? "text-primary" : "text-foreground",
                )}
                radius="md"
                variant="flat"
                endContent={<ChevronDown aria-label={ContributeIntl} className="w-4 h-4" />}
              >
                {ContributeIntl}
              </Button>
            </DropdownTrigger>
          </NavbarItem>
          <DropdownMenu aria-label={ContributeIntl}
            itemClasses={{
              base: [
                "data-[hover=true]:bg-primary/30",
                "dark:data-[hover=true]:bg-primary/30",
              ]
            }}>
            <DropdownItem key="contribute-word" as={NextIntlLink} href="/contribute-word" startContent={<HeartHandshake aria-label={ContributeWordIntl} className="w-4 h-4" />}>
              {ContributeWordIntl}
            </DropdownItem>
            <DropdownItem key="donate" as={NextIntlLink} href="/donate" startContent={<WalletCards aria-label={DonateIntl} className="w-4 h-4" />}>
              {DonateIntl}
            </DropdownItem>
            <DropdownItem key="pronunciation-voting" as={NextIntlLink} href="/pronunciation-voting" startContent={<Mic aria-label={PronunciationsIntl} className="w-4 h-4" />}>
              {PronunciationsIntl}
            </DropdownItem>
            <DropdownItem key={'feedback'} as={NextIntlLink} href="/feedback" startContent={<HandHeart aria-label={FeedbackIntl} className="w-4 h-4" />}>
              {FeedbackIntl}
            </DropdownItem>
            <DropdownItem key={'foreign-term-suggestions'} as={NextIntlLink} href="/foreign-term-suggestions" startContent={<Globe aria-label={ForeignTermSuggestionsIntl} className="w-4 h-4" />}>
              {ForeignTermSuggestionsIntl}
            </DropdownItem>
          </DropdownMenu>
        </CustomDropdown>
        <CustomDropdown>
          <NavbarItem className="hidden md:flex" isActive={isLearnActive}>
            <DropdownTrigger>
              <Button
                color="primary"
                disableRipple
                className={cn(
                  "capitalize p-0 bg-transparent data-[hover=true]:bg-transparent text-base max-h-6 font-semibold",
                  isLearnActive ? "text-primary" : "text-foreground",
                )}
                radius="md"
                variant="flat"
                endContent={<ChevronDown aria-label={LearnIntl} className="w-4 h-4" />}
              >
                {LearnIntl}
              </Button>
            </DropdownTrigger>
          </NavbarItem>
          <DropdownMenu aria-label={LearnIntl}
            itemClasses={{
              base: [
                "data-[hover=true]:bg-primary/30",
                "dark:data-[hover=true]:bg-primary/30",
              ]
            }}>
            <DropdownItem key="word-list" as={NextIntlLink} href="/word-list" startContent={<BookOpen aria-label={WordListIntl} className="w-4 h-4" />}>
              {WordListIntl}
            </DropdownItem>
            <DropdownItem key="word-builder" as={NextIntlLink} href="/word-builder" startContent={<Blocks aria-label={WordBuilderIntl} className="w-4 h-4" />}>
              {WordBuilderIntl}
            </DropdownItem>
            <DropdownItem key="flashcard-game" as={NextIntlLink} href="/flashcard-game" startContent={<Layers aria-label={FlashcardGameIntl} className="w-4 h-4" />}>
              {FlashcardGameIntl}
            </DropdownItem>
            <DropdownItem key="word-matching" as={NextIntlLink} href="/word-matching" startContent={<Link2 aria-label={WordMatchingGameIntl} className="w-4 h-4" />}>
              {WordMatchingGameIntl}
            </DropdownItem>
            <DropdownItem key="speed-round" as={NextIntlLink} href="/speed-round" startContent={<Zap aria-label={SpeedRoundGameIntl} className="w-4 h-4" />}>
              {SpeedRoundGameIntl}
            </DropdownItem>
          </DropdownMenu>
        </CustomDropdown>
        {shouldShowNavbarSearch ? (
          <NavbarContent justify="center" className="hidden lg:flex max-w-md">
            <NavbarItem className="w-full">
              <form onSubmit={handleNavbarSearch} className="w-full">
                <Input
                  value={navbarSearchQuery}
                  onValueChange={setNavbarSearchQuery}
                  aria-label={SearchIntl}
                  placeholder={`${SearchIntl}...`}
                  startContent={<Search className="w-4 h-4 text-primary/75 transition-colors group-data-[focus=true]:text-primary" />}
                  classNames={{
                    base: "group",
                    mainWrapper: "rounded-medium transition-all duration-200 shadow-[0_0_0_1px_rgba(251,146,60,0.18)] group-data-[focus=true]:shadow-[0_0_0_1px_rgba(251,146,60,0.55),0_0_24px_rgba(194,65,12,0.28)]",
                    inputWrapper: "h-10 bg-gradient-to-r from-background/95 to-background/75 backdrop-blur-sm border border-primary/25 hover:border-primary/50 data-[focus=true]:border-primary/70 data-[focus=true]:bg-background/95 transition-all duration-200",
                    innerWrapper: "gap-2",
                    input: "text-sm font-medium tracking-[0.01em] placeholder:text-foreground/45",
                  }}
                  size="sm"
                  type="search"
                />
              </form>
            </NavbarItem>
          </NavbarContent>
        ) : null}
        <NavbarItem>
          {locale === "en" ? (
            <NextIntlLink
              className="w-full hidden md:block px-1 py-1"
              // @ts-ignore
              href={languageSwitchHref}
              locale="tr"
              data-skip-navigation-progress
            >
              <span className="flex items-center gap-2">
                <Languages aria-label={ariaLanguages} className="w-5 h-5 xs:w-6 xs:h-6" /> TR
              </span>
            </NextIntlLink>
          ) : (
            <NextIntlLink
              className="w-full hidden md:block px-1 py-1"
              // @ts-ignore
              href={languageSwitchHref}
              locale="en"
              data-skip-navigation-progress
            >
              <span className="flex items-center gap-2">
                <Languages aria-label={ariaLanguages} className="w-5 h-5 xs:w-6 xs:h-6" /> EN
              </span>
            </NextIntlLink>
          )}
        </NavbarItem>
        <CustomDropdown>
          <NavbarItem className="hidden md:flex">
            <DropdownTrigger>
              <Button aria-label={ariaSwitchTheme} variant="light" isIconOnly>
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </DropdownTrigger>
          </NavbarItem>
          <DropdownMenu
            aria-label={ariaSwitchTheme}
            selectionMode="single"
            selectedKeys={new Set([theme ?? "system"])}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              if (selected) setTheme(selected);
            }}
            itemClasses={{
              base: [
                "data-[hover=true]:bg-primary/30",
                "dark:data-[hover=true]:bg-primary/30",
              ]
            }}
          >
            <DropdownItem key="light" startContent={<Sun className="w-4 h-4" />}>
              Light
            </DropdownItem>
            <DropdownItem key="dark" startContent={<Moon className="w-4 h-4" />}>
              Dark
            </DropdownItem>
            <DropdownItem key="system" startContent={<Monitor className="w-4 h-4" />}>
              System
            </DropdownItem>
          </DropdownMenu>
        </CustomDropdown>
        {!session?.user ? (
          <NavbarItem>
            <Button
              size="md"
              onPress={() => router.push({
                pathname: "/signin",
                query: {
                  backTo: window.location.pathname
                }
              })}
              aria-disabled={isAuthPage}
              isDisabled={isAuthPage}
              variant="shadow"
              color="primary"
              className="font-bold hidden md:inline-flex"
            >
              {SignInIntl}
            </Button>
          </NavbarItem>
        ) : (
          <>
            {/* <NavbarItem className="cursor-pointer"> */}
            <CustomDropdown>
              <DropdownTrigger className="hidden md:flex">
                <Button isIconOnly disableAnimation disableRipple
                  className="bg-transparent"
                  aria-label={ariaAvatar}
                >
                  <Avatar
                    showFallback
                    src={session.user.image ?? "https://images.unsplash.com/broken"}
                    size="sm"
                  />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                className="min-w-[240px]"
                itemClasses={{
                  base: [
                    "data-[hover=true]:bg-primary/30",
                    "dark:data-[hover=true]:bg-primary/30",
                  ],
                  title: "whitespace-normal text-wrap text-base sm:text-sm"
                }}
                onAction={(key) => {
                  switch (key) {
                    case "sign-out":
                      handleSignOut();
                      break;
                  }
                }}
              >
                <DropdownSection showDivider>
                  <DropdownItem key="profile" as={NextIntlLink} href={`/profile/${session.user.id}`} className="rounded-md" startContent={<UserIcon className="h-6 w-6" />}>
                    {ProfileIntl}
                  </DropdownItem>
                  {(session?.user as User & { role: string })?.role === "admin" ? (
                    <DropdownItem key="dashboard" as={NextIntlLink} href="/dashboard" className="rounded-md" startContent={<Layers className="h-6 w-6" />}>
                      {DashboardIntl}
                    </DropdownItem>
                  ) : null}
                </DropdownSection>
                <DropdownSection showDivider>
                  <DropdownItem key="saved-words" as={NextIntlLink} href="/saved-words" startContent={<StarIcon className="h-6 w-6" />} className="rounded-md">
                    {SavedWordsIntl}
                  </DropdownItem>
                  <DropdownItem key="requests" as={NextIntlLink} href="/my-requests" startContent={<GitPullRequestArrow className="h-6 w-6" />} className="rounded-md">
                    {MyRequestsIntl}
                  </DropdownItem>
                  <DropdownItem key="search-history" as={NextIntlLink} href="/search-history" startContent={<HistoryIcon className="h-6 w-6" />} className="rounded-md">
                    {SearchHistoryIntl}
                  </DropdownItem>
                </DropdownSection>



                <DropdownItem
                  startContent={<LogOut className="h-6 w-6" />}
                  classNames={{
                    base: [
                      "data-[hover=true]:bg-primary/60",
                      "dark:data-[hover=true]:bg-primary/60",
                      "data-[hover=true]:text-foreground",
                    ]
                  }}
                  className="rounded-md text-destructive"
                  key="sign-out"
                  color="danger"
                >
                  {LogoutIntl}
                </DropdownItem>
              </DropdownMenu>
            </CustomDropdown>
            {/* </NavbarItem> */}
          </>
        )}
      </NavbarContent>
    </NextuiNavbar>
  );
}
