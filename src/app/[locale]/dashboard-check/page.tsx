'use client';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { observable } from '@trpc/server/observable';
import { api } from '@/src/trpc/react';
import Dashboard from '@/src/_pages/dashboard/dashboard';
import UserList from '@/src/_pages/dashboard/user-list/user-list';
import { DashboardOverview } from '@/src/_pages/dashboard/overview/dashboard-overview';
import type { SelectUser } from '@/db/schema/users';
const users = Array.from({length:53}, (_,i) => ({id:String(i+1),name:`Test User ${i+1}`,email:`user${i+1}@example.test`,username:i === 0 ? 'a_very_long_username_to_check_mobile_table_containment' : `user${i+1}`,role:'user',image:null})) as SelectUser[];
const overview = { generatedAt:new Date(), metrics:{totalWords:123456,totalUsers:2345,searchesToday:1234,searchesLast7Days:7890,pendingRequests:12,openFeedback:3},searchAnalytics:{dailySearches:Array.from({length:14},(_,i)=>({date:`2026-09-${String(i+1).padStart(2,'0')}`,count:1200+i*150})),topSearchedWords:[{wordName:'merhaba',count:3456},{wordName:'cumhuriyet',count:2345}],actorSplit:{total:12345,authenticated:1234,anonymous:11111}} };
export default function Check() {
 const [queryClient] = useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:30000}}}));
 const [client] = useState(()=>api.createClient({links:[()=>({op})=>observable(observer=>{const input=op.input as {take:number;skip:number};const data=op.path==='user.getUsers'?users.slice(input.skip,input.skip+input.take):op.path==='user.getUserCount'?users.length:overview;const timer=setTimeout(()=>{observer.next({result:{data}});observer.complete()},100);return ()=>clearTimeout(timer)})]}));
 const [showOverview,setShowOverview] = useState(false);
 return <api.Provider client={client} queryClient={queryClient}><QueryClientProvider client={queryClient}><Dashboard locale="tr"><button onClick={()=>setShowOverview(!showOverview)}>Toggle overview test</button>{showOverview?<DashboardOverview/>:<UserList users={users.slice(0,10)} userCount={users.length}/>}</Dashboard></QueryClientProvider></api.Provider>;
}
