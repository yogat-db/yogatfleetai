'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';

export type BasketItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  platform: string;
  affiliate_link: string;
  quantity: number;
};

type BasketContextType = {
  items: BasketItem[];
  hydrated: boolean;
  addItem: (item: Omit<BasketItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearBasket: () => void;
  isInBasket: (id: string) => boolean;
  getItemQuantity: (id: string) => number;
  totalItems: number;
  totalPrice: number;
};

const STORAGE_KEY = 'affiliate_basket';

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export function BasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          const safeItems = parsed
            .filter(Boolean)
            .map((item) => ({
              id: String(item.id),
              name: String(item.name ?? ''),
              price: Number(item.price ?? 0),
              image_url: item.image_url ? String(item.image_url) : null,
              platform: String(item.platform ?? ''),
              affiliate_link: String(item.affiliate_link ?? ''),
              quantity: Math.max(1, Number(item.quantity ?? 1)),
            }))
            .filter((item) => item.id && item.name);

          setItems(safeItems);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = (product: Omit<BasketItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          ...product,
          price: Number(product.price || 0),
          image_url: product.image_url || null,
          quantity: 1,
        },
      ];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    const safeQuantity = Math.floor(quantity);

    if (safeQuantity <= 0) {
      removeItem(id);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: safeQuantity } : item
      )
    );
  };

  const clearBasket = () => setItems([]);

  const isInBasket = (id: string) => items.some((item) => item.id === id);

  const getItemQuantity = (id: string) =>
    items.find((item) => item.id === id)?.quantity ?? 0;

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      hydrated,
      addItem,
      removeItem,
      updateQuantity,
      clearBasket,
      isInBasket,
      getItemQuantity,
      totalItems,
      totalPrice,
    }),
    [items, hydrated, totalItems, totalPrice]
  );

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket() {
  const context = useContext(BasketContext);

  if (!context) {
    throw new Error('useBasket must be used within BasketProvider');
  }

  return context;
}