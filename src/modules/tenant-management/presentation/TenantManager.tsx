"use client";

import type { TenantManagerProps } from "./tenant-manager.types";
import { TenantManagerScreen } from "./TenantManagerScreen";
import { useTenantManager } from "./use-tenant-manager";

export function TenantManager(props: TenantManagerProps) {
  const controller = useTenantManager(props);
  return <TenantManagerScreen controller={controller} />;
}

