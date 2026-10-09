import { api } from '@/lib/api';

export async function fetchProducts(category?: string) {
  const response = await api.get<any>('/shop/products', { params: { category } });
  return response.data;
}
