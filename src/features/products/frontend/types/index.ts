export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  groupId: string;
  sortOrder: number;
  groupName?: string;
  createdAt: string;
  updatedAt: string;
}
