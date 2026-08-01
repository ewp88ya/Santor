import {
  findActiveProducts,
  findProductById,
} from "./product.repository.js";


export async function getProducts() {
  return findActiveProducts();
}


export async function getProduct(
  id: string,
) {
  return findProductById(id);
}
