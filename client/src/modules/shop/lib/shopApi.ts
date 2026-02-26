import { api } from '@/lib/api';
import type { ApiResult } from '@/types/api';

export async function fetchProducts(category?: string) {
  const response = await api.get<ApiResult<any>>('/v2/shop/products', { params: { category } });
  return response.data;
}
