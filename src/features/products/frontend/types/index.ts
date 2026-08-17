export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  groupId: string;
  sortOrder: number;
  groupName?: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  createdAt: string;
  updatedAt: string;
}
