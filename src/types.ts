export interface Category {
  id: number;
  name_ar: string;
  name_en: string;
}

export interface Product {
  id: number;
  name: string;
  barcode: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  expiration_date: string;
  category_id: number;
  image_url: string;
  category_ar?: string;
  category_en?: string;
  created_at: string;
}

export interface Sale {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  total_price: number;
  profit: number;
  sale_date: string;
}

export interface Import {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  import_date: string;
}

export interface Stats {
  totalProducts: number;
  lowStock: number;
  expiringSoon: number;
  todayIncome: number;
  todayProfit: number;
  todayCount: number;
  salesChart: { date: string; total: number }[];
  todayHourlySales: { hour: string; total: number }[];
}
