export interface FeaturedProductDTO {
  id: string;
  position: number;
  product: {
    id: string;
    name: string;
    price: number;
    groupName: string;
  };
  createdAt: string;
  updatedAt: string;
}
