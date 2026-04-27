// contexts/BasketContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BasketItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  platform: string;
  affiliate_link: string;
  quantity: number;
}

interface BasketContextType {
  items: BasketItem[];
  addItem: (item: Omit<BasketItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearBasket: () => void;
  totalItems: number;
  totalPrice: number;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export function BasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('affiliate_basket');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('affiliate_basket', JSON.stringify(items));
  }, [items]);

  const addItem = (product: Omit<BasketItem, 'quantity'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  };

  const clearBasket = () => setItems([]);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <BasketContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearBasket, totalItems, totalPrice }}>
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const context = useContext(BasketContext);
  if (!context) throw new Error('useBasket must be used within BasketProvider');
  return context;
}