import {
  getProducts,
  getProduct,
} from "./product.service.js";


export async function listProducts() {
  return getProducts();
}


export async function detailProduct(
  id: string,
) {
  return getProduct(id);
}
