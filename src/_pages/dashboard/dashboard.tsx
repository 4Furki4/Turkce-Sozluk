import React from "react";
import DashboardLinks from "./dashboard-links";


export default function Dashboard({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode,
}) {

  return (
    <div className="max-w-7xl w-[calc(100%-2rem)] min-w-0 mx-auto my-4 h-max rounded-md border-2 border-border bg-background/40 p-4">
      <div className="gap-2">
        <DashboardLinks />
      </div>
      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}
