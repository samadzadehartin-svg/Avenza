import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const money = (value = 0) => new Intl.NumberFormat('fa-IR').format(Number(value || 0)) + ' تومان'
const unique = (items) => [...new Set(items.filter(Boolean))]

function EmptyImage({ name }) {
  return <div className="product-fallback"><span>{name?.slice(0, 2) || 'AV'}</span></div>
}

function ProductCard({ product, mode, onAdd }) {
  const variants = product.product_variants || []
  const allImages = product.product_images || []
  const colors = unique(variants.map((v) => v.color))
  const [color, setColor] = useState(colors[0] || '')
  const availableByColor = variants.filter((v) => !color || v.color === color)
  const sizes = unique(availableByColor.map((v) => v.size))
  const [size, setSize] = useState(sizes[0] || '')

  useEffect(() => {
    const firstColor = colors[0] || ''
    setColor(firstColor)
    const firstSize = variants.find((v) => !firstColor || v.color === firstColor)?.size || ''
    setSize(firstSize || '')
  }, [product.id])

  useEffect(() => {
    const firstSize = variants.find((v) => (!color || v.color === color))?.size || ''
    setSize(firstSize || '')
  }, [color])

  const selectedVariant = variants.find((v) => (!color || v.color === color) && (!size || v.size === size)) || availableByColor[0] || variants[0] || null
  const exactImages = color ? allImages.filter((img) => img.color === color) : []
  const generalImages = allImages.filter((img) => !img.color)
  const gallery = exactImages.length ? [...exactImages, ...generalImages] : generalImages.length ? generalImages : allImages
  const fallbackUrl = product.image ? [{ id: 'cover', image_url: product.image }] : []
  const displayGallery = gallery.length ? gallery : fallbackUrl
  const [activeImage, setActiveImage] = useState(displayGallery[0]?.image_url || product.image || '')

  useEffect(() => {
    setActiveImage(displayGallery[0]?.image_url || product.image || '')
  }, [color, product.image, allImages.length])

  const price = mode === 'wholesale' ? (product.wholesale_price ?? product.single_price) : product.single_price
  const soldOut = selectedVariant?.stock === 0
  const stockLabel = selectedVariant?.stock == null ? 'موجود' : selectedVariant.stock > 0 ? `موجودی ${selectedVariant.stock}` : 'ناموجود'

  return <article className="product-card">
    <div className="product-media product-gallery-main">
      {activeImage ? <img src={activeImage} alt={product.name} /> : <EmptyImage name={product.name} />}
      {product.featured && <span className="badge">منتخب AVENZA</span>}
    </div>
    {displayGallery.length > 1 && <div className="product-thumbs">{displayGallery.slice(0, 6).map((img) => <button type="button" key={img.id || img.image_url} className={activeImage === img.image_url ? 'active' : ''} onClick={() => setActiveImage(img.image_url)}><img src={img.image_url} alt="" /></button>)}</div>}
    <div className="product-body">
      <div className="product-meta">{product.category || 'کالکشن جدید'}</div>
      <h3>{product.name}</h3>
      <p className="description">{product.description || 'طراحی مینیمال، مناسب استایل روزمره.'}</p>
      <div className="price-line"><strong>{money(price)}</strong><span>{mode === 'wholesale' ? 'قیمت عمده' : 'قیمت تکی'}</span></div>

      {colors.length > 0 && <div className="option-group"><span>رنگ</span><div className="option-pills">{colors.map((item) => <button type="button" key={item} className={color === item ? 'active' : ''} onClick={() => setColor(item)}>{item}</button>)}</div></div>}
      {sizes.length > 0 && <div className="option-group"><span>سایز</span><div className="option-pills">{sizes.map((item) => {
        const variant = variants.find((v) => (!color || v.color === color) && v.size === item)
        const disabled = variant?.stock === 0
        return <button type="button" key={item} disabled={disabled} className={size === item ? 'active' : ''} onClick={() => setSize(item)}>{item}</button>
      })}</div></div>}

      {variants.length > 0 && <div className={soldOut ? 'stock-line soldout' : 'stock-line'}>{stockLabel}</div>}
      <button className="primary full" disabled={soldOut} onClick={() => onAdd(product, selectedVariant)}>{soldOut ? 'ناموجود' : 'افزودن به سبد'}</button>
    </div>
  </article>
}

function CartDrawer({ open, cart, mode, onClose, onQty, onCheckout }) {
  const total = cart.reduce((sum, item) => sum + item.quantity * (mode === 'wholesale' ? (item.product.wholesale_price ?? item.product.single_price) : item.product.single_price), 0)
  return <div className={open ? 'drawer-wrap open' : 'drawer-wrap'}>
    <button className="drawer-backdrop" onClick={onClose} aria-label="بستن" />
    <aside className="drawer">
      <div className="drawer-head"><h3>سبد خرید</h3><button className="icon-btn" onClick={onClose}>×</button></div>
      <div className="drawer-items">
        {cart.length === 0 && <div className="empty">سبد خرید هنوز خالی است.</div>}
        {cart.map((item) => <div className="cart-row" key={item.key}><div><strong>{item.product.name}</strong><small>{[item.variant?.color, item.variant?.size].filter(Boolean).join(' / ')}</small></div><div className="qty"><button onClick={() => onQty(item.key, -1)}>−</button><span>{item.quantity}</span><button onClick={() => onQty(item.key, 1)}>+</button></div></div>)}
      </div>
      <div className="drawer-foot"><div className="total"><span>جمع سفارش</span><strong>{money(total)}</strong></div><button className="primary full" disabled={!cart.length} onClick={onCheckout}>ادامه ثبت سفارش</button><p>پرداخت آنلاین فعلاً فعال نیست؛ سفارش ثبت می‌شود و برای هماهنگی با شما تماس گرفته می‌شود.</p></div>
    </aside>
  </div>
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
    if (error) setMessage('ثبت سفارش انجام نشد. لطفاً موجودی و اطلاعات سفارش را بررسی کنید.')
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

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('retail')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*, product_variants(*), product_images(*)').eq('active', true).order('featured', { ascending: false }).order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }
  useEffect(() => { loadProducts() }, [])

  const addToCart = (product, variant) => {
    const key = `${product.id}-${variant?.id || 'none'}`
    setCart((items) => {
      const existing = items.find((i) => i.key === key)
      if (existing) {
        const max = variant?.stock == null ? Infinity : Number(variant.stock)
        return items.map((i) => i.key === key ? { ...i, quantity: Math.min(i.quantity + 1, max) } : i)
      }
      return [...items, { key, product, variant, quantity: 1 }]
    })
    setCartOpen(true)
  }
  const changeQty = (key, delta) => setCart((items) => items.map((i) => {
    if (i.key !== key) return i
    const max = i.variant?.stock == null ? Infinity : Number(i.variant.stock)
    return { ...i, quantity: Math.min(max, Math.max(0, i.quantity + delta)) }
  }).filter((i) => i.quantity > 0))
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])

  return <div className="app">
    <header className="site-header"><a className="brand" href="#top"><img src="/avenza-logo.webp" alt="AVENZA Collection" /><span>AVENZA COLLECTION</span></a><nav><a href="#shop">فروشگاه</a><a href="#wholesale">خرید عمده</a><a href="#about">درباره ما</a><a href="#contact">تماس</a></nav><div className="header-actions"><button className="cart-btn" onClick={() => setCartOpen(true)}>سبد خرید <b>{cartCount}</b></button></div></header>

    <main id="top">
      <section className="hero"><div className="hero-copy"><span className="eyebrow">NEW SEASON · AVENZA</span><h1>استایل ساده،<br />اثر ماندگار.</h1><p>فروش تکی و عمده پوشاک با انتخاب‌های مینیمال، کاربردی و قابل سفارش مستقیم از AVENZA Collection.</p><div className="hero-actions"><a className="primary" href="#shop">مشاهده محصولات</a><a className="ghost" href="#wholesale">همکاری عمده</a></div><div className="trust"><span>سفارش مستقیم</span><span>فروش تکی و عمده</span><span>هماهنگی پرداخت پس از سفارش</span></div></div><div className="hero-visual"><img src="/avenza-logo.webp" alt="AVENZA" /><div className="hero-card"><span>AVENZA</span><strong>COLLECTION</strong><small>EST. 2026</small></div></div></section>

      <section className="shop section" id="shop"><div className="section-head"><div><span className="eyebrow">SHOP</span><h2>کالکشن AVENZA</h2></div><div className="mode-switch"><button className={mode === 'retail' ? 'active' : ''} onClick={() => setMode('retail')}>خرید تکی</button><button className={mode === 'wholesale' ? 'active' : ''} onClick={() => setMode('wholesale')}>خرید عمده</button></div></div>{loading ? <div className="loading">در حال بارگذاری محصولات...</div> : <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} mode={mode} onAdd={addToCart} />)}{!products.length && <div className="empty">هنوز محصولی برای نمایش ثبت نشده است.</div>}</div>}</section>

      <section className="wholesale-section section" id="wholesale"><div className="wholesale-copy"><span className="eyebrow">WHOLESALE</span><h2>برای فروشگاه‌ها و مزون‌ها</h2><p>اگر برای فروشگاه، مزون یا شبکه فروش خود خرید عمده دارید، فرم را ثبت کنید. تیم AVENZA برای موجودی، تعداد و شرایط همکاری با شما هماهنگ می‌کند.</p><ul><li>قیمت عمده مجزا برای محصولات</li><li>ثبت درخواست بدون نیاز به درگاه پرداخت</li><li>هماهنگی مستقیم با مجموعه</li></ul></div><WholesaleForm /></section>

      <section className="about section" id="about"><div><span className="eyebrow">ABOUT</span><h2>AVENZA Collection</h2></div><p>AVENZA با تمرکز روی پوشاک مینیمال و قابل استفاده روزمره شکل گرفته است. فروش تکی و عمده، انتخاب رنگ و سایز و ثبت سفارش مستقیم از همین فروشگاه انجام می‌شود.</p></section>
    </main>

    <footer><div className="brand footer-brand"><img src="/avenza-logo.webp" alt="AVENZA" /><span>AVENZA COLLECTION</span></div><p>© 2026 AVENZA Collection</p></footer>

    <CartDrawer open={cartOpen} cart={cart} mode={mode} onClose={() => setCartOpen(false)} onQty={changeQty} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }} />
    <CheckoutModal open={checkoutOpen} cart={cart} mode={mode} onClose={() => setCheckoutOpen(false)} onSuccess={() => { setCheckoutOpen(false); setCart([]); loadProducts() }} />
  </div>
}
