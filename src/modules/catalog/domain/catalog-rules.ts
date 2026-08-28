export class CatalogRuleViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogRuleViolation";
  }
}

export function assertCompleteProductOrder(existingProductIds: readonly string[], orderedProductIds: readonly string[]): void {
  const uniqueIds = new Set(orderedProductIds);
  if (uniqueIds.size !== orderedProductIds.length) {
    throw new CatalogRuleViolation("La lista de productos contiene elementos duplicados");
  }

  if (existingProductIds.length !== orderedProductIds.length) {
    throw new CatalogRuleViolation("La lista debe contener todos los productos del grupo");
  }

  const existingIds = new Set(existingProductIds);
  if (orderedProductIds.some((productId) => !existingIds.has(productId))) {
    throw new CatalogRuleViolation("La lista de productos no coincide con el grupo seleccionado");
  }
}

