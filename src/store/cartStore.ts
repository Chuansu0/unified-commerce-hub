import { useState, useCallback } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  category: string;
}

// Simple global cart state using a singleton pattern
let cartItems: CartItem[] = [];
let listeners: Array<() => void> = [];

function emitChange() {
  listeners.forEach((l) => l());
}

export function getCart(): CartItem[] {
  return cartItems;
}

export function addToCart(item: Omit<CartItem, "quantity">, qty = 1) {
  const existing = cartItems.find((i) => i.id === item.id);
  if (existing) {
    cartItems = cartItems.map((i) =>
      i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
    );
  } else {
    cartItems = [...cartItems, { ...item, quantity: qty }];
  }
  emitChange();
}

export function removeFromCart(id: string) {
  cartItems = cartItems.filter((i) => i.id !== id);
  emitChange();
}

export function updateQuantity(id: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(id);
    return;
  }
  cartItems = cartItems.map((i) => (i.id === id ? { ...i, quantity } : i));
  emitChange();
}

export function clearCart() {
  cartItems = [];
  emitChange();
}

export function getCartTotal(): number {
  return cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function getCartCount(): number {
  return cartItems.reduce((sum, i) => sum + i.quantity, 0);
}

export function useCart() {
  const [, setTick] = useState(0);

  const subscribe = useCallback(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  // Subscribe on mount
  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  return {
    items: getCart(),
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total: getCartTotal(),
    count: getCartCount(),
  };
}
