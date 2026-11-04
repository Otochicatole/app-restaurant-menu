import { adminButtonClass } from "@/ui/admin/AdminPrimitives";

export const floorPrimaryButtonClass = `${adminButtonClass} bg-[var(--floor-action,#182618)] text-white shadow-sm hover:bg-[var(--floor-action-hover,#101c10)] active:scale-[0.99] focus:ring-[var(--floor-focus,#182618)]/25`;
export const floorSecondaryButtonClass = `${adminButtonClass} border border-[var(--floor-border,#e4e4e7e6)] bg-white text-[var(--floor-ink,#27272a)] hover:border-[var(--floor-border-hover,#d4d4d8)] hover:bg-[var(--floor-hover,#fafafa)] active:scale-[0.99] focus:ring-[var(--floor-focus,#a1a1aa)]/25`;
export const floorWindowBodyClass = "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3 text-[var(--floor-ink,#263e23)]";
export const floorWindowFooterClass = "shrink-0 border-t border-[var(--floor-border,#e7e5e4)] bg-white px-4 py-3";
