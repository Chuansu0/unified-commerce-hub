import { useState, useSyncExternalStore } from "react";
import { MOCK_PRODUCTS, CATEGORIES } from "./mockProducts";
import type { Product } from "./mockProducts";

// Category label mapping for admin (zh-TW)
export const CATEGORY_LABELS: Record<string, string> = {
  literature: "文學小說",
  art_design: "藝術設計",
  humanities: "人文史地",
  social_science: "社會科學",
  philosophy: "哲學/宗教",
  business: "商業理財",
  language: "語言學習",
  health: "醫療保健",
  travel: "旅遊休閒",
  food_craft: "飲食手作",
  science: "自然科普",
  computer: "電腦資訊",
  children: "童書/親子",
  exam: "考試用書",
  acg: "動漫/遊戲",
};

// Admin-facing product (derived from unified Product)
export interface AdminProduct {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  price: number;
  originalPrice?: number;
  currency: string;
  stock: number;
  status: string;
  created_at: string;
  image?: string;
  description?: string;
  descriptionEn?: string;
  rating: number;
  reviewCount: number;
  badges?: string[];
  features?: string[];
  recommend?: string[];
}

// ---------- Reactive store ----------
type Listener = () => void;
let _products: Product[] = [...MOCK_PRODUCTS];
const _listeners = new Set<Listener>();

function emit() {
  _listeners.forEach((l) => l());
}

function getSnapshot(): Product[] {
  return _products;
}

function subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function useProducts(): Product[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// Derive status from stock
function deriveStatus(stock: number): string {
  if (stock === 0) return "out_of_stock";
  if (stock <= 20) return "low_stock";
  return "active";
}

export function addProduct(product: Omit<AdminProduct, "id" | "created_at" | "currency" | "rating" | "reviewCount">): Product {
  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    name: product.name,
    nameEn: product.nameEn || product.name,
    description: product.description || "",
    descriptionEn: product.descriptionEn || product.description || "",
    price: product.price,
    originalPrice: product.originalPrice,
    image: product.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop",
    category: product.category,
    rating: 0,
    reviewCount: 0,
    stock: product.stock,
    badges: product.badges,
    features: product.features,
    recommend: product.recommend,
  };
  _products = [newProduct, ..._products];
  emit();
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<Product>) {
  _products = _products.map((p) => (p.id === id ? { ...p, ...updates } : p));
  emit();
}

export function deleteProduct(id: string) {
  _products = _products.filter((p) => p.id !== id);
  emit();
}

// Convert unified Product to admin view
export function toAdminProduct(p: Product): AdminProduct {
  return {
    ...p,
    currency: "TWD",
    status: deriveStatus(p.stock),
    created_at: new Date().toISOString(),
    description: p.description,
    descriptionEn: p.descriptionEn,
  };
}

// Admin categories (excluding "all")
export const ADMIN_CATEGORIES = CATEGORIES.filter((c) => c !== "all");
