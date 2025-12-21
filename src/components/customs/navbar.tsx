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
import { ChevronDown, GitPullRequestArrow, HandHeart, HeartHandshake, HistoryIcon, Languages, LogOut, Menu, Mic, Moon, Sparkle, Sparkles, StarIcon, Sun, UserIcon } from "lucide-react";
// import { signIn, signOut } from "next-auth/react"; // Removed
import { authClient, type User } from "@/src/lib/auth-client"; // Added
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "@/src/i18n/routing";
import { usePathname, Link as NextIntlLink } from "@/src/i18n/routing";
// import { Session } from "@/src/lib/auth"; // Removed
import logo from "@/public/svg/navbar/logo.svg";
import Image from "next/image";
import { useSnapshot } from "valtio";
import { preferencesState, toggleBlur } from "@/src/store/preferences";
import { cn } from "@/lib/utils";
import CustomDropdown from "./heroui/custom-dropdown";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import { Session } from "@/src/lib/auth-client";

type NavbarProps = {
  session: Session | null;
} & Record<"TitleIntl" | "WordListIntl" | "SignInIntl" | "HomeIntl" | "ProfileIntl" | "SavedWordsIntl" | "MyRequestsIntl" | "SearchHistoryIntl" | "LogoutIntl" | "AnnouncementsIntl" | "ContributeWordIntl" | "PronunciationsIntl" | "ariaAvatar" | "ariaMenu" | "ariaLanguages" | "ariaSwitchTheme" | "ariaBlur" | "ContributeIntl" | "FeedbackIntl", string>;

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
  PronunciationsIntl,
  ariaAvatar,
  setIsSidebarOpen,
  ariaMenu,
  ariaLanguages,
  ariaSwitchTheme,
  ariaBlur,
  ContributeIntl,
  FeedbackIntl
}: NavbarProps & { setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>> }) { // Merged props type
  const { theme, setTheme } = useTheme();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const isAuthPage = ["/signup", "/signin", "/forgot-password"].includes(
    pathName
  );
  const isOnline = useOnlineStatus()
  const snap = useSnapshot(preferencesState);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
  };

  return (
    <NextuiNavbar
      className="invisible md:visible flex bg-background-foreground/100 border-b border-border"
      maxWidth="xl"
      shouldHideOnScroll
      classNames={{
        item: [
          "relative",
          "flex",
          "h-full",
          "items-center",
          "data-[active=true]",
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
      <NavbarContent justify="end" className="gap-2 md:gap-4 lg:gap-6">
        {(session?.user as User & { role: string })?.role === "admin" ? (
          <NavbarItem className="hidden md:flex" isActive={pathName === "/dashboard"} data-nav-link="true">
            <NextIntlLink href={"/dashboard"} className='flex items-center gap-2 text-gray-900 dark:text-gray-50 rounded-sm'>
              <span className={`text-nowrap`}>Dashboard</span>
            </NextIntlLink>
          </NavbarItem>
        ) : null}
        <NavbarItem className="hidden md:flex" isActive={pathName === "/announcements"} data-nav-link="true">
          <NextIntlLink href={'/announcements'} as={Link as any} className='flex items-center gap-2 text-gray-900 dark:text-gray-50 rounded-sm'>
            <span className={`text-nowrap`}>{AnnouncementsIntl}</span>
          </NextIntlLink>
        </NavbarItem>
        <NavbarItem className="hidden md:flex" isActive={pathName === "/word-list"} data-nav-link="true">
          <NextIntlLink href={"/word-list"} className='flex items-center gap-2 text-gray-900 dark:text-gray-50 rounded-sm'>
            <span className={`text-nowrap`}>{WordListIntl}</span>
          </NextIntlLink>
        </NavbarItem>
        <CustomDropdown>
          <NavbarItem className="hidden md:flex">
            <DropdownTrigger>
              <Button color="primary" disableRipple className="capitalize p-0 bg-transparent data-[hover=true]:bg-transparent text-base max-h-6 font-bold" radius="sm" variant="flat" endContent={<ChevronDown aria-label={ContributeIntl} className="w-4 h-4" />}>
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
            <DropdownItem key="contribute-word" startContent={<HeartHandshake aria-label={ContributeWordIntl} className="w-4 h-4" />} className="py-0 pr-0">
              <NextIntlLink href="/contribute-word" className="flex items-center gap-2 py-1.5">
                {ContributeWordIntl}
              </NextIntlLink>
            </DropdownItem>
            <DropdownItem key="pronunciation-voting" startContent={<Mic aria-label={PronunciationsIntl} className="w-4 h-4" />} className="py-0 pr-0">
              <NextIntlLink href="/pronunciation-voting" className="flex items-center gap-2 py-1.5">
                {PronunciationsIntl}
              </NextIntlLink>
            </DropdownItem>
            <DropdownItem key={'feedback'} startContent={<HandHeart aria-label={FeedbackIntl} className="w-4 h-4" />} className="py-0 pr-0">
              <NextIntlLink href="/feedback" className="flex items-center gap-2 py-1.5">
                {FeedbackIntl}
              </NextIntlLink>
            </DropdownItem>
          </DropdownMenu>
        </CustomDropdown>
        <>
          {isOnline ? <NavbarItem>
            {locale === "en" ? (
              <NextIntlLink
                className="w-full hidden md:block"
                // @ts-ignore
                href={{
                  pathname: pathName,
                  query: searchParams.toString(),
                  params: {
                    word: params.word as any,
                    id: params.id as any,
                    slug: params.slug as any,
                  },
                }}
                locale="tr"
              >
                <span className="flex items-center gap-2">
                  <Languages aria-label="languages icon" className="w-5 h-5 xs:w-6 xs:h-6" /> TR
                </span>
              </NextIntlLink>
            ) : (
              <NextIntlLink
                className="w-full hidden md:block"
                // @ts-ignore
                href={{
                  pathname: pathName,
                  query: searchParams.toString(),
                  params: {
                    word: params.word as any,
                    id: params.id as any,
                    slug: params.slug as any,
                  },
                }}
                locale="en"
              >
                <span className="flex items-center gap-2">
                  <Languages aria-label={ariaLanguages} className="w-5 h-5 xs:w-6 xs:h-6" /> EN
                </span>
              </NextIntlLink>
            )}
          </NavbarItem>
            : null
          }
        </>
        <NavbarItem>
          {/* theme button */}
          <Button className="hidden md:inline-flex" aria-label={ariaSwitchTheme} variant="light" isIconOnly onPress={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

        </NavbarItem>
        <NavbarItem>

          <Button className="hidden md:inline-flex" aria-label={ariaBlur} variant="light" isIconOnly onPress={toggleBlur}>
            <Sparkles className={cn("h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all", snap.isBlurEnabled ? "rotate-0 scale-100" : "rotate-90 scale-0")} />
            <Sparkle className={cn("absolute h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all", snap.isBlurEnabled ? "rotate-90 scale-0" : "rotate-0 scale-100")} />
          </Button>
        </NavbarItem>
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
                itemClasses={{
                  base: [
                    "data-[hover=true]:bg-primary/30",
                    "dark:data-[hover=true]:bg-primary/30",
                  ]
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
                  <DropdownItem key={"profile"} className="rounded-sm py-0 pr-0" startContent={<UserIcon className="h-6 w-6" />}>
                    <Link color="foreground" as={NextIntlLink} className="w-full py-1.5" href={`/profile/${session.user.id}`}>
                      {ProfileIntl}
                    </Link>
                  </DropdownItem>
                </DropdownSection>
                <DropdownSection showDivider>
                  <DropdownItem key={"saved-words"} startContent={<StarIcon className="h-6 w-6" />} className="text-center rounded-sm py-0 pr-0">
                    <Link color="foreground" as={NextIntlLink} className="w-full py-1.5" href="/saved-words">
                      {SavedWordsIntl}
                    </Link>
                  </DropdownItem>
                  <DropdownItem key={"requests"} startContent={<GitPullRequestArrow className="h-6 w-6" />} className="text-center rounded-sm py-0 pr-0">
                    <Link color="foreground" as={NextIntlLink} className="w-full py-1.5" href="/my-requests">
                      {MyRequestsIntl}
                    </Link>
                  </DropdownItem>
                  <DropdownItem startContent={<HistoryIcon className="h-6 w-6" />} key={"search-history"} className="text-center rounded-sm py-0 pr-0">
                    <Link color="foreground" as={NextIntlLink} className="w-full py-1.5" href="/search-history">
                      {SearchHistoryIntl}
                    </Link>
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
                  className="rounded-sm text-destructive"
                  key={"sign-out"}
                  color="danger"
                  onPress={() => handleSignOut()}
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