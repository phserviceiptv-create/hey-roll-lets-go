export type Category = { id: string; name: string; slug: string; icon: string; sort_order: number; is_active: boolean };
export type AdminProduct = { id: string; category_id: string; name: string; slug: string; description: string | null; price: number; image_url: string | null; badge: string | null; sort_order: number; is_active: boolean };
