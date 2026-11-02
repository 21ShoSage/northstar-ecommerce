import React, { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ShoppingBag, Search, ArrowUpRight, Plus, Minus, Trash2, Menu, X, PackageCheck, ShieldCheck, Leaf, Truck, LogOut, UserRound, LayoutDashboard, ClipboardList, Pencil, CircleCheck, AlertCircle, Camera, LockKeyhole, Save, Eye, EyeOff } from 'lucide-react';
import { api, money } from './api.js';
import { useStore } from './store.jsx';
import { ThemeToggle } from './theme.jsx';

function Notice({ message, type = 'error' }) {
  const [visible, setVisible] = useState(Boolean(message));
  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return undefined;
    const timer = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div className={`notice notice-${type}`} role="alert">
      {type === 'success' ? <CircleCheck size={18} /> : <AlertCircle size={18} />}
      {message}
    </div>
  );
}


const fallbackImage =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80';

const imageSrc = (value) => {
  if (!value) return fallbackImage;

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  return `http://localhost:5000${value.startsWith('/') ? '' : '/'}${value}`;
};

const emailErrorMessage = (email) =>
  !email ? 'Email address is required.' :
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? 'Enter a valid email address.'
    : '';

const today = new Date().toISOString().slice(0, 10);
function Header() {
  const { user, logout, cart } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="nav-wrap">
      <Link to="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark">N</span><span>NORTHSTAR<span className="brand-sub">GOODS FOR EVERYDAY</span></span></Link>
      <nav className={open ? 'nav-links open' : 'nav-links'}>
        <NavLink to="/shop" onClick={() => setOpen(false)}>Shop all</NavLink>
        {user?.role === 'admin' && <NavLink to="/admin" onClick={() => setOpen(false)}>Admin</NavLink>}
        {user && <NavLink to="/profile" onClick={() => setOpen(false)}>My Profile</NavLink>}
        {user && user.role !== 'admin' && <NavLink to="/orders" onClick={() => setOpen(false)}>My orders</NavLink>}
        {user && user.role !== 'admin' && <Link to="/cart" className="cart-link" onClick={() => setOpen(false)}><ShoppingBag size={17}/> Bag <span className="cart-count">{cart.reduce((s, x) => s + x.quantity, 0)}</span></Link>}
        
{user ? (
  <button
    className="nav-user"
    onClick={() => {
      const confirmed = window.confirm(
        'Are you sure you want to sign out?'
      );

      if (confirmed) {
        logout();
        setOpen(false);
        navigate('/login');
      }
    }}
  >
    <LogOut size={16} /> Sign out
  </button>
) : (
  <Link
    className="nav-login"
    to="/login"
    onClick={() => setOpen(false)}
  >
    Sign in <ArrowUpRight size={16} />
  </Link>
)}

      </nav>
      <div className="nav-tools"><ThemeToggle/><button className="mobile-menu icon-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X/> : <Menu/>}</button></div>
    </div>
  </header>;
}
function Footer() {
  return <footer className="footer"><div className="footer-inner"><Link to="/" className="brand footer-brand"><span className="brand-mark">N</span><span>NORTHSTAR<span className="brand-sub">GOODS FOR EVERYDAY</span></span></Link><p>Thoughtful finds. Everyday favorites.</p><span>© {new Date().getFullYear()} Northstar Store</span></div></footer>;
}
function ProductCard({ product, index = 0 }) {
  const { user, addToCart } = useStore();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const [cartNotice, setCartNotice] = useState('');
  const variant = product.variants?.[0];
  const displayPrice = variant?.price ?? product.price;
  const displayStock = product.variants?.length
    ? product.variants.reduce((sum, item) => sum + item.stock, 0)
    : product.stock;
  return <article className="product-card" style={{ animationDelay: `${index * 55}ms` }}>
    <Link to={`/product/${product.id}`} className="product-image-wrap">
      <img
  src={imageSrc(product.image_url)}
  alt={product.name}
  className="product-image"
  onError={(e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackImage;
  }}
/>
      <span className="product-category">{product.category}</span>
    </Link>
    <div className="product-info"><Link to={`/product/${product.id}`} className="product-name">{product.name}</Link><div className="product-bottom"><span className="price">{money(displayPrice)}</span><button className={`add-button ${added ? 'added' : ''}`} aria-label={`Add ${product.name} to bag`} disabled={displayStock < 1} onClick={() => { if (!user) { window.alert('Please log in first to add a product to your bag.'); navigate('/login'); return; } addToCart({ ...product, selectedVariant: variant }); setAdded(true); setCartNotice('Product added to cart.'); setTimeout(() => setAdded(false), 1000); }}>{added ? <CircleCheck size={17}/> : <Plus size={17}/>}</button></div><span className="stock-note">{displayStock > 0 ? `${displayStock} in stock` : 'Currently sold out'}</span>{cartNotice && <Notice message={cartNotice} type="success" />}</div>
  </article>;
}
function Home() {
  const [featured, setFeatured] = useState([]);
  useEffect(() => { api('/products').then((d) => setFeatured(d.products.slice(0, 4))).catch(() => {}); }, []);
  return <><main>
    <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line"/> THE EVERYDAY EDITION</span><h1>Good things,<br/><em>chosen well.</em></h1><p>Useful, beautiful essentials for the way you live. Meet your next everyday favorite.</p><div className="hero-actions"><Link className="button button-dark" to="/shop">Explore the collection <ArrowUpRight size={17}/></Link><span className="hero-note">Considered goods. Honest prices.</span></div><div className="hero-stats"><div><strong>01</strong><span>Curated finds</span></div><div><strong>02</strong><span>Everyday value</span></div><div><strong>03</strong><span>Made for living</span></div></div></div><div className="hero-visual"><img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1300&q=85" alt="A curated collection of everyday fashion and lifestyle essentials"/><div className="image-caption"><span>THE NEW CLASSICS</span><span>Thoughtful by design ↗</span></div><div className="hero-stamp">FIND<br/>YOUR<br/><em>FAVORITE.</em></div></div></section>
    <section className="benefits"><div><PackageCheck/><span><b>Quality picks</b><small>Selected for everyday use</small></span></div><div><Truck/><span><b>Simple delivery</b><small>Order from the comfort of home</small></span></div><div><ShieldCheck/><span><b>Secure account</b><small>Your account, your orders</small></span></div><div><Leaf/><span><b>Less, but better</b><small>Shop what you really need</small></span></div></section>
    <section className="section featured-section"><div className="section-heading"><div><span className="eyebrow">A FEW GOOD THINGS</span><h2>Made for your <em>everyday.</em></h2></div><Link className="text-link" to="/shop">View all products <ArrowUpRight size={17}/></Link></div>{featured.length ? <div className="product-grid">{featured.map((p, i) => <ProductCard key={p.id} product={p} index={i}/>)}</div> : <div className="empty-state"><p>Products are getting ready.</p><Link to="/shop" className="text-link">Visit the shop <ArrowUpRight size={16}/></Link></div>}</section>
    <section className="story-band"><div className="story-image"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80" alt="Warm, minimal retail space"/></div><div className="story-copy"><span className="eyebrow">OUR POINT OF VIEW</span><h2>Everyday things<br/>can feel <em>special.</em></h2><p>Northstar is a small corner for practical finds and little upgrades. Browse at your own pace, pick what fits your life, and let the good things earn their place.</p><Link className="button button-light" to="/shop">Find your next favorite <ArrowUpRight size={17}/></Link></div></section>
  </main><Footer/></>;
}
function Shop() {
  const [products, setProducts] = useState([]), [q, setQ] = useState(''), [category, setCategory] = useState('All'), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { setLoading(true); api(`/products?q=${encodeURIComponent(q)}${category !== 'All' ? `&category=${encodeURIComponent(category)}` : ''}`).then(d => { setProducts(d.products); setError(''); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }, [q, category]);
  const categories = ['All', 'General', 'Fashion', 'Home', 'Accessories', 'Electronics'];
  return <main className="page-shell"><div className="page-heading"><span className="eyebrow">THE COLLECTION</span><h1>Shop <em>all.</em></h1><p>Useful things, considered carefully.</p></div><div className="shop-tools"><label className="search-box"><Search size={18}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products..." aria-label="Search products"/></label><div className="category-pills">{categories.map(c => <button key={c} className={category === c ? 'pill active' : 'pill'} onClick={() => setCategory(c)}>{c}</button>)}</div></div><Notice message={error}/>{loading ? <div className="loading">Finding good things…</div> : products.length ? <div className="product-grid shop-grid">{products.map((p,i) => <ProductCard key={p.id} product={p} index={i}/>)}</div> : <div className="empty-state"><ShoppingBag size={28}/><h3>Nothing found just yet.</h3><p>Try another search or choose a different category.</p><button className="button button-dark" onClick={() => { setQ(''); setCategory('All'); }}>Clear filters</button></div>}</main>;
}

function ProductDetail() {
  const { id } = useParamsSafe();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [cartNotice, setCartNotice] = useState('');
  const { user, addToCart } = useStore();

  useEffect(() => {
    setSelectedColor(null);
    setSelectedSize(null);
    api(`/products/${id}`)
      .then((d) => setProduct(d.product))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main className="page-shell">
        <Notice message={error} />
        <Link to="/shop" className="text-link">
          ← Back to shop
        </Link>
      </main>
    );
  }

  if (!product) {
    return <main className="page-shell loading">Loading product…</main>;
  }
  const variants = product.variants?.length ? product.variants : [{
    id: null, color: 'Standard', name: 'Standard', price: product.price, stock: product.stock, image_url: product.image_url
  }];
  const colors = [...new Set(variants.map((variant) => variant.color || 'Standard'))];
  const sizes = [...new Set(variants.map((variant) => variant.name || 'Standard'))];
  const availableVariants = variants.filter((variant) => Number(variant.stock) > 0);
  const firstAvailable = availableVariants[0] || variants[0];
  const defaultColor = firstAvailable?.color || 'Standard';
  const defaultSize = firstAvailable?.name || 'Standard';
  const activeColor = selectedColor || defaultColor;
  const activeColorVariants = variants.filter((variant) =>
    (variant.color || 'Standard') === activeColor
  );
  const activeSize = selectedSize
    || activeColorVariants.find((variant) => Number(variant.stock) > 0)?.name
    || defaultSize;
  const colorVariant = activeColorVariants.find((variant) => Number(variant.stock) > 0)
    || activeColorVariants[0]
    || firstAvailable;
  const selectedVariant = variants.find((variant) =>
    (variant.color || 'Standard') === activeColor
    && (variant.name || 'Standard') === activeSize
  ) || { ...firstAvailable, stock: 0 };
  const isColorAvailable = (color) => variants.some((variant) =>
    (variant.color || 'Standard') === color
    && Number(variant.stock) > 0
  );
  const isSizeAvailable = (size) => variants.some((variant) =>
    (variant.color || 'Standard') === activeColor
    && (variant.name || 'Standard') === size
    && Number(variant.stock) > 0
  );
  const displayedImage = selectedColor === null
    ? product.image_url
    : colorVariant.image_url || product.image_url;

  return (
    <main className="page-shell">
      <Link to="/shop" className="back-link">
        ← Back to collection
      </Link>

      <div className="detail-layout">
        <div className="detail-image">
          <img
            src={imageSrc(displayedImage)}
            alt={product.name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackImage;
            }}
          />
          <div className="detail-gallery">
            {[{ id: 'main', image_url: product.image_url }, ...(product.variants || [])]
              .filter((image, index, images) => image.image_url && images.findIndex((item) => item.image_url === image.image_url) === index)
              .map((image) => (
                <button
                  type="button"
                  className="detail-gallery-thumb"
                  key={image.id}
                  onClick={() => {
                    if (image.id === 'main') {
                      setSelectedColor(null);
                      setSelectedSize(null);
                    } else {
                      setSelectedColor(image.color || 'Standard');
                    }
                  }}
                  aria-label={image.id === 'main' ? 'View main product image' : `View ${image.color || image.name} image`}
                >
                  <img src={imageSrc(image.image_url)} alt="" />
                </button>
              ))}
          </div>
        </div>

        <div className="detail-copy">
          <span className="eyebrow">{product.category}</span>
          <h1>{product.name}</h1>
          <span className="detail-price">{money(selectedVariant.price)}</span>
          <p>{product.description}</p>
          {colors.length > 1 && <div className="variant-group"><span className="variant-label">Color</span><div className="variant-buttons">{colors.map((color) => <button type="button" key={color} className={`variant-button ${activeColor === color ? 'active' : ''}`} disabled={!isColorAvailable(color)} onClick={() => {
            setSelectedColor(color);
            const availableSize = variants.find((variant) =>
              (variant.color || 'Standard') === color
              && Number(variant.stock) > 0
            )?.name || 'Standard';
            if (!variants.some((variant) =>
              (variant.color || 'Standard') === color
              && (variant.name || 'Standard') === activeSize
              && Number(variant.stock) > 0
            )) {
              setSelectedSize(availableSize);
            }
          }}>{color}</button>)}</div></div>}
          {sizes.length > 1 && <div className="variant-group"><span className="variant-label">Size</span><div className="variant-buttons">{sizes.map((size) => <button type="button" key={size} className={`variant-button ${activeSize === size ? 'active' : ''}`} disabled={!isSizeAvailable(size)} onClick={() => setSelectedSize(size)}>{size}</button>)}</div></div>}

          <p className="stock-note">
            {selectedVariant.stock > 0
              ? `${selectedVariant.stock} available`
              : 'Currently sold out'}
          </p>

          <button
            className="button button-dark wide-button"
            disabled={selectedVariant.stock < 1}
            onClick={() => {
              if (!user) {
                window.alert('Please log in first to add a product to your bag.');
                navigate('/login');
                return;
              }
              addToCart({ ...product, selectedVariant });
              setCartNotice('Product added to cart.');
            }}
          >
            Add to bag <ShoppingBag size={17} />
          </button>
          <Notice message={cartNotice} type="success" />

          <div className="detail-assurances">
            <span><PackageCheck size={17} /> Carefully selected</span>
            <span><ShieldCheck size={17} /> Secure account</span>
          </div>
        </div>
      </div>
    </main>
  );
}

// Small wrapper keeps the route parameter hook in one place.
function useParamsSafe() {
  return useParams();
}
function Cart() {
  const { cart, setQuantity, removeFromCart } = useStore();
  const total = cart.reduce((s, x) => s + x.price * x.quantity, 0);
  const shipping = total > 5000 ? 0 : 100;
  const decreaseQuantity = (item) => {
    if (item.quantity === 1) {
      if (window.confirm('Want to remove the item?')) {
        removeFromCart(item.id);
      }
      return;
    }

    setQuantity(item.id, item.quantity - 1);
  };
  return <main className="page-shell"><div className="page-heading compact-heading"><span className="eyebrow">YOUR SELECTION</span><h1>Your <em>bag.</em></h1></div>{!cart.length ? <div className="empty-state"><ShoppingBag size={30}/><h3>Your bag is taking a little break.</h3><p>Find something useful for your everyday.</p><Link to="/shop" className="button button-dark">Explore the shop <ArrowUpRight size={17}/></Link></div> : <div className="cart-layout"><div className="cart-items">{cart.map(item => <div className="cart-item" key={`${item.id}-${item.variant_id || 'standard'}`}><img
  src={imageSrc(item.image_url)}
  alt={item.name}
  onError={(e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackImage;
  }}
/><div className="cart-item-info"><span className="eyebrow">{item.category}</span><h3>{item.name}</h3>{item.variant_name && <small>{item.variant_name}</small>}<span>{money(item.price)}</span><div className="quantity-control"><button onClick={() => decreaseQuantity(item)} aria-label="Decrease quantity"><Minus size={14}/></button><span>{item.quantity}</span><button onClick={() => setQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Increase quantity"><Plus size={14}/></button></div></div><div className="cart-item-end"><b>{money(item.price * item.quantity)}</b><button className="remove-button" onClick={() => removeFromCart(item.id)}><Trash2 size={15}/> Remove</button></div></div>)}</div><aside className="order-summary"><span className="eyebrow">THE TOTAL</span><h2>Order summary</h2><div className="summary-line"><span>Subtotal</span><span>{money(total)}</span></div><div className="summary-line"><span>Shipping</span><span>{shipping ? money(shipping) : 'Free'}</span></div>{shipping > 0 && <p className="summary-note">Free shipping on orders over PHP 5,000.</p>}<div className="summary-total"><span>Estimated total</span><strong>{money(total + shipping)}</strong></div><Link className="button button-dark wide-button" to="/checkout">Continue to checkout <ArrowUpRight size={17}/></Link><p className="summary-note">Checkout creates an order for this demo store. No payment is charged.</p></aside></div>}</main>;
}
function Checkout() {
  const { cart, clearCart, user } = useStore(), navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [form, setForm] = useState({ customer_name: user?.name || '', shipping_address: '', phone: user?.phone || '', payment_method: 'Cash on delivery' }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/auth/addresses').then((data) => {
      setAddresses(data.addresses);
      const saved = data.addresses.find((address) => address.is_default) || data.addresses[0];
      if (saved) {
        setSelectedAddress(String(saved.id));
        setForm((current) => ({ ...current, customer_name: saved.recipient_name, phone: saved.phone, shipping_address: saved.address_line }));
      } else {
        setSelectedAddress('new');
      }
    }).catch((e) => setError(e.message));
  }, []);
  const total = cart.reduce((s, x) => s + x.price * x.quantity, 0);
  const shipping = total > 5000 ? 0 : 100;
  const change = e => setForm({
    ...form,
    [e.target.name]: e.target.name === 'phone'
      ? e.target.value.replace(/\D/g, '').slice(0, 11)
      : e.target.value
  });
  async function submit(e) {
    e.preventDefault(); setError('');
    if (!cart.length) return setError('Your bag is empty.');
    setBusy(true);
    try {
      const shouldSave = selectedAddress === 'new' && window.confirm('Would you like to save this address to your address book?');
      const d = await api('/orders', { method: 'POST', body: JSON.stringify({ ...form, items: cart.map(x => ({ product_id: x.id, variant_id: x.variant_id, quantity: x.quantity })) }) });
      if (shouldSave) {
        await api('/auth/addresses', { method: 'POST', body: JSON.stringify({ label: 'Checkout address', recipient_name: form.customer_name, phone: form.phone, address_line: form.shipping_address }) });
      }
      clearCart(); navigate('/orders', { state: { message: d.message } });
    }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!user) return <main className="page-shell"><div className="empty-state"><UserRound size={30}/><h3>Sign in to check out</h3><p>Your orders will be saved to your account.</p><Link to="/login" className="button button-dark">Sign in or create account</Link></div></main>;
  if (!cart.length) return <main className="page-shell"><div className="empty-state"><h3>Your bag is empty.</h3><Link to="/shop" className="text-link">Return to shop →</Link></div></main>;
  return <main className="page-shell"><div className="page-heading compact-heading"><span className="eyebrow">ALMOST YOURS</span><h1>Checkout <em>details.</em></h1></div><div className="checkout-layout"><form className="form-card" onSubmit={submit}><h2>Shipping information</h2><p className="muted">Your saved address is prefilled. You can change it for this order.</p>  <Notice message={error}/><label>Shipping address<select value={selectedAddress} onChange={(e) => { const value = e.target.value; setSelectedAddress(value); const saved = addresses.find((address) => String(address.id) === value); if (saved) setForm({ ...form, customer_name: saved.recipient_name, phone: saved.phone, shipping_address: saved.address_line }); else setForm({ ...form, customer_name: user.name, phone: user.phone || '', shipping_address: '', payment_method: form.payment_method }); }}><option value="new">Add a new address</option>{addresses.map((address) => <option key={address.id} value={address.id}>{address.label} — {address.address_line}</option>)}</select></label><label>Recipient name<input name="customer_name" required minLength="2" value={form.customer_name} onChange={change} placeholder="Recipient name"/></label><label>Phone number<input name="phone" type="tel" inputMode="numeric" pattern="[0-9]{11}" maxLength="11" required value={form.phone} onChange={change} placeholder="11-digit phone number"/></label><label>Complete shipping address<textarea name="shipping_address" required minLength="8" rows="4" value={form.shipping_address} onChange={change} placeholder="House / unit, street, barangay, city, province"/></label><label>Payment method<select name="payment_method" value={form.payment_method} onChange={change}><option>Cash on delivery</option><option>GCash (Demo)</option><option>Credit or debit card (Demo)</option></select></label><p className="summary-note">Demo payment selection only. No real payment is processed.</p><button className="button button-dark wide-button" disabled={busy}>{busy ? 'Placing order…' : 'Place order'} <ArrowUpRight size={17}/></button></form><aside className="order-summary"><span className="eyebrow">IN YOUR BAG</span><h2>Order summary</h2>{cart.map(i => <div className="summary-product" key={`${i.id}-${i.variant_id || 'standard'}`}><img
  src={imageSrc(i.image_url)}
  alt={i.name}
  onError={(e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackImage;
  }}
/> <div><b>{i.name}</b><small>{i.variant_name} · Qty {i.quantity}</small></div><span>{money(i.price * i.quantity)}</span></div>)}<div className="summary-line"><span>Subtotal</span><span>{money(total)}</span></div><div className="summary-line"><span>Shipping</span><span>{shipping ? money(shipping) : 'Free'}</span></div><div className="summary-total"><span>Total</span><strong>{money(total + shipping)}</strong></div></aside></div></main>;
}
function PasswordInput({ name, value, onChange, placeholder, error }) {
  const [visible, setVisible] = useState(false);
  return <label className="password-label">Password<div className="password-field"><input name={name} type={visible ? 'text' : 'password'} required value={value} onChange={onChange} placeholder={placeholder}/><button type="button" className="password-toggle" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>{error && <small className="field-error">{error}</small>}</label>;
}

function AuthPage({ mode }) {
  const isLogin = mode === 'login', { login } = useStore(), navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirmPassword: '', address: '', phone: '', birthday: '' }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailError, setEmailError] = useState('');
  const change = e => setForm({
    ...form,
    [e.target.name]: e.target.name === 'phone'
      ? e.target.value.replace(/\D/g, '').slice(0, 11)
      : e.target.value
  });
  const passwordError = !isLogin && form.password && !/^(?=.{8,}$)(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/.test(form.password) ? 'Use 8+ characters with an uppercase letter, number, and symbol.' : '';
  const confirmError = !isLogin && form.confirmPassword && form.password !== form.confirmPassword ? 'Passwords do not match.' : '';
  async function submit(e) { e.preventDefault(); setError(''); const invalidEmail = emailErrorMessage(form.email); setEmailError(invalidEmail); if (invalidEmail || (!isLogin && (passwordError || confirmError))) return; setBusy(true); try { const data = await api(`/auth/${isLogin ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(form) }); login(data); navigate(data.user.role === 'admin' ? '/admin' : '/shop'); } catch (e) { setError(isLogin ? 'Login failed. Email or password is incorrect.' : e.message); } finally { setBusy(false); } }
  return <main className="auth-shell"><div className="auth-art"><span className="eyebrow">WELCOME TO NORTHSTAR</span><h2>Find the good<br/>in the <em>everyday.</em></h2><p>A considered collection of things that make life feel a little more yours.</p><div className="auth-art-image"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80" alt="Store shelves"/></div></div><form className="auth-form" onSubmit={submit}><span className="eyebrow">{isLogin ? 'GOOD TO HAVE YOU BACK' : 'MAKE YOURSELF AT HOME'}</span><h1>{isLogin ? 'Welcome back.' : 'Create account.'}</h1><p className="muted">{isLogin ? 'Sign in to manage your bag and orders.' : 'Join us to save your orders and check out.'}</p><Notice message={error}/>{!isLogin && <><label>First name<input name="first_name" required minLength="2" value={form.first_name} onChange={change} placeholder="First name"/></label><label>Last name<input name="last_name" required minLength="2" value={form.last_name} onChange={change} placeholder="Last name"/></label></>}{!isLogin && <label>Phone number<input name="phone" type="tel" inputMode="numeric" pattern="[0-9]{11}" maxLength="11" required value={form.phone} onChange={change} placeholder="11-digit phone number"/></label>}{!isLogin && <label>Birthday  <input name="birthday" type="date" max={today} required value={form.birthday} onChange={change}/></label>}{!isLogin && <label>Default shipping address<textarea name="address" required minLength="8" rows="3" value={form.address} onChange={change} placeholder="House / unit, street, barangay, city, province"/></label>}    <label>Email address<input name="email" type="email" required pattern="[^@\s]+@[^@\s]+" title="Enter an email address containing @" value={form.email} onChange={change} onBlur={() => setEmailError(emailErrorMessage(form.email))} placeholder="you@example.com"/>{emailError && <small className="field-error">{emailError}</small>}{!emailError && error.toLowerCase().includes('email') && <small className="field-error">{error}</small>}</label><PasswordInput name="password" value={form.password} onChange={change} placeholder={isLogin ? 'Your password' : '8+ chars, uppercase, number, symbol'} error={passwordError}/>{!isLogin && <label className="password-label">Confirm password<div className="password-field"><input name="confirmPassword" type={showConfirm ? 'text' : 'password'} required value={form.confirmPassword} onChange={change} placeholder="Re-enter your password"/><button type="button" className="password-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}>{showConfirm ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>{confirmError && <small className="field-error">{confirmError}</small>}</label>}{isLogin && <Link className="text-link auth-forgot" to="/forgot-password">Forgot password?</Link>}<button className="button button-dark wide-button" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'} <ArrowUpRight size={17}/></button><p className="auth-switch">{isLogin ? 'New to Northstar?' : 'Already have an account?'} <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link></p>{isLogin && <p className="demo-hint">Demo admin: admin@northstar.local · Admin123!</p>}</form></main>;
}

function ForgotPassword() {
  const [email, setEmail] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  async function submit(e) { e.preventDefault(); const invalidEmail = emailErrorMessage(email); setEmailError(invalidEmail); if (invalidEmail) return; setBusy(true); setError(''); setMessage(''); try { const data = await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); setMessage(data.message); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <main className="auth-shell"><form className="auth-form auth-form-centered" onSubmit={submit}><span className="eyebrow">ACCOUNT RECOVERY</span><h1>Forgot password.</h1><p className="muted">Enter your email and we will send a secure reset link.</p><Notice message={error}/><Notice message={message} type="success"/><label>Email address<input type="email" required pattern="[^@\s]+@[^@\s]+" title="Enter an email address containing @" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => setEmailError(emailErrorMessage(email))} placeholder="you@example.com"/>{emailError && <small className="field-error">{emailError}</small>}</label><button className="button button-dark wide-button" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'} <ArrowUpRight size={17}/></button><Link className="text-link" to="/login">Back to sign in</Link></form></main>;
}

function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false), [showConfirm, setShowConfirm] = useState(false);
  const passwordError = password && !/^(?=.{8,}$)(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/.test(password) ? 'Use 8+ characters with an uppercase letter, number, and symbol.' : '';
  async function submit(e) { e.preventDefault(); if (passwordError || password !== confirmPassword) return setError(passwordError || 'Passwords do not match.'); setBusy(true); try { const data = await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password, confirmPassword }) }); setMessage(data.message); setTimeout(() => navigate('/login'), 1200); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <main className="auth-shell"><form className="auth-form auth-form-centered" onSubmit={submit}><span className="eyebrow">ACCOUNT RECOVERY</span><h1>Reset password.</h1><Notice message={error}/><Notice message={message} type="success"/><label className="password-label">New password<div className="password-field"><input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="8+ chars, uppercase, number, symbol"/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>{passwordError && <small className="field-error">{passwordError}</small>}</label><label className="password-label">Confirm password<div className="password-field"><input type={showConfirm ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password"/><button type="button" className="password-toggle" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label><button className="button button-dark wide-button" disabled={busy || !token}>{busy ? 'Saving…' : 'Reset password'} <ArrowUpRight size={17}/></button></form></main>;
}
function Orders() {
  const [orders, setOrders] = useState([]), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const { user } = useStore();
  const location = useLocation();
  useEffect(() => { api('/orders/my').then(d => setOrders(d.orders)).catch(e => setError(e.message)); }, []);
  useEffect(() => {
    if (location.state?.message) setNotice(location.state.message);
  }, [location.state]);
  if (!user) return <main className="page-shell"><div className="empty-state"><h3>Sign in to view your orders.</h3><Link to="/login" className="button button-dark">Sign in</Link></div></main>;
  return <main className="page-shell"><div className="page-heading compact-heading"><span className="eyebrow">YOUR NORTHSTAR ACCOUNT</span><h1>Order <em>history.</em></h1><p>Every order, all in one place.</p></div><Notice message={notice} type="success"/><Notice message={error}/>{!orders.length && !error ? <div className="empty-state"><ClipboardList size={30}/><h3>No orders yet.</h3><p>Your next everyday favorite is waiting.</p><Link to="/shop" className="button button-dark">Explore the shop</Link></div> : <div className="orders-list">{orders.map(o => <article className="order-card" key={o.id}><div className="order-card-head"><div><span className="eyebrow">ORDER #{String(o.id).padStart(5,'0')}</span><h3>{new Date(o.created_at).toLocaleDateString()}</h3></div><span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span></div><div className="order-products">{o.items.map((it,i) => <div key={i}><span>{it.product_name} × {it.quantity}</span><b>{money(it.line_total)}</b></div>)}</div><div className="order-card-total"><span>Total</span><strong>{money(o.total)}</strong></div><p className="muted order-address">Delivering to: {o.shipping_address}</p></article>)}</div>}</main>;
}
function generateVariantSku(productName, color, size) {
  const part = (value) => String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return [productName, color, size].map(part).filter(Boolean).join('-').slice(0, 80);
}

function Admin() {
  const [products, setProducts] = useState([]), [orders, setOrders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tab, setTab] = useState('dashboard'), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', category: 'Accessories', image_url: '', imageFile: null, colors: [], sizes: ['Standard'], variants: [{ color: '', name: 'Standard', sku: '', price: '', stock: '0', image_url: '', imageFile: null }] });
  const [colorDraft, setColorDraft] = useState(''), [sizeDraft, setSizeDraft] = useState('');
  const categories = ['Accessories', 'Electronics', 'Home', 'Fashion', 'General'];
  const { user } = useStore();
  async function refresh() { const [p, o, a] = await Promise.all([api('/products'), api('/orders'), api('/orders/admin/activity')]); setProducts(p.products); setOrders(o.orders); setActivity(a.activity); }
  useEffect(() => { if (user?.role === 'admin') refresh().catch(e => setError(e.message)); }, [user]);
  const reset = () => { setEditing(null); setColorDraft(''); setSizeDraft(''); setForm({ name: '', description: '', category: 'Accessories', image_url: '', imageFile: null, colors: [], sizes: ['Standard'], variants: [{ color: '', name: 'Standard', sku: '', price: '', stock: '0', image_url: '', imageFile: null }] }); };
  const edit = (p) => { const variants = (p.variants || []).map(({ color, name, sku, price, stock, image_url }) => ({ color: color || '', name: name || 'Standard', sku, price: String(price), stock: String(stock), image_url: image_url || '', imageFile: null })); setEditing(p.id); setColorDraft(''); setSizeDraft(''); setForm({ name: p.name, description: p.description, category: p.category, image_url: p.image_url || '', imageFile: null, colors: [...new Set(variants.map(v => v.color).filter(Boolean))], sizes: [...new Set(variants.map(v => v.name).filter(Boolean))], variants }); setTab('add-product'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  async function save(e) { e.preventDefault(); setError(''); setNotice(''); const colors = form.colors.map(c => c.trim()).filter(Boolean), sizes = form.sizes.map(s => s.trim()).filter(Boolean); if (!colors.length || !sizes.length) { setError('Configure at least one color and one size before saving.'); return; } if (form.variants.some(v => !colors.includes(v.color) || !sizes.includes(v.name))) { setError('Every variant must use a configured color and size.'); return; } const variants = form.variants.map(v => ({ ...v, sku: generateVariantSku(form.name, v.color, v.name) })); const skus = variants.map(v => v.sku); if (new Set(skus).size !== skus.length) { setError('Each color and size combination must be unique.'); return; } const body = new FormData(); body.append('name', form.name); body.append('description', form.description); body.append('category', form.category); body.append('image_url', form.imageFile ? '' : form.image_url); body.append('variants', JSON.stringify(variants.map(v => ({ color: v.color.trim(), name: v.name.trim(), sku: v.sku, price: Number(v.price), stock: Number(v.stock), image_url: v.image_url })))); form.variants.forEach((v, i) => { if (v.imageFile) body.append(`variant_image_${i}`, v.imageFile); }); if (form.imageFile) body.append('product_image', form.imageFile); try { await api(editing ? `/products/${editing}` : '/products', { method: editing ? 'PUT' : 'POST', body }); setNotice(editing ? 'Product updated.' : 'Product created.'); reset(); setTab('products'); await refresh(); } catch (e) { setError(e.message); } }
  async function remove(id) { if (!window.confirm('Delete this product?')) return; try { await api(`/products/${id}`, { method: 'DELETE' }); setNotice('Product deleted.'); await refresh(); } catch (e) { setError(e.message); } }
  async function updateStatus(id, status) { try { await api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); setNotice(`Order #${id} updated.`); await refresh(); } catch (e) { setError(e.message); } }
  const updateVariant = (index, key, value) => setForm({ ...form, variants: form.variants.map((v, i) => i === index ? { ...v, [key]: value } : v) });
  if (user?.role !== 'admin') return <main className="page-shell"><div className="empty-state"><ShieldCheck size={32}/><h3>Administrator access only.</h3><p>Sign in with an administrator account to manage the store.</p><Link to="/login" className="button button-dark">Sign in</Link></div></main>;
  const productForm = <form className="form-card admin-form" onSubmit={save}><h2>{editing ? 'Edit product' : 'Add a product'}</h2><label>Product name<input required minLength="2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>Description<textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label><label>Main product image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" required={!form.image_url} onChange={e => { const file = e.target.files?.[0] || null; setForm({ ...form, imageFile: file, image_url: file ? '' : form.image_url }); }}/>{form.image_url && !form.imageFile && <small className="muted">Current main image saved</small>}</label><label>Category<select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="" disabled>Select a category</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><div className="variant-editor"><div className="variant-editor-heading"><div><h3>Variants</h3><small className="muted">Configure at least one color and size, then choose them from each variant dropdown. SKUs are generated automatically.</small></div><button type="button" className="button button-outline" onClick={() => setForm({ ...form, variants: [...form.variants, { color: form.colors[0] || '', name: form.sizes[0] || '', sku: '', price: '', stock: '0', image_url: '', imageFile: null }] })}><Plus size={15}/> Add variant</button></div><div className="variant-config"><div className="variant-config-row"><label>New color<input value={colorDraft} onChange={e => setColorDraft(e.target.value)} placeholder="e.g. White"/></label><button type="button" className="button button-outline" onClick={() => { const value = colorDraft.trim(); if (value && !form.colors.includes(value)) setForm({ ...form, colors: [...form.colors, value], variants: form.variants.map(v => v.color ? v : { ...v, color: value }) }); setColorDraft(''); }}>Add color</button></div><div className="variant-config-row"><label>New size<input value={sizeDraft} onChange={e => setSizeDraft(e.target.value)} placeholder="e.g. Medium"/></label><button type="button" className="button button-outline" onClick={() => { const value = sizeDraft.trim(); if (value && !form.sizes.includes(value)) setForm({ ...form, sizes: [...form.sizes, value], variants: form.variants.map(v => v.name ? v : { ...v, name: value }) }); setSizeDraft(''); }}>Add size</button></div><div className="variant-options"><div><span className="muted">Colors</span>{form.colors.map(color => <button type="button" className="option-chip" key={color} onClick={() => form.colors.length > 1 && setForm({ ...form, colors: form.colors.filter(item => item !== color), variants: form.variants.map(v => v.color === color ? { ...v, color: '' } : v) })}>{color} ×</button>)}</div><div><span className="muted">Sizes</span>{form.sizes.map(size => <button type="button" className="option-chip" key={size} onClick={() => form.sizes.length > 1 && setForm({ ...form, sizes: form.sizes.filter(item => item !== size), variants: form.variants.map(v => v.name === size ? { ...v, name: '' } : v) })}>{size} ×</button>)}</div></div></div>{form.variants.map((v, i) => <div className="variant-row" key={i}><label>Color<select required value={v.color} onChange={e => updateVariant(i, 'color', e.target.value)}><option value="" disabled>Select color</option>{form.colors.map(color => <option key={color} value={color}>{color}</option>)}</select></label><label>Name / size<select required value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)}><option value="" disabled>Select size</option>{form.sizes.map(size => <option key={size} value={size}>{size}</option>)}</select></label><label>SKU<input readOnly value={generateVariantSku(form.name, v.color, v.name)} placeholder="Generated automatically"/></label><label>Price<input type="number" min="0" step="0.01" required value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)}/></label><label>Stock<input type="number" min="0" step="1" required value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)}/></label><label>Variant image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" required={!v.image_url} onChange={e => { const file = e.target.files?.[0] || null; setForm({ ...form, variants: form.variants.map((item, j) => j === i ? { ...item, imageFile: file, image_url: file ? '' : item.image_url } : item) }); }}/>{v.image_url && !v.imageFile && <small className="muted">Current image saved</small>}</label>{form.variants.length > 1 && <button type="button" className="remove-button" onClick={() => setForm({ ...form, variants: form.variants.filter((_, j) => j !== i) })}><Trash2 size={15}/> Remove</button>}</div>)}</div><button className="button button-dark wide-button">{editing ? 'Save changes' : 'Add product'} <ArrowUpRight size={17}/></button>{editing && <button type="button" className="button button-outline wide-button" onClick={() => { reset(); setTab('products'); }}>Cancel edit</button>}</form>;
  return <main className="page-shell admin-shell"><div className="page-heading compact-heading"><span className="eyebrow">STORE CONTROL</span><h1>Admin <em>studio.</em></h1><p>Manage your catalog and keep orders moving.</p></div><div className="admin-stats"><div><span>PRODUCTS</span><b>{products.length}</b></div><div><span>ORDERS</span><b>{orders.length}</b></div><div><span>REVENUE ON RECORDED ORDERS</span><b>{money(orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + Number(o.total), 0))}</b></div><div><span>LOW STOCK</span><b>{products.filter(p => p.low_stock).length}</b></div></div><div className="admin-tabs"><button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}><LayoutDashboard size={16}/> Dashboard</button><button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><ShoppingBag size={16}/> Products</button><button className={tab === 'add-product' ? 'active' : ''} onClick={() => { reset(); setTab('add-product'); }}><Plus size={16}/> Add product</button><button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><ClipboardList size={16}/> Orders</button></div><Notice message={error}/><Notice message={notice} type="success"/>{tab === 'dashboard' && <div className="admin-dashboard"><section className="admin-product-list"><h2>Low-stock products <span>{products.filter(p => p.low_stock).length} items</span></h2>{products.filter(p => p.low_stock).length ? products.filter(p => p.low_stock).map(p => <div className="admin-product" key={p.id}><img src={imageSrc(p.image_url)} alt={p.name}/><div><b>{p.name}</b><small>{p.stock} remaining · threshold {p.low_stock_threshold}</small></div><strong className="status status-pending">Low stock</strong></div>) : <p className="muted">All products have healthy stock levels.</p>}</section><section className="admin-product-list"><h2>Recent activity <span>{activity.length} events</span></h2>{activity.length ? activity.slice(0, 10).map(item => <div className="activity-row" key={item.id}><div><b>{item.action}</b><small>{item.details} · {item.admin_name}</small></div><time>{new Date(item.created_at).toLocaleString()}</time></div>) : <p className="muted">No admin activity recorded yet.</p>}</section></div>}{tab === 'products' && <div className="admin-product-list"><h2>Product catalog <span>{products.length} items</span></h2>{products.map(p => <div className="admin-product" key={p.id}><img src={imageSrc(p.image_url)} alt={p.name}/><div><b>{p.name}</b><small>{p.category} · {p.variants?.length || 1} variants · {p.stock} in stock {p.low_stock && <strong className="status status-pending">Low stock</strong>}</small><strong>{money(p.price)}</strong></div><div className="admin-row-actions"><button onClick={() => edit(p)} aria-label={`Edit ${p.name}`}><Pencil size={16}/></button><button onClick={() => remove(p.id)} aria-label={`Delete ${p.name}`}><Trash2 size={16}/></button></div></div>)}</div>  }{tab === 'add-product' && <div className="admin-layout admin-form-layout">{productForm}</div>}{tab === 'orders' && <div className="admin-orders"><h2>All orders <span>{orders.length} orders</span></h2>{!orders.length ? <div className="empty-state"><p>No orders have been placed yet.</p></div> : orders.map(o => <article className="order-card" key={o.id}><div className="order-card-head"><div><span className="eyebrow">ORDER #{String(o.id).padStart(5, '0')}</span><h3>{o.customer_name}</h3><p className="muted">{o.email} · {new Date(o.created_at).toLocaleString()}</p></div><strong>{money(o.total)}</strong></div><p className="order-address">{o.shipping_address} · {o.phone}</p><div className="order-products">{o.items.map((it, i) => <div key={i}><span>{it.product_name} × {it.quantity}</span><b>{money(it.line_total)}</b></div>)}</div><div className="admin-status-row"><span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span><label>Update status <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}>{['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(s => <option key={s}>{s}</option>)}</select></label></div></article>)}</div>}</main>;
}
function Profile() {
  const { user, updateUser } = useStore();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birthday: user?.birthday ? String(user.birthday).slice(0, 10) : ''
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [picture, setPicture] = useState(null);
  const [preview, setPreview] = useState(user?.profile_picture || '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({
    label: 'Address',
    recipient_name: user?.name || '',
    phone: user?.phone || '',
    address_line: '',
    is_default: false
  });
  const [editingAddress, setEditingAddress] = useState(null);

  useEffect(() => {
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      birthday: user?.birthday ? String(user.birthday).slice(0, 10) : ''
    });
    setPreview(user?.profile_picture || '');
    if (user?.role !== 'admin') {
      api('/auth/addresses').then((data) => setAddresses(data.addresses)).catch((err) => setError(err.message));
    } else {
      setAddresses([]);
    }
  }, [user]);

  const resetAddressForm = () => {
    setEditingAddress(null);
    setAddressForm({
      label: 'Address',
      recipient_name: user?.name || '',
      phone: user?.phone || '',
      address_line: '',
      is_default: addresses.length === 0
    });
  };

  async function saveAddress(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const data = await api(
        editingAddress ? `/auth/addresses/${editingAddress}` : '/auth/addresses',
        { method: editingAddress ? 'PUT' : 'POST', body: JSON.stringify(addressForm) }
      );
      if (editingAddress) {
        setAddresses(addresses.map((item) => item.id === data.address.id ? data.address : item));
      } else {
        setAddresses([...addresses, data.address]);
      }
      resetAddressForm();
      setNotice(editingAddress ? 'Address updated.' : 'Address added.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAddress(id) {
    if (!window.confirm('Delete this saved address?')) return;
    try {
      await api(`/auth/addresses/${id}`, { method: 'DELETE' });
      const data = await api('/auth/addresses');
      setAddresses(data.addresses);
      if (editingAddress === id) resetAddressForm();
      setNotice('Address deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function makeDefaultAddress(id) {
    try {
      await api(`/auth/addresses/${id}/default`, { method: 'PATCH' });
      const data = await api('/auth/addresses');
      setAddresses(data.addresses);
      setNotice('Default address updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);

    try {
      const data = await api('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      updateUser(data.user);
      setNotice('Your profile has been updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (newPassword.length < 8) {
      setError('Your new password must contain at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      const data = await api('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice(data.message || 'Your password has been changed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadPicture(e) {
    e.preventDefault();
    if (!picture) {
      setError('Please choose an image first.');
      return;
    }

    setError('');
    setNotice('');
    setBusy(true);

    try {
      const body = new FormData();
      body.append('profile_picture', picture);

      const data = await api('/auth/profile-picture', {
        method: 'POST',
        body
      });
      updateUser(data.user);
      setPreview(data.user.profile_picture || '');
      setPicture(null);
      setNotice('Your profile picture has been updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <main className="page-shell">
        <div className="empty-state">
          <UserRound size={32} />
          <h3>Sign in to view your profile.</h3>
          <Link to="/login" className="button button-dark">Sign in</Link>
        </div>
      </main>
    );
  }

  const pictureUrl = preview
    ? preview.startsWith('http')
      ? preview
      : `http://localhost:5000${preview}`
    : '';

  return (
    <main className="page-shell">
      <div className="page-heading compact-heading">
        <span className="eyebrow">YOUR NORTHSTAR ACCOUNT</span>
        <h1>My <em>profile.</em></h1>
        <p>Manage your details and keep your account up to date.</p>
      </div>

      <Notice message={error} />
      <Notice message={notice} type="success" />

      <div className="profile-layout">
        {user.role !== 'admin' && <section className="form-card profile-addresses">
          <h2>Saved addresses</h2>
          <p className="muted">Manage the addresses available during checkout.</p>
          {!addresses.length && <p className="muted">No saved addresses yet.</p>}
          {addresses.map((address) => (
            <div className="saved-address" key={address.id}>
              <div>
                <b>{address.label} {address.is_default && <small className="status status-delivered">Default</small>}</b>
                <p>{address.recipient_name} · {address.phone}</p>
                <p className="muted">{address.address_line}</p>
              </div>
              <div className="admin-row-actions">
                {!address.is_default && <button type="button" onClick={() => makeDefaultAddress(address.id)}>Default</button>}
                <button type="button" onClick={() => { setEditingAddress(address.id); setAddressForm(address); }}>Edit</button>
                <button type="button" onClick={() => deleteAddress(address.id)}>Delete</button>
              </div>
            </div>
          ))}
          <form onSubmit={saveAddress}>
            <h3>{editingAddress ? 'Edit address' : 'Add address'}</h3>
            <label>Label<input required maxLength="80" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} placeholder="Home, Work, etc."/></label>
            <label>Recipient name<input required minLength="2" maxLength="120" value={addressForm.recipient_name} onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}/></label>
            <label>Phone number<input required inputMode="numeric" pattern="[0-9]{11}" maxLength="11" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}/></label>
            <label>Complete address<textarea required minLength="8" maxLength="500" rows="3" value={addressForm.address_line} onChange={(e) => setAddressForm({ ...addressForm, address_line: e.target.value })}/></label>
            <label className="checkbox-label"><input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}/> Set as default address</label>
            <button className="button button-dark wide-button" disabled={busy}>{editingAddress ? 'Save address' : 'Add address'}</button>
            {editingAddress && <button type="button" className="button button-outline wide-button" onClick={resetAddressForm}>Cancel</button>}
          </form>
        </section>}

        <section className="form-card profile-card">
          <div className="profile-avatar">
            {pictureUrl ? (
              <img
                src={pictureUrl}
                alt="Profile"
                onError={() => setPreview('')}
              />
            ) : (
              <UserRound size={44} />
            )}
          </div>

          <h2>Profile picture</h2>
          <p className="muted">Choose a JPG, PNG, or WebP image up to 2 MB.</p>

          <form onSubmit={uploadPicture}>
            <label>
              <Camera size={16} /> Choose image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setPicture(file);
                  if (file) setPreview(URL.createObjectURL(file));
                }}
              />
            </label>
            {picture && <p className="muted">{picture.name}</p>}
            <button className="button button-dark wide-button" disabled={busy || !picture}>
              Upload picture <Camera size={17} />
            </button>
          </form>
        </section>

        <section className="form-card profile-details">
          <h2>Personal information</h2>
          <p className="muted">Update the details connected to your account.</p>

          <form onSubmit={saveProfile}>
            <label>
              First name
              <input
                name="first_name"
                required
                minLength="2"
                maxLength="120"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </label>

            <label>
              Last name
              <input
                name="last_name"
                required
                minLength="2"
                maxLength="80"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </label>

            <label>
              Email address
              <input
                name="email"
                type="email"
                pattern="[^@\s]+@[^@\s]+"
                title="Enter an email address containing @"
                required
                maxLength="255"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <label>
              Phone number
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength="11"
                required
                minLength="11"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
              />
            </label>

            <label>
              Birthday
              <input
                type="date"
                max={today}
                required
                value={form.birthday}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              />
            </label>

            <button className="button button-dark wide-button" disabled={busy}>
              Save changes <Save size={17} />
            </button>
          </form>
        </section>

        <section className="form-card profile-security">
          <h2><LockKeyhole size={20} /> Change password</h2>
          <p className="muted">Verify your current password before choosing a new one.</p>

          <form onSubmit={changePassword}>
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>

            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength="8"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>

            <label>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength="8"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            <button className="button button-dark wide-button" disabled={busy}>
              Change password <LockKeyhole size={17} />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function NotFound() { return <main className="page-shell empty-state"><h1>That page wandered off.</h1><p>Let's get you back to the good stuff.</p><Link to="/" className="button button-dark">Back home</Link></main>; }

export default function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
