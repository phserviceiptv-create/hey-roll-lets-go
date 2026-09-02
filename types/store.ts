export type Category = 'Discos de Ouro' | 'Abertura do Show' | "Rock'n'Drinks" | 'Grandes Hits' | 'Encore';

export type Product = {
  product_id: string;
  category_id: string | null;
  category_name: string | null;
  category_order: number | null;
  product_name: string;
  product_description: string | null;
  product_price: number;
  product_image_url: string | null;
  product_badge: string | null;
  product_order: number;
};

export type CartItem = Product & { quantity: number };

export type CheckoutData = {
  customerName: string;
  customerPhone: string;
  street: string;
  number: string;
  neighborhood: string;
  reference: string;
  paymentType: 'pix' | 'credito' | 'dinheiro';
  changeFor: number | null;
};
