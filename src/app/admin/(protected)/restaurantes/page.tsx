import { createRestaurantAction, deleteRestaurantsAction, getRestaurantWorkspace, selectRestaurantAction } from "@/modules/restaurant-management/server";
import { RestaurantPickerScreen } from "@/modules/restaurant-management/ui";

export default async function RestaurantsPage() {
  return <RestaurantPickerScreen workspace={await getRestaurantWorkspace()} selectRestaurant={selectRestaurantAction} createRestaurant={createRestaurantAction} deleteRestaurants={deleteRestaurantsAction} />;
}