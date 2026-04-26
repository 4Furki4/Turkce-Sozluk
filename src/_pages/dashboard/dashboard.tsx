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
    <div className="max-w-7xl w-full mx-auto my-4 max-lg:mx-4 h-max rounded-md border-2 border-border bg-background/40 p-4">
      <div className="gap-2">
        <DashboardLinks />
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
