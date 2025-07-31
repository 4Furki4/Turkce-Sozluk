import AdminRequestDetail from "@/src/_pages/dashboard/requests/admin-request-detail";
import { HydrateClient } from "@/src/trpc/server";
import { api } from "@/src/trpc/server";

export const metadata = {
  title: "Request Details | Turkish Dictionary",
  description: "View and manage dictionary request details",
};

type Params = Promise<{ id: string }>

export default async function RequestDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  const requestId = parseInt(id, 10);

  // Prefetch request data
  api.request.getRequestDetails.prefetch({ requestId });

  return (
    <HydrateClient>
      <AdminRequestDetail requestId={requestId} />
    </HydrateClient>
  );
}
