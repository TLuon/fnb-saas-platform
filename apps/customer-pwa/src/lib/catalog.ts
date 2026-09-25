export interface CatalogCategory {
  id: string;
  name: string;
  kitchen_station?: string;
}

export interface CatalogProduct {
  id: string;
  category_id?: string;
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  is_available: boolean;
  default_modifiers: unknown[];
  tags?: string[];
}

export interface NormalizedCatalog {
  categories: CatalogCategory[];
  products: CatalogProduct[];
}

function toProduct(value: any, categoryId?: string): CatalogProduct | null {
  const numericPrice = Number(value?.base_price ?? value?.price);
  if (!value?.id || !value?.name || !Number.isFinite(numericPrice)) return null;

  return {
    ...value,
    id: String(value.id),
    category_id: value.category_id || categoryId,
    name: String(value.name),
    description: value.description ? String(value.description) : '',
    base_price: numericPrice,
    image_url: value.image_url ? String(value.image_url) : '',
    is_available: value.is_available !== false && value.is_active !== false,
    default_modifiers: Array.isArray(value.default_modifiers) ? value.default_modifiers : [],
  };
}

export function normalizePublicCatalog(payload: any): NormalizedCatalog {
  const source = payload?.data?.data ?? payload?.data ?? payload;

  if (Array.isArray(source)) {
    const grouped = source.some((entry) => Array.isArray(entry?.items));
    if (grouped) {
      const categories = source
        .filter((entry) => entry?.id && entry?.name)
        .map((entry) => ({ id: String(entry.id), name: String(entry.name), kitchen_station: entry.kitchen_station }));
      const products = source.flatMap((entry) =>
        Array.isArray(entry?.items)
          ? entry.items.map((item: any) => toProduct(item, entry.id)).filter(Boolean)
          : [],
      ) as CatalogProduct[];
      return { categories, products };
    }

    return {
      categories: [],
      products: source.map((entry) => toProduct(entry)).filter(Boolean) as CatalogProduct[],
    };
  }

  const categories = Array.isArray(source?.categories)
    ? source.categories
        .filter((entry: any) => entry?.id && entry?.name)
        .map((entry: any) => ({
          id: String(entry.id),
          name: String(entry.name),
          kitchen_station: entry.kitchen_station,
        }))
    : [];

  const products = Array.isArray(source?.products)
    ? source.products.map((entry: any) => toProduct(entry)).filter(Boolean) as CatalogProduct[]
    : [];

  return { categories, products };
}
