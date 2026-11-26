import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import {
  RESTAURANT_FEATURE_CATALOG,
  featureFlagsFromRestaurant,
  getFirstEnabledRestaurantHref,
  type RestaurantFeatureKey,
  type RestaurantSummary,
} from "@/modules/restaurant-management/contracts";

type FeatureLockedScreenProps = {
  restaurant: RestaurantSummary;
  feature: RestaurantFeatureKey;
  backHref?: string;
  backLabel?: string;
};

export function FeatureLockedScreen({
  restaurant,
  feature,
  backHref,
  backLabel,
}: FeatureLockedScreenProps) {
  const def = RESTAURANT_FEATURE_CATALOG.find((item) => item.key === feature);
  const flags = featureFlagsFromRestaurant(restaurant);
  const fallbackHref = backHref ?? getFirstEnabledRestaurantHref(restaurant.id, flags);
  const resolvedLabel = backLabel ?? "Ir a un módulo activo";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-6 py-12">
      <div className="w-full rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-stone-900">
          Funcionalidad no incluida en tu plan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          El módulo <span className="font-medium text-stone-900">{def?.label ?? feature}</span> no está
          habilitado para <span className="font-medium text-stone-900">{restaurant.name}</span>.
          {def?.description ? ` ${def.description}` : ""}
        </p>
        <p className="mt-3 text-xs text-stone-500">
          Si necesitás activar esta funcionalidad, comunicate con el administrador de la plataforma para actualizar tu plan.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={fallbackHref}
            className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {resolvedLabel}
          </Link>
          <Link
            href="/admin/restaurants"
            className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            Mis restaurantes
          </Link>
        </div>
      </div>
    </div>
  );
}
