
import React, {
  createContext,
  useContext,
  useMemo,
  useState
} from 'react';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem('northstar_user') || 'null'
      );
    } catch {
      return null;
    }
  });

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('northstar_cart') || '[]'
      );
    } catch {
      return [];
    }
  });

  const login = (data) => {
    sessionStorage.setItem('northstar_token', data.token);
    sessionStorage.setItem(
      'northstar_user',
      JSON.stringify(data.user)
    );

    setUser(data.user);
  };

  const updateUser = (updatedUser) => {
    setUser((currentUser) => {
      if (!currentUser) return null;

      const nextUser = { ...currentUser, ...updatedUser };

      sessionStorage.setItem(
        'northstar_user',
        JSON.stringify(nextUser)
      );

      return nextUser;
    });
  };

  const logout = () => {
    sessionStorage.removeItem('northstar_token');
    sessionStorage.removeItem('northstar_user');

    // Remove old persistent login data from previous versions.
    localStorage.removeItem('northstar_token');
    localStorage.removeItem('northstar_user');

    setUser(null);
  };

  const updateCart = (next) => {
    setCart(next);
    localStorage.setItem('northstar_cart', JSON.stringify(next));
  };

  const addToCart = (product) => {
    const variant = product.selectedVariant || product.variants?.[0] || {
      id: null, name: 'Standard', price: product.price, stock: product.stock
    };
    const cartItem = {
      ...product,
      variant_id: variant.id,
      variant_name: variant.name,
      price: Number(variant.price),
      stock: Number(variant.stock),
      image_url: variant.image_url || product.image_url,
      selectedVariant: undefined,
      quantity: 1
    };
    const existing = cart.find((x) => x.id === product.id && x.variant_id === variant.id);

    if (existing) {
      updateCart(
        cart.map((x) =>
          x.id === product.id && x.variant_id === variant.id
            ? {
                ...x, quantity: Math.min(x.quantity + 1, variant.stock)
              }
            : x
        )
      );
    } else {
      updateCart([...cart, cartItem]);
    }
  };

  const setQuantity = (id, quantity) =>
    updateCart(
      cart.map((x) =>
        x.id === id
          ? {
              ...x,
              quantity: Math.max(
                1,
                Math.min(Number(quantity), x.stock)
              )
            }
          : x
      )
    );

  const removeFromCart = (id) =>
    updateCart(cart.filter((x) => x.id !== id));

  const clearCart = () => updateCart([]);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      updateUser,
      cart,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart
    }),
    [user, cart]
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
