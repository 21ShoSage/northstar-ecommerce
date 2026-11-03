import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

const StoreContext = createContext(null);

// Each account gets its own cart, saved under its own key.
// (Fix: the cart used to be saved under one shared key, so a different
// account logging in on the same browser inherited the previous cart.)
const cartKey = (user) => (user?.id ? `northstar_cart_${user.id}` : null);

const readCart = (key) => {
  if (!key) return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

// Identifies one cart line: the same product in a different variant is a different line.
export const lineKey = (item) => `${item.id}-${item.variant_id ?? 'standard'}`;

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

  const [cart, setCart] = useState(() => readCart(cartKey(user)));

  // Remove the old shared cart from previous versions so it can't leak to another account.
  useEffect(() => {
    localStorage.removeItem('northstar_cart');
  }, []);

  const login = (data) => {
    sessionStorage.setItem('northstar_token', data.token);
    sessionStorage.setItem(
      'northstar_user',
      JSON.stringify(data.user)
    );

    setUser(data.user);
    setCart(readCart(cartKey(data.user)));
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

    // The cart stays saved for this account, but is cleared from the screen.
    setCart([]);
    setUser(null);
  };

  const updateCart = (next) => {
    setCart(next);
    const key = cartKey(user);
    if (key) localStorage.setItem(key, JSON.stringify(next));
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
      // Use the image the shopper was looking at, so the cart matches the shop page.
      image_url: product.display_image || product.image_url || variant.image_url,
      selectedVariant: undefined,
      display_image: undefined,
      quantity: 1
    };
    const existing = cart.find((x) => x.id === product.id && x.variant_id === variant.id);

    if (existing) {
      // Already at the available stock: nothing to add.
      if (existing.quantity >= variant.stock) return 'max';
      updateCart(
        cart.map((x) =>
          x.id === product.id && x.variant_id === variant.id
            ? {
                ...x, quantity: Math.min(x.quantity + 1, variant.stock)
              }
            : x
        )
      );
      return 'increased';
    }
    updateCart([...cart, cartItem]);
    return 'added';
  };

  const setQuantity = (item, quantity) =>
    updateCart(
      cart.map((x) =>
        lineKey(x) === lineKey(item)
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

  const removeFromCart = (item) =>
    updateCart(cart.filter((x) => lineKey(x) !== lineKey(item)));

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
