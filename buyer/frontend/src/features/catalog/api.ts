import { useQuery } from '@tanstack/react-query';
import { api, type CategoryNode, type PaginationMeta, type Product } from '@haat/shared-frontend';

export function toQueryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const catalogKeys = {
  tree: ['categories', 'tree'] as const,
  products: (params: object) => ['products', params] as const,
  product: (slug: string) => ['product', slug] as const,
};

export function useCategoryTree() {
  return useQuery({
    queryKey: catalogKeys.tree,
    queryFn: async ({ signal }) => {
      const result = await api.get<{ categories: CategoryNode[] }>('/categories', signal);
      return result.data.categories;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export interface CatalogueQuery {
  q?: string;
  category?: string;
  seller?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc';
  page?: number;
  limit?: number;
}

export function usePublicProducts(query: CatalogueQuery) {
  return useQuery({
    queryKey: catalogKeys.products(query),
    queryFn: async ({ signal }) => {
      const result = await api.get<{ items: Product[] }>(`/products${toQueryString(query)}`, signal);
      return { items: result.data.items, meta: result.meta as PaginationMeta | undefined };
    },
  });
}

export function usePublicProduct(slug: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.product(slug ?? ''),
    enabled: Boolean(slug),
    queryFn: async ({ signal }) => {
      const result = await api.get<{ product: Product }>(`/products/${slug}`, signal);
      return result.data.product;
    },
  });
}

/** Flattens the tree into select options with an indent marker for depth. */
export function flattenCategories(
  nodes: CategoryNode[],
  depth = 0,
): Array<{ id: string; label: string; slug: string }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${depth > 0 ? `${'— '.repeat(depth)}` : ''}${node.name}`, slug: node.slug },
    ...flattenCategories(node.children, depth + 1),
  ]);
}
