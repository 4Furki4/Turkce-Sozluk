"use client"
import React, { useState } from 'react'
import Navbar from './navbar'
import Sidebar from './sidebar'
import MobileBottomNav from './mobile-bottom-nav'
import { Session } from '@/src/lib/auth-client'

import { authClient } from '@/src/lib/auth-client';

export default function NavbarAndSidebar({

    session: serverSession,
    HomeIntl,
    SignInIntl,
    WordListIntl,
    WordBuilderIntl,
    TitleIntl,
    ProfileIntl,
    SavedWordsIntl,
    MyRequestsIntl,
    SearchHistoryIntl,
    LogoutIntl,
    AnnouncementsIntl,
    ContributeWordIntl,
    PronunciationsIntl,
    ariaAvatar,
    ariaMenu,
    ariaLanguages,
    ariaSwitchTheme,
    ariaBlur,
    DashboardIntl,
    ContributeIntl,
    FeedbackIntl,
    SearchIntl,
    LearnIntl,
    FlashcardGameIntl,
    WordMatchingGameIntl,
    SpeedRoundGameIntl,
    ForeignTermSuggestionsIntl
}: {
    session: Session | null
    HomeIntl: string
    SignInIntl: string
    WordListIntl: string
    WordBuilderIntl: string
    TitleIntl: string
    ProfileIntl: string
    SavedWordsIntl: string
    MyRequestsIntl: string
    SearchHistoryIntl: string
    LogoutIntl: string
    AnnouncementsIntl: string
    ContributeWordIntl: string
    PronunciationsIntl: string,
    ariaAvatar: string,
    ariaMenu: string,
    ariaLanguages: string,
    ariaSwitchTheme: string,
    ariaBlur: string,
    DashboardIntl: string,
    ContributeIntl: string,
    FeedbackIntl: string,
    SearchIntl: string,
    LearnIntl: string,
    FlashcardGameIntl: string,
    WordMatchingGameIntl: string,
    SpeedRoundGameIntl: string,
    ForeignTermSuggestionsIntl: string
}) {
    // Render children if on client side, otherwise return null
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { data: clientSession, isPending } = authClient.useSession()
    const session = isPending ? serverSession : clientSession
    return (
        <>
            <Navbar
                session={session}
                HomeIntl={HomeIntl}
                SignInIntl={SignInIntl}
                WordListIntl={WordListIntl}
                WordBuilderIntl={WordBuilderIntl}
                TitleIntl={TitleIntl}
                ProfileIntl={ProfileIntl}
                SavedWordsIntl={SavedWordsIntl}
                MyRequestsIntl={MyRequestsIntl}
                SearchHistoryIntl={SearchHistoryIntl}
                LogoutIntl={LogoutIntl}
                AnnouncementsIntl={AnnouncementsIntl}
                ContributeWordIntl={ContributeWordIntl}
                PronunciationsIntl={PronunciationsIntl}
                setIsSidebarOpen={setIsSidebarOpen}
                ariaAvatar={ariaAvatar}
                ariaMenu={ariaMenu}
                ariaLanguages={ariaLanguages}
                ariaSwitchTheme={ariaSwitchTheme}
                ariaBlur={ariaBlur}
                DashboardIntl={DashboardIntl}
                ContributeIntl={ContributeIntl}
                FeedbackIntl={FeedbackIntl}
                SearchIntl={SearchIntl}
                LearnIntl={LearnIntl}
                FlashcardGameIntl={FlashcardGameIntl}
                WordMatchingGameIntl={WordMatchingGameIntl}
                SpeedRoundGameIntl={SpeedRoundGameIntl}
                ForeignTermSuggestionsIntl={ForeignTermSuggestionsIntl}
            />
            <Sidebar session={session} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <MobileBottomNav
                setIsSidebarOpen={setIsSidebarOpen}
                HomeIntl={HomeIntl}
                WordListIntl={WordListIntl}
                ContributeWordIntl={ContributeWordIntl}
                SavedWordsIntl={SavedWordsIntl}
                ariaMenu={ariaMenu}
                SearchIntl={SearchIntl}
            />
        </>
    )
}
