import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const money = (value = 0) => new Intl.NumberFormat('fa-IR').format(Number(value || 0)) + ' تومان'

function EmptyImage({ name }) {
  return <div className="product-fallback"><span>{name?.slice(0, 2) || 'AV'}</span></div>
}

function ProductCard({ product, mode, selectedVariant, onVariant, onAdd }) {
  const variants = product.product_variants || []
  const price = mode === 'wholesale' ? (product.wholesale_price ?? product.single_price) : product.single_price
  return (
    <article className="product-card">
      <div className="product-media">
        {product.image ? <img src={product.image} alt={product.name} /> : <EmptyImage name={product.name} />}
        {product.featured && <span className="badge">منتخب AVENZA</span>}
      </div>
      <div className="product-body">
        <div className="product-meta">{product.category || 'کالکشن جدید'}</div>
        <h3>{product.name}</h3>
        <p className="description">{product.description || 'طراحی مینیمال، مناسب استایل روزمره.'}</p>
        <div className="price-line"><strong>{money(price)}</strong><span>{mode === 'wholesale' ? 'قیمت عمده' : 'قیمت تکی'}</span></div>
        {variants.length > 0 && (
          <select value={selectedVariant || variants[0]?.id || ''} onChange={(e) => onVariant(product.id, e.target.value)}>
            {variants.map((v) => <option key={v.id} value={v.id}>{[v.color, v.size].filter(Boolean).join(' / ')} — موجودی {v.stock}</option>)}
          </select>
        )}
        <button className="primary full" onClick={() => onAdd(product)}>افزودن به سبد</button>
      </div>
    </article>
  )
}

function CartDrawer({ open, cart, mode, onClose, onQty, onCheckout }) {
  const total = cart.reduce((sum, item) => sum + item.quantity * (mode === 'wholesale' ? (item.product.wholesale_price ?? item.product.single_price) : item.product.single_price), 0)
  return (
    <div className={open ? 'drawer-wrap open' : 'drawer-wrap'}>
      <button className="drawer-backdrop" onClick={onClose} aria-label="بستن" />
      <aside className="drawer">
        <div className="drawer-head"><h3>سبد خرید</h3><button className="icon-btn" onClick={onClose}>×</button></div>
        <div className="drawer-items">
          {cart.length === 0 && <div className="empty">سبد خرید هنوز خالی است.</div>}
          {cart.map((item) => (
            <div className="cart-row" key={item.key}>
              <div><strong>{item.product.name}</strong><small>{[item.variant?.color, item.variant?.size].filter(Boolean).join(' / ')}</small></div>
              <div className="qty"><button onClick={() => onQty(item.key, -1)}>−</button><span>{item.quantity}</span><button onClick={() => onQty(item.key, 1)}>+</button></div>
            </div>
          ))}
        </div>
        <div className="drawer-foot"><div className="total"><span>جمع سفارش</span><strong>{money(total)}</strong></div><button className="primary full" disabled={!cart.length} onClick={onCheckout}>ادامه ثبت سفارش</button><p>پرداخت آنلاین فعلاً فعال نیست؛ سفارش ثبت می‌شود و برای هماهنگی با شما تماس گرفته می‌شود.</p></div>
      </aside>
    </div>
  )
}

function CheckoutModal({ open, cart, mode, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  if (!open) return null

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMessage('')
    const items = cart.map((item) => ({ product_id: item.product.id, variant_id: item.variant?.id || null, quantity: item.quantity }))
    const { data, error } = await supabase.rpc('place_order', { p_name: form.name, p_phone: form.phone, p_address: form.address, p_order_type: mode, p_items: items })
    if (error) setMessage('ثبت سفارش انجام نشد. لطفاً اطلاعات را بررسی و دوباره تلاش کنید.')
    else { setMessage(`سفارش شماره ${data} با موفقیت ثبت شد.`); setTimeout(() => onSuccess(data), 900) }
    setBusy(false)
  }

  return <div className="modal-shell"><div className="modal-card"><div className="drawer-head"><h3>ثبت سفارش</h3><button className="icon-btn" onClick={onClose}>×</button></div><form onSubmit={submit} className="form-grid"><label>نام و نام خانوادگی<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>شماره تماس<input required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="wide">آدرس<textarea required rows="4" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><div className="notice wide">نوع سفارش: <strong>{mode === 'wholesale' ? 'عمده' : 'تکی'}</strong> — بدون درگاه پرداخت</div>{message && <div className="status wide">{message}</div>}<button className="primary wide" disabled={busy}>{busy ? 'در حال ثبت...' : 'ثبت نهایی سفارش'}</button></form></div></div>
}

function WholesaleForm() {
  const [form, setForm] = useState({ name: '', shop: '', phone: '', count: '' })
  const [message, setMessage] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setMessage('در حال ثبت...')
    const { error } = await supabase.from('wholesale_requests').insert({ name: form.name, shop: form.shop, phone: form.phone, count: Number(form.count || 0) || null })
    if (error) setMessage('خطا در ثبت درخواست. دوباره تلاش کنید.')
    else { setMessage('درخواست همکاری عمده ثبت شد.'); setForm({ name: '', shop: '', phone: '', count: '' }) }
  }
  return <form className="wholesale-form" onSubmit={submit}><input required placeholder="نام و نام خانوادگی" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input placeholder="نام فروشگاه" value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })} /><input required placeholder="شماره تماس" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><input type="number" min="1" placeholder="تعداد تقریبی" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} /><button className="dark">ثبت درخواست همکاری</button>{message && <span className="form-message">{message}</span>}</form>
}

function AdminPanel({ onClose }) {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [authMessage, setAuthMessage] = useState('')
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [requests, setRequests] = useState([])
  const [products, setProducts] = useState([])
  const [newProduct, setNewProduct] = useState({ name: '', category: '', description: '', single_price: '', wholesale_price: '', color: '', size: '', stock: '0' })
  const [file, setFile] = useState(null)

  const refreshAdmin = async () => {
    const [o, r, p] = await Promise.all([
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      supabase.from('wholesale_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*, product_variants(*)').order('created_at', { ascending: false })
    ])
    setOrders(o.data || []); setRequests(r.data || []); setProducts(p.data || [])
  }

  const checkAdmin = async (currentSession) => {
    setSession(currentSession)
    if (!currentSession) { setIsAdmin(false); return }
    const { data } = await supabase.rpc('is_admin')
    setIsAdmin(Boolean(data))
    if (data) refreshAdmin()
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => checkAdmin(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => checkAdmin(currentSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  const authSubmit = async (e) => {
    e.preventDefault(); setAuthMessage('در حال بررسی...')
    const fn = authMode === 'signup' ? supabase.auth.signUp : supabase.auth.signInWithPassword
    const { error } = await fn.call(supabase.auth, credentials)
    setAuthMessage(error ? error.message : (authMode === 'signup' ? 'حساب ساخته شد؛ ایمیل را بررسی کنید.' : 'ورود انجام شد.'))
  }

  const createProduct = async (e) => {
    e.preventDefault(); setAuthMessage('در حال ذخیره محصول...')
    let image = null
    if (file) {
      const path = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
      const upload = await supabase.storage.from('products').upload(path, file)
      if (upload.error) { setAuthMessage('آپلود عکس ناموفق بود.'); return }
      image = supabase.storage.from('products').getPublicUrl(path).data.publicUrl
    }
    const payload = { name: newProduct.name, slug: `product-${Date.now()}`, category: newProduct.category || null, description: newProduct.description || null, single_price: Number(newProduct.single_price), wholesale_price: newProduct.wholesale_price ? Number(newProduct.wholesale_price) : null, image, stock: Number(newProduct.stock || 0), active: true }
    const { data, error } = await supabase.from('products').insert(payload).select().single()
    if (error) { setAuthMessage(error.message); return }
    await supabase.from('product_variants').insert({ product_id: data.id, color: newProduct.color || null, size: newProduct.size || null, stock: Number(newProduct.stock || 0), sku: `AV-${data.id}-${Date.now()}` })
    setNewProduct({ name: '', category: '', description: '', single_price: '', wholesale_price: '', color: '', size: '', stock: '0' }); setFile(null); setAuthMessage('محصول ذخیره شد.'); refreshAdmin()
  }

  const setOrderStatus = async (id, status) => { await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id); refreshAdmin() }
  const setRequestStatus = async (id, status) => { await supabase.from('wholesale_requests').update({ status }).eq('id', id); refreshAdmin() }
  const toggleProduct = async (product) => { await supabase.from('products').update({ active: !product.active }).eq('id', product.id); refreshAdmin() }

  return <div className="admin-shell"><div className="admin-panel"><div className="admin-top"><div><span>AVENZA</span><h2>پنل مدیریت</h2></div><button className="icon-btn" onClick={onClose}>×</button></div>{!session ? <div className="auth-box"><div className="auth-switch"><button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>ورود</button><button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>ساخت حساب</button></div><form onSubmit={authSubmit}><input type="email" required placeholder="ایمیل مدیر" value={credentials.email} onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} /><input type="password" minLength="6" required placeholder="رمز عبور" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} /><button className="primary full">{authMode === 'login' ? 'ورود به مدیریت' : 'ساخت حساب'}</button></form>{authMessage && <p>{authMessage}</p>}</div> : !isAdmin ? <div className="auth-box"><h3>حساب وارد شده است، اما دسترسی مدیریت ندارد.</h3><p>ایمیل این حساب باید در فهرست مدیران AVENZA تأیید شود.</p><button className="dark" onClick={() => supabase.auth.signOut()}>خروج</button></div> : <><div className="admin-tabs"><button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>سفارش‌ها</button><button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>محصولات</button><button className={tab === 'wholesale' ? 'active' : ''} onClick={() => setTab('wholesale')}>همکاری عمده</button><button onClick={() => supabase.auth.signOut()}>خروج</button></div>{tab === 'orders' && <div className="admin-list">{orders.map((o) => <div className="admin-row" key={o.id}><div><strong>#{o.id} — {o.name}</strong><small>{o.phone} · {o.order_type === 'wholesale' ? 'عمده' : 'تکی'} · {money(o.total)}</small><small>{o.address}</small></div><select value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)}><option>جدید</option><option>در حال بررسی</option><option>تایید شده</option><option>ارسال شده</option><option>لغو شده</option></select></div>)}{!orders.length && <div className="empty">هنوز سفارشی ثبت نشده است.</div>}</div>}{tab === 'wholesale' && <div className="admin-list">{requests.map((r) => <div className="admin-row" key={r.id}><div><strong>{r.name} {r.shop ? `— ${r.shop}` : ''}</strong><small>{r.phone} · تعداد تقریبی: {r.count || '—'}</small></div><select value={r.status} onChange={(e) => setRequestStatus(r.id, e.target.value)}><option>جدید</option><option>تماس گرفته شد</option><option>تایید شد</option><option>رد شد</option></select></div>)}{!requests.length && <div className="empty">درخواستی وجود ندارد.</div>}</div>}{tab === 'products' && <div className="admin-products"><form className="product-form" onSubmit={createProduct}><h3>محصول جدید</h3><input required placeholder="نام محصول" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} /><input placeholder="دسته‌بندی" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} /><textarea placeholder="توضیحات" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} /><div className="two"><input required type="number" placeholder="قیمت تکی" value={newProduct.single_price} onChange={(e) => setNewProduct({ ...newProduct, single_price: e.target.value })} /><input type="number" placeholder="قیمت عمده" value={newProduct.wholesale_price} onChange={(e) => setNewProduct({ ...newProduct, wholesale_price: e.target.value })} /></div><div className="three"><input placeholder="رنگ" value={newProduct.color} onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })} /><input placeholder="سایز" value={newProduct.size} onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })} /><input type="number" placeholder="موجودی" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} /></div><label className="file-label">عکس محصول<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><button className="primary">ذخیره محصول</button>{authMessage && <span>{authMessage}</span>}</form><div className="admin-list">{products.map((p) => <div className="admin-row" key={p.id}><div><strong>{p.name}</strong><small>{money(p.single_price)} · {p.category || 'بدون دسته'}</small></div><button className={p.active ? 'soft-btn' : 'dark'} onClick={() => toggleProduct(p)}>{p.active ? 'فعال' : 'غیرفعال'}</button></div>)}</div></div>}</>}</div></div>
}

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('retail')
  const [selectedVariants, setSelectedVariants] = useState({})
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*, product_variants(*)').eq('active', true).order('featured', { ascending: false }).order('created_at', { ascending: false })
    setProducts(data || []); setLoading(false)
  }
  useEffect(() => { loadProducts() }, [])

  const addToCart = (product) => {
    const variants = product.product_variants || []
    const variantId = Number(selectedVariants[product.id] || variants[0]?.id || 0) || null
    const variant = variants.find((v) => v.id === variantId) || variants[0] || null
    const key = `${product.id}-${variant?.id || 'none'}`
    setCart((items) => {
      const existing = items.find((i) => i.key === key)
      if (existing) return items.map((i) => i.key === key ? { ...i, quantity: i.quantity + 1 } : i)
      return [...items, { key, product, variant, quantity: 1 }]
    })
    setCartOpen(true)
  }
  const changeQty = (key, delta) => setCart((items) => items.map((i) => i.key === key ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0))
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])

  return <div className="app">
    <header className="site-header"><a className="brand" href="#top"><img src="/avenza-logo.webp" alt="AVENZA Collection" /><span>AVENZA COLLECTION</span></a><nav><a href="#shop">فروشگاه</a><a href="#wholesale">خرید عمده</a><a href="#about">درباره ما</a></nav><div className="header-actions"><button className="text-btn" onClick={() => setAdminOpen(true)}>مدیریت</button><button className="cart-btn" onClick={() => setCartOpen(true)}>سبد خرید <b>{cartCount}</b></button></div></header>

    <main id="top">
      <section className="hero"><div className="hero-copy"><span className="eyebrow">NEW SEASON · AVENZA</span><h1>استایل ساده،<br />اثر ماندگار.</h1><p>فروش تکی و عمده پوشاک با انتخاب‌های مینیمال، کاربردی و قابل سفارش مستقیم از AVENZA Collection.</p><div className="hero-actions"><a className="primary" href="#shop">مشاهده محصولات</a><a className="ghost" href="#wholesale">همکاری عمده</a></div><div className="trust"><span>سفارش مستقیم</span><span>فروش تکی و عمده</span><span>بدون پرداخت آنلاین فعلاً</span></div></div><div className="hero-visual"><img src="/avenza-logo.webp" alt="AVENZA" /><div className="hero-card"><span>AVENZA</span><strong>COLLECTION</strong><small>EST. 2026</small></div></div></section>

      <section className="shop section" id="shop"><div className="section-head"><div><span className="eyebrow">SHOP</span><h2>کالکشن AVENZA</h2></div><div className="mode-switch"><button className={mode === 'retail' ? 'active' : ''} onClick={() => setMode('retail')}>خرید تکی</button><button className={mode === 'wholesale' ? 'active' : ''} onClick={() => setMode('wholesale')}>خرید عمده</button></div></div>{loading ? <div className="loading">در حال بارگذاری محصولات...</div> : <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} mode={mode} selectedVariant={selectedVariants[product.id]} onVariant={(id, value) => setSelectedVariants({ ...selectedVariants, [id]: Number(value) })} onAdd={addToCart} />)}</div>}</section>

      <section className="wholesale-section section" id="wholesale"><div className="wholesale-copy"><span className="eyebrow">WHOLESALE</span><h2>برای فروشگاه‌ها و مزون‌ها</h2><p>اگر برای فروشگاه، مزون یا شبکه فروش خود خرید عمده دارید، فرم را ثبت کنید. تیم AVENZA برای موجودی، تعداد و شرایط همکاری با شما هماهنگ می‌کند.</p><ul><li>قیمت عمده مجزا برای محصولات</li><li>ثبت درخواست بدون نیاز به درگاه پرداخت</li><li>مدیریت درخواست‌ها از پنل اختصاصی</li></ul></div><WholesaleForm /></section>

      <section className="about section" id="about"><div><span className="eyebrow">ABOUT</span><h2>AVENZA Collection</h2></div><p>AVENZA با تمرکز روی پوشاک مینیمال و قابل استفاده روزمره شکل گرفته است. این فروشگاه به‌صورت مستقل برای فروش تکی و عمده طراحی شده و سفارش‌ها از داخل همین سامانه مدیریت می‌شوند.</p></section>
    </main>

    <footer><div className="brand footer-brand"><img src="/avenza-logo.webp" alt="AVENZA" /><span>AVENZA COLLECTION</span></div><p>© 2026 AVENZA Collection</p></footer>

    <CartDrawer open={cartOpen} cart={cart} mode={mode} onClose={() => setCartOpen(false)} onQty={changeQty} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }} />
    <CheckoutModal open={checkoutOpen} cart={cart} mode={mode} onClose={() => setCheckoutOpen(false)} onSuccess={() => { setCheckoutOpen(false); setCart([]); loadProducts() }} />
    {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
  </div>
}
