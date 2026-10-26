"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { api, send } from "@/lib/api";
import type { User, Cart, Product } from "@/types";
import { FeedbackProvider, useFeedback } from "./ui/feedback";
import { useCart } from "@/features/cart/use-cart";

interface Store {
  user: User | null;
  loadingUser: boolean;
  cart: Cart | null;
  loadingCart: boolean;
  cartError: string;
  products: Product[];
  loadingProducts: boolean;
  productsError: string;
  refreshUser: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  addToCart: (id: number, quantity?: number) => Promise<void>;
  updateCart: (id: number, quantity: number) => Promise<void>;
  logout: () => Promise<void>;
}

const Context = createContext<Store | null>(null);
export function useStore() {
  const value = useContext(Context);
  if (!value) {
    throw new Error("Provider no disponible");
  }

  return value;
}

function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState("");
  const { notify } = useFeedback();
  const router = useRouter();
  const { mutateCart, ...cartState } = useCart(
    user?.rol === "CLIENTE" ? user.clienteId : null,
  );

  const refreshUser = useCallback(async () => {
    try {
      const data = await api<User>("auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    setLoadingProducts(true);

    try {
      const data = await api<Product[]>("products");

      setProducts(data);
      setProductsError("");
    } catch (error) {
      setProductsError((error as Error).message);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
    void refreshProducts();
  }, [refreshUser, refreshProducts]);

  async function addToCart(id: number, quantity = 1) {
    if (!user) {
      router.push("/iniciar-sesion");
      return;
    }

    if (user.rol !== "CLIENTE" || !user.clienteId) {
      notify("Utiliza una cuenta de cliente para comprar.", true);
      return;
    }

    try {
      await mutateCart(id, quantity, true);
      notify("Producto agregado al carrito");
    } catch (error) {
      notify((error as Error).message, true);
    }
  }

  async function logout() {
    try {
      await send("auth/logout", "POST");
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (error) {
      notify((error as Error).message, true);
    }
  }

  return (
    <Context.Provider
      value={{
        user,
        loadingUser,
        ...cartState,
        products,
        loadingProducts,
        productsError,
        refreshUser,
        refreshCart: cartState.refreshCart,
        refreshProducts,
        addToCart,
        updateCart: mutateCart,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FeedbackProvider>
      <StoreProvider>{children}</StoreProvider>
    </FeedbackProvider>
  );
}
