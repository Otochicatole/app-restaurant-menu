export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  groupId: string;
  groupName?: string;
  createdAt: string;
  updatedAt: string;
}
