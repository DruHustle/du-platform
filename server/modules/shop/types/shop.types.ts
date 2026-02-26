export type ProductFilter = {
  category?: string;
};

export type OrderInput = {
  userId: number;
  items: Array<{ slug: string; quantity: number }>;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: string;
};
