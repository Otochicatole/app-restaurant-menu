import { z } from "zod";
import type { ActionResult } from "@/platform/application/action-result";

const idSchema = z.string().trim().min(1, "El identificador es obligatorio");
const tenantSlugSchema = z.string().trim().min(1, "El slug del cliente es obligatorio");
const nameSchema = z.string().trim().min(1, "El nombre es obligatorio").max(100, "El nombre es demasiado largo");
const descriptionSchema = z.string().trim().max(500, "La descripción es demasiado larga");

export const groupInputSchema = z.object({
  name: nameSchema,
  description: descriptionSchema.default(""),
});

export const groupUpdateInputSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
});

export const productInputSchema = z.object({
  name: nameSchema,
  description: descriptionSchema.default(""),
  price: z.number().finite("Ingresá un precio válido").min(0, "El precio no puede ser negativo"),
  groupId: idSchema,
});

export const productUpdateInputSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
  price: productInputSchema.shape.price.optional(),
  groupId: idSchema.optional(),
});

export const productEditorInputSchema = z.object({
  name: nameSchema,
  description: descriptionSchema.default(""),
  price: z
    .string()
    .trim()
    .min(1, "El precio es obligatorio")
    .transform(Number)
    .refine((price) => Number.isFinite(price) && price >= 0, "Ingresá un precio válido"),
  groupId: idSchema,
});

export const listGroupsCommandSchema = z.object({ tenantId: idSchema });
export const getGroupCommandSchema = z.object({ tenantId: idSchema, groupId: idSchema });
export const createGroupCommandSchema = z.object({ tenantId: idSchema, input: groupInputSchema });
export const updateGroupCommandSchema = z.object({
  tenantId: idSchema,
  groupId: idSchema,
  input: groupUpdateInputSchema,
});
export const deleteGroupCommandSchema = z.object({ tenantId: idSchema, groupId: idSchema });

export const listProductsCommandSchema = z.object({
  tenantId: idSchema,
  tenantSlug: tenantSlugSchema,
  groupId: idSchema.optional(),
});
export const getProductCommandSchema = z.object({
  tenantId: idSchema,
  tenantSlug: tenantSlugSchema,
  productId: idSchema,
});
export const createProductCommandSchema = z.object({
  tenantId: idSchema,
  tenantSlug: tenantSlugSchema,
  input: productInputSchema,
});
export const updateProductCommandSchema = z.object({
  tenantId: idSchema,
  tenantSlug: tenantSlugSchema,
  productId: idSchema,
  input: productUpdateInputSchema,
});
export const deleteProductCommandSchema = z.object({ tenantId: idSchema, productId: idSchema });
export const reorderProductsCommandSchema = z.object({
  tenantId: idSchema,
  groupId: idSchema,
  productIds: z.array(idSchema),
});

export const catalogSnapshotCommandSchema = z.object({
  tenantId: idSchema,
  tenantSlug: tenantSlugSchema,
  groupId: idSchema.optional(),
});

export const productMediaMetadataSchema = z.object({
  type: z.string().trim().min(1, "El tipo de archivo es obligatorio"),
  size: z.number().int().nonnegative().max(50 * 1024 * 1024, "El archivo excede el tamaño máximo de 50MB"),
});

export const saveProductMediaCommandSchema = z.object({
  tenantId: idSchema,
  tenantSlug: tenantSlugSchema,
  productId: idSchema,
  file: productMediaMetadataSchema.extend({ content: z.instanceof(Uint8Array) }),
});
export const removeProductMediaCommandSchema = z.object({
  tenantId: idSchema,
  tenantSlug: tenantSlugSchema,
  productId: idSchema,
});
export const productMediaCommandSchema = z.object({ tenantId: idSchema, productId: idSchema });

export type GroupInput = z.infer<typeof groupInputSchema>;
export type GroupUpdateInput = z.infer<typeof groupUpdateInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateInputSchema>;
export type ProductEditorInput = z.output<typeof productEditorInputSchema>;

export type ListGroupsCommand = z.infer<typeof listGroupsCommandSchema>;
export type GetGroupCommand = z.infer<typeof getGroupCommandSchema>;
export type CreateGroupCommand = z.infer<typeof createGroupCommandSchema>;
export type UpdateGroupCommand = z.infer<typeof updateGroupCommandSchema>;
export type DeleteGroupCommand = z.infer<typeof deleteGroupCommandSchema>;
export type ListProductsCommand = z.infer<typeof listProductsCommandSchema>;
export type GetProductCommand = z.infer<typeof getProductCommandSchema>;
export type CreateProductCommand = z.infer<typeof createProductCommandSchema>;
export type UpdateProductCommand = z.infer<typeof updateProductCommandSchema>;
export type DeleteProductCommand = z.infer<typeof deleteProductCommandSchema>;
export type ReorderProductsCommand = z.infer<typeof reorderProductsCommandSchema>;
export type CatalogSnapshotCommand = z.infer<typeof catalogSnapshotCommandSchema>;
export type SaveProductMediaCommand = z.infer<typeof saveProductMediaCommandSchema>;
export type RemoveProductMediaCommand = z.infer<typeof removeProductMediaCommandSchema>;
export type ProductMediaCommand = z.infer<typeof productMediaCommandSchema>;

export interface GroupView {
  id: string;
  name: string;
  description: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductView {
  id: string;
  name: string;
  description: string;
  price: number;
  groupId: string;
  sortOrder: number;
  groupName: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogSnapshot {
  groups: GroupView[];
  products: ProductView[];
}

export type CatalogActionResult<T = void> = ActionResult<T>;
