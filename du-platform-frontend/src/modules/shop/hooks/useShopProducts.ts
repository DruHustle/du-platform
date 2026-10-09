import { useEffect, useState } from 'react';
import { fetchProducts } from '../lib/shopApi';

export function useShopProducts(category?: string) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchProducts(category)
      .then((result) => {
        if (!mounted) return;
        setProducts(Array.isArray(result?.products) ? result.products : []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [category]);

  return { products, loading };
}
