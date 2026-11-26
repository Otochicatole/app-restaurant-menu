import { redirect } from "next/navigation";

export default async function LegacyCashProductsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  redirect(`/admin/restaurants/${encodeURIComponent(restaurantId)}/products`);
}
