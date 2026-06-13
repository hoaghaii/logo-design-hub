import { redirect } from "next/navigation";

export default async function OrderDetailPage({
  params,
}: PageProps<"/orders/[id]">) {
  const { id } = await params;
  redirect(`/orders/${id}/escrow`);
}
