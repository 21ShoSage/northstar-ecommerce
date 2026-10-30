import React, { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ShoppingBag, Search, ArrowUpRight, Plus, Minus, Trash2, Menu, X, PackageCheck, ShieldCheck, Leaf, Truck, LogOut, UserRound, LayoutDashboard, ClipboardList, Pencil, CircleCheck, AlertCircle, Camera, LockKeyhole, Save } from 'lucide-react';
import { api, money } from './api.js';
import { useStore } from './store.jsx';

function Notice({ message }) {
  if (!message) return null;

  return (
    <div className="notice" role="alert">
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
function Header() {
  const { user, logout, cart } = useStore();
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="nav-wrap">
      <Link to="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark">N</span><span>NORTHSTAR<span className="brand-sub">GOODS FOR EVERYDAY</span></span></Link>
      <button className="mobile-menu icon-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X/> : <Menu/>}</button>
      <nav className={open ? 'nav-links open' : 'nav-links'}>
        <NavLink to="/shop" onClick={() => setOpen(false)}>Shop all</NavLink>
        {user?.role === 'admin' && <NavLink to="/admin" onClick={() => setOpen(false)}>Admin</NavLink>}
        {user && <NavLink to="/profile" onClick={() => setOpen(false)}>My Profile</NavLink>}
        {user && <NavLink to="/orders" onClick={() => setOpen(false)}>My orders</NavLink>}
        <Link to="/cart" className="cart-link" onClick={() => setOpen(false)}><ShoppingBag size={17}/> Bag <span className="cart-count">{cart.reduce((s, x) => s + x.quantity, 0)}</span></Link>
        
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
    </div>
  </header>;
}
function Footer() {
  return <footer className="footer"><div className="footer-inner"><Link to="/" className="brand footer-brand"><span className="brand-mark">N</span><span>NORTHSTAR<span className="brand-sub">GOODS FOR EVERYDAY</span></span></Link><p>Thoughtful finds. Everyday favorites.</p><span>© {new Date().getFullYear()} Northstar Store</span></div></footer>;
}
function ProductCard({ product, index = 0 }) {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);
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
    <div className="product-info"><Link to={`/product/${product.id}`} className="product-name">{product.name}</Link><div className="product-bottom"><span className="price">{money(product.price)}</span><button className={`add-button ${added ? 'added' : ''}`} aria-label={`Add ${product.name} to bag`} disabled={product.stock < 1} onClick={() => { addToCart(product); setAdded(true); setTimeout(() => setAdded(false), 1000); }}>{added ? <CircleCheck size={17}/> : <Plus size={17}/>}</button></div><span className="stock-note">{product.stock > 0 ? `${product.stock} in stock` : 'Currently sold out'}</span></div>
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
  const categories = ['All', ...new Set(products.map(p => p.category))];
  return <main className="page-shell"><div className="page-heading"><span className="eyebrow">THE COLLECTION</span><h1>Shop <em>all.</em></h1><p>Useful things, considered carefully.</p></div><div className="shop-tools"><label className="search-box"><Search size={18}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products..." aria-label="Search products"/></label><div className="category-pills">{categories.map(c => <button key={c} className={category === c ? 'pill active' : 'pill'} onClick={() => setCategory(c)}>{c}</button>)}</div></div><Notice message={error}/>{loading ? <div className="loading">Finding good things…</div> : products.length ? <div className="product-grid shop-grid">{products.map((p,i) => <ProductCard key={p.id} product={p} index={i}/>)}</div> : <div className="empty-state"><ShoppingBag size={28}/><h3>Nothing found just yet.</h3><p>Try another search or choose a different category.</p><button className="button button-dark" onClick={() => { setQ(''); setCategory('All'); }}>Clear filters</button></div>}</main>;
}

function ProductDetail() {
  const { id } = useParamsSafe();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const { addToCart } = useStore();

  useEffect(() => {
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

  return (
    <main className="page-shell">
      <Link to="/shop" className="back-link">
        ← Back to collection
      </Link>

      <div className="detail-layout">
        <div className="detail-image">
          <img
            src={imageSrc(product.image_url)}
            alt={product.name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackImage;
            }}
          />
        </div>

        <div className="detail-copy">
          <span className="eyebrow">{product.category}</span>
          <h1>{product.name}</h1>
          <span className="detail-price">{money(product.price)}</span>
          <p>{product.description}</p>

          <p className="stock-note">
            {product.stock > 0
              ? `${product.stock} available`
              : 'Currently sold out'}
          </p>

          <button
            className="button button-dark wide-button"
            disabled={product.stock < 1}
            onClick={() => addToCart(product)}
          >
            Add to bag <ShoppingBag size={17} />
          </button>

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
  return <main className="page-shell"><div className="page-heading compact-heading"><span className="eyebrow">YOUR SELECTION</span><h1>Your <em>bag.</em></h1></div>{!cart.length ? <div className="empty-state"><ShoppingBag size={30}/><h3>Your bag is taking a little break.</h3><p>Find something useful for your everyday.</p><Link to="/shop" className="button button-dark">Explore the shop <ArrowUpRight size={17}/></Link></div> : <div className="cart-layout"><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><img
  src={imageSrc(item.image_url)}
  alt={item.name}
  onError={(e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackImage;
  }}
/><div className="cart-item-info"><span className="eyebrow">{item.category}</span><h3>{item.name}</h3><span>{money(item.price)}</span><div className="quantity-control"><button onClick={() => item.quantity === 1 ? removeFromCart(item.id) : setQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity"><Minus size={14}/></button><span>{item.quantity}</span><button onClick={() => setQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Increase quantity"><Plus size={14}/></button></div></div><div className="cart-item-end"><b>{money(item.price * item.quantity)}</b><button className="remove-button" onClick={() => removeFromCart(item.id)}><Trash2 size={15}/> Remove</button></div></div>)}</div><aside className="order-summary"><span className="eyebrow">THE TOTAL</span><h2>Order summary</h2><div className="summary-line"><span>Subtotal</span><span>{money(total)}</span></div><div className="summary-line"><span>Shipping</span><span>Calculated at checkout</span></div><div className="summary-total"><span>Estimated total</span><strong>{money(total)}</strong></div><Link className="button button-dark wide-button" to="/checkout">Continue to checkout <ArrowUpRight size={17}/></Link><p className="summary-note">Checkout creates an order for this demo store. No payment is charged.</p></aside></div>}</main>;
}
function Checkout() {
  const { cart, clearCart, user } = useStore(), navigate = useNavigate();
  const [form, setForm] = useState({ customer_name: user?.name || '', shipping_address: '', phone: '' }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const total = cart.reduce((s, x) => s + x.price * x.quantity, 0);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setError('');
    if (!cart.length) return setError('Your bag is empty.');
    setBusy(true);
    try { const d = await api('/orders', { method: 'POST', body: JSON.stringify({ ...form, items: cart.map(x => ({ product_id: x.id, quantity: x.quantity })) }) }); clearCart(); navigate('/orders', { state: { message: d.message } }); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!user) return <main className="page-shell"><div className="empty-state"><UserRound size={30}/><h3>Sign in to check out</h3><p>Your orders will be saved to your account.</p><Link to="/login" className="button button-dark">Sign in or create account</Link></div></main>;
  if (!cart.length) return <main className="page-shell"><div className="empty-state"><h3>Your bag is empty.</h3><Link to="/shop" className="text-link">Return to shop →</Link></div></main>;
  return <main className="page-shell"><div className="page-heading compact-heading"><span className="eyebrow">ALMOST YOURS</span><h1>Checkout <em>details.</em></h1></div><div className="checkout-layout"><form className="form-card" onSubmit={submit}><h2>Shipping information</h2><p className="muted">Where should we send your order?</p><Notice message={error}/><label>Full name<input name="customer_name" required minLength="2" value={form.customer_name} onChange={change} placeholder="Your full name"/></label><label>Phone number<input name="phone" required minLength="7" value={form.phone} onChange={change} placeholder="09XX XXX XXXX"/></label><label>Complete shipping address<textarea name="shipping_address" required minLength="8" rows="4" value={form.shipping_address} onChange={change} placeholder="House / unit, street, barangay, city, province"/></label><button className="button button-dark wide-button" disabled={busy}>{busy ? 'Placing order…' : 'Place demo order'} <ArrowUpRight size={17}/></button><p className="summary-note">Demo checkout only; no real payment is collected.</p></form><aside className="order-summary"><span className="eyebrow">IN YOUR BAG</span><h2>Order summary</h2>{cart.map(i => <div className="summary-product" key={i.id}><img
  src={imageSrc(i.image_url)}
  alt={i.name}
  onError={(e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackImage;
  }}
/><div><b>{i.name}</b><small>Qty {i.quantity}</small></div><span>{money(i.price * i.quantity)}</span></div>)}<div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div></aside></div></main>;
}
function AuthPage({ mode }) {
  const isLogin = mode === 'login', { login } = useStore(), navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) { e.preventDefault(); setError(''); setBusy(true); try { const data = await api(`/auth/${isLogin ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(form) }); login(data); navigate(data.user.role === 'admin' ? '/admin' : '/shop'); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <main className="auth-shell"><div className="auth-art"><span className="eyebrow">WELCOME TO NORTHSTAR</span><h2>Find the good<br/>in the <em>everyday.</em></h2><p>A considered collection of things that make life feel a little more yours.</p><div className="auth-art-image"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80" alt="Store shelves"/></div></div><form className="auth-form" onSubmit={submit}><span className="eyebrow">{isLogin ? 'GOOD TO HAVE YOU BACK' : 'MAKE YOURSELF AT HOME'}</span><h1>{isLogin ? 'Welcome back.' : 'Create account.'}</h1><p className="muted">{isLogin ? 'Sign in to manage your bag and orders.' : 'Join us to save your orders and check out.'}</p><Notice message={error}/>{!isLogin && <label>Full name<input name="name" required minLength="2" value={form.name} onChange={change} placeholder="Your name"/></label>}<label>Email address<input name="email" type="email" required value={form.email} onChange={change} placeholder="you@example.com"/></label><label>Password<input name="password" type="password" minLength={isLogin ? undefined : 8} required value={form.password} onChange={change} placeholder={isLogin ? 'Your password' : 'At least 8 characters'}/></label><button className="button button-dark wide-button" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'} <ArrowUpRight size={17}/></button><p className="auth-switch">{isLogin ? 'New to Northstar?' : 'Already have an account?'} <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link></p>{isLogin && <p className="demo-hint">Demo admin: admin@northstar.local · Admin123!</p>}</form></main>;
}
function Orders() {
  const [orders, setOrders] = useState([]), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const { user } = useStore();
  useEffect(() => { api('/orders/my').then(d => setOrders(d.orders)).catch(e => setError(e.message)); }, []);
  if (!user) return <main className="page-shell"><div className="empty-state"><h3>Sign in to view your orders.</h3><Link to="/login" className="button button-dark">Sign in</Link></div></main>;
  return <main className="page-shell"><div className="page-heading compact-heading"><span className="eyebrow">YOUR NORTHSTAR ACCOUNT</span><h1>Order <em>history.</em></h1><p>Every order, all in one place.</p></div><Notice message={notice} type="success"/><Notice message={error}/>{!orders.length && !error ? <div className="empty-state"><ClipboardList size={30}/><h3>No orders yet.</h3><p>Your next everyday favorite is waiting.</p><Link to="/shop" className="button button-dark">Explore the shop</Link></div> : <div className="orders-list">{orders.map(o => <article className="order-card" key={o.id}><div className="order-card-head"><div><span className="eyebrow">ORDER #{String(o.id).padStart(5,'0')}</span><h3>{new Date(o.created_at).toLocaleDateString()}</h3></div><span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span></div><div className="order-products">{o.items.map((it,i) => <div key={i}><span>{it.product_name} × {it.quantity}</span><b>{money(it.line_total)}</b></div>)}</div><div className="order-card-total"><span>Total</span><strong>{money(o.total)}</strong></div><p className="muted order-address">Delivering to: {o.shipping_address}</p></article>)}</div>}</main>;
}
function Admin() {
  const [products, setProducts] = useState([]), [orders, setOrders] = useState([]), [tab, setTab] = useState('products'), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null), [form, setForm] = useState({ name:'',description:'',category:'Accessories',price:'',image_url:'',stock:'0' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const { user } = useStore();
  async function refresh() { const [p,o] = await Promise.all([api('/products'),api('/orders')]); setProducts(p.products); setOrders(o.orders); }
  useEffect(() => { if (user?.role === 'admin') refresh().catch(e => setError(e.message)); }, [user]);
  if (user?.role !== 'admin') return <main className="page-shell"><div className="empty-state"><ShieldCheck size={32}/><h3>Administrator access only.</h3><p>Sign in with an administrator account to manage the store.</p><Link to="/login" className="button button-dark">Sign in</Link></div></main>;
  const reset = () => {
  setEditing(null);
  setForm({
    name: '',
    description: '',
    category: 'Accessories',
    price: '',
    image_url: '',
    stock: '0',
  });
  setImageFile(null);
  setImagePreview('');
};

const edit = (p) => {
  setEditing(p.id);
  setForm({
    name: p.name,
    description: p.description,
    category: p.category,
    price: p.price,
    image_url: p.image_url || '',
    stock: String(p.stock),
  });
  setImageFile(null);
  setImagePreview(p.image_url || '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
  
async function save(e) {
  e.preventDefault();
  setError('');
  setNotice('');

  const body = new FormData();
  body.append('name', form.name);
  body.append('description', form.description);
  body.append('category', form.category);
  body.append('price', String(Number(form.price)));
  body.append('stock', String(Number(form.stock)));
  body.append('image_url', imageFile ? '' : form.image_url);

  if (imageFile) {
    body.append('product_image', imageFile);
  }

  try {
    await api(editing ? `/products/${editing}` : '/products', {
      method: editing ? 'PUT' : 'POST',
      body,
    });

    setNotice(editing ? 'Product updated.' : 'Product created.');
    reset();
    await refresh();
  } catch (e) {
    setError(e.message);
  }
}

  async function remove(id) { if (!window.confirm('Delete this product?')) return; try { await api(`/products/${id}`,{method:'DELETE'}); setNotice('Product deleted.'); await refresh(); } catch(e) { setError(e.message); } }
  async function updateStatus(id,status) { try { await api(`/orders/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}); setNotice(`Order #${id} updated.`); await refresh(); } catch(e) { setError(e.message); } }
  return <main className="page-shell admin-shell"><div className="page-heading compact-heading"><span className="eyebrow">STORE CONTROL</span><h1>Admin <em>studio.</em></h1><p>Manage your catalog and keep orders moving.</p></div><div className="admin-stats"><div><span>PRODUCTS</span><b>{products.length}</b></div><div><span>ORDERS</span><b>{orders.length}</b></div><div><span>REVENUE ON RECORDED ORDERS</span><b>{money(orders.filter(o=>o.status!=='Cancelled').reduce((s,o)=>s+Number(o.total),0))}</b></div></div><div className="admin-tabs"><button className={tab==='products'?'active':''} onClick={()=>setTab('products')}><ShoppingBag size={16}/> Products</button><button className={tab==='orders'?'active':''} onClick={()=>setTab('orders')}><ClipboardList size={16}/> Orders</button></div><Notice message={error}/><Notice message={notice} type="success"/>{tab==='products' ? <div className="admin-layout"><form className="form-card admin-form" onSubmit={save}><h2>{editing ? 'Edit product' : 'Add a product'}</h2><label>Product name<input required minLength="2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Description<textarea rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="form-row"><label>Category<input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>Price (PHP)<input type="number" min="0" step="0.01" required value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label></div>
<label>
  Product image (optional)
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif"
    onChange={(e) => {
      const file = e.target.files?.[0] || null;

      if (file && file.size > 5 * 1024 * 1024) {
        setError('Image must be 5 MB or smaller.');
        e.target.value = '';
        setImageFile(null);
        return;
      }

      setError('');
      setImageFile(file);

      if (file) {
        setImagePreview(URL.createObjectURL(file));
      }
    }}
  />
</label>

{imagePreview && (
  <div className="admin-image-preview">
    <img
      src={
        imagePreview.startsWith('http') ||
        imagePreview.startsWith('blob:')
          ? imagePreview
          : `http://localhost:5000${imagePreview}`
      }
      alt="Product preview"
    />
  </div>
)}
<label>Stock quantity<input type="number" min="0" step="1" required value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label><button className="button button-dark wide-button">{editing ? 'Save changes':'Add product'} <ArrowUpRight size={17}/></button>{editing && <button type="button" className="button button-outline wide-button" onClick={reset}>Cancel edit</button>}</form><div className="admin-product-list"><h2>Product catalog <span>{products.length} items</span></h2>{products.map(p=><div className="admin-product" key={p.id}>
<img
  src={imageSrc(p.image_url)}
  alt={p.name}
  onError={(e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackImage;
  }}
/>
<div><b>{p.name}</b><small>{p.category} · {p.stock} in stock</small><strong>{money(p.price)}</strong></div><div className="admin-row-actions"><button onClick={()=>edit(p)} aria-label={`Edit ${p.name}`}><Pencil size={16}/></button><button onClick={()=>remove(p.id)} aria-label={`Delete ${p.name}`}><Trash2 size={16}/></button></div></div>)}</div></div> : <div className="admin-orders"><h2>All orders <span>{orders.length} orders</span></h2>{!orders.length ? <div className="empty-state"><p>No orders have been placed yet.</p></div> : orders.map(o=><article className="order-card" key={o.id}><div className="order-card-head"><div><span className="eyebrow">ORDER #{String(o.id).padStart(5,'0')}</span><h3>{o.customer_name}</h3><p className="muted">{o.email} · {new Date(o.created_at).toLocaleString()}</p></div><strong>{money(o.total)}</strong></div><p className="order-address">{o.shipping_address} · {o.phone}</p><div className="order-products">{o.items.map((it,i)=><div key={i}><span>{it.product_name} × {it.quantity}</span><b>{money(it.line_total)}</b></div>)}</div><div className="admin-status-row"><span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span><label>Update status <select value={o.status} onChange={e=>updateStatus(o.id,e.target.value)}>{['Pending','Processing','Shipped','Delivered','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></label></div></article>)}</div>}</main>;
}

function Profile() {
  const { user, updateUser } = useStore();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [picture, setPicture] = useState(null);
  const [preview, setPreview] = useState(user?.profile_picture || '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || '',
      email: user?.email || ''
    });
    setPreview(user?.profile_picture || '');
  }, [user]);

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
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setCurrentPassword('');
      setNewPassword('');
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

        <section className="form-card">
          <h2>Personal information</h2>
          <p className="muted">Update the details connected to your account.</p>

          <form onSubmit={saveProfile}>
            <label>
              Full name
              <input
                name="name"
                required
                minLength="2"
                maxLength="120"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                maxLength="255"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <button className="button button-dark wide-button" disabled={busy}>
              Save changes <Save size={17} />
            </button>
          </form>
        </section>

        <section className="form-card">
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
        <Route path="/profile" element={<Profile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
