import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const money = (value = 0) => new Intl.NumberFormat('fa-IR').format(Number(value || 0)) + ' تومان'
const unique = (items) => [...new Set(items.filter(Boolean))]

const DEFAULT_SITE = {
  announcement: 'ارسال و هماهنگی سفارش مستقیم با AVENZA',
  hero_eyebrow: 'NEW COLLECTION · AVENZA',
  hero_title: 'لباسی که دیده می‌شود.',
  hero_subtitle: 'کالکشن منتخب AVENZA برای استایل روزمره؛ خرید تکی و عمده با سفارش مستقیم.',
  hero_image_url: '',
  about_title: 'AVENZA برای استایل ساده و ماندگار',
  about_text: 'تمرکز ما روی انتخاب‌هایی است که راحت پوشیده می‌شوند، خوب می‌نشینند و از مد زودگذر فاصله دارند.',
  wholesale_title: 'همکاری با فروشگاه‌ها و مزون‌ها',
  wholesale_text: 'برای دریافت قیمت عمده و هماهنگی سفارش تعداد، درخواست خود را ثبت کنید تا با شما تماس بگیریم.',
  instagram: 'Avenza_co',
  phone: '09108456261',
  whatsapp: '09108456261',
  address: 'تهران، فردوسی، نبش جمهوری، پاساژ کویتی‌های استانبول، واحد ۱۰۱'
}

const FALLBACK_HERO = 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1400&q=88'
const CATEGORY_IMAGES = [
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85'
]

function EmptyImage({ name }) {
  return <div className="product-fallback"><span>AV</span><small>{name}</small></div>
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
    setSize(variants.find((v) => !firstColor || v.color === firstColor)?.size || '')
  }, [product.id])

  useEffect(() => {
    setSize(variants.find((v) => !color || v.color === color)?.size || '')
  }, [color])

  const selectedVariant = variants.find((v) => (!color || v.color === color) && (!size || v.size === size)) || availableByColor[0] || variants[0] || null
  const exactImages = color ? allImages.filter((img) => img.color === color) : []
  const generalImages = allImages.filter((img) => !img.color)
  const gallery = exactImages.length ? [...exactImages, ...generalImages] : generalImages.length ? generalImages : allImages
  const displayGallery = gallery.length ? gallery : product.image ? [{ id: 'cover', image_url: product.image }] : []
  const [activeImage, setActiveImage] = useState(displayGallery[0]?.image_url || product.image || '')

  useEffect(() => {
    setActiveImage(displayGallery[0]?.image_url || product.image || '')
  }, [color, product.image, allImages.length])

  const price = mode === 'wholesale' ? (product.wholesale_price ?? product.single_price) : product.single_price
  const soldOut = selectedVariant?.stock === 0

  return <article className="product-card">
    <div className="product-media">
      {activeImage ? <img src={activeImage} alt={product.name} loading="lazy" /> : <EmptyImage name={product.name} />}
      {product.featured && <span className="badge">پرفروش</span>}
      <span className="product-category">{product.category || 'AVENZA'}</span>
    </div>
    {displayGallery.length > 1 && <div className="product-thumbs">{displayGallery.slice(0, 5).map((img) => <button type="button" key={img.id || img.image_url} className={activeImage === img.image_url ? 'active' : ''} onClick={() => setActiveImage(img.image_url)}><img src={img.image_url} alt="" /></button>)}</div>}
    <div className="product-body">
      <div className="product-title-row"><h3>{product.name}</h3><strong>{money(price)}</strong></div>
      {colors.length > 0 && <div className="option-group compact"><span>رنگ</span><div className="option-pills">{colors.map((item) => <button type="button" key={item} className={color === item ? 'active' : ''} onClick={() => setColor(item)}>{item}</button>)}</div></div>}
      {sizes.length > 0 && <div className="option-group compact"><span>سایز</span><div className="option-pills">{sizes.map((item) => {
        const variant = variants.find((v) => (!color || v.color === color) && v.size === item)
        return <button type="button" key={item} disabled={variant?.stock === 0} className={size === item ? 'active' : ''} onClick={() => setSize(item)}>{item}</button>
      })}</div></div>}
      <button className="product-buy" disabled={soldOut} onClick={() => onAdd(product, selectedVariant)}>{soldOut ? 'ناموجود' : 'افزودن به سبد'}</button>
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
        {!cart.length && <div className="empty">سبد خرید هنوز خالی است.</div>}
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
    if (error) setMessage('ثبت سفارش انجام نشد. لطفاً اطلاعات را بررسی کنید.')
    else { setMessage(`سفارش شماره ${data} ثبت شد.`); setTimeout(() => onSuccess(data), 700) }
    setBusy(false)
  }
  return <div className="modal-shell"><div className="modal-card"><div className="drawer-head"><h3>ثبت سفارش</h3><button className="icon-btn" onClick={onClose}>×</button></div><form onSubmit={submit} className="form-grid"><label>نام و نام خانوادگی<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>شماره تماس<input required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="wide">آدرس<textarea required rows="4" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>{message && <div className="status wide">{message}</div>}<button className="primary wide" disabled={busy}>{busy ? 'در حال ثبت...' : 'ثبت نهایی سفارش'}</button></form></div></div>
}

function WholesaleForm() {
  const [form, setForm] = useState({ name: '', shop: '', phone: '', count: '' })
  const [message, setMessage] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setMessage('در حال ثبت...')
    const { error } = await supabase.from('wholesale_requests').insert({ name: form.name, shop: form.shop, phone: form.phone, count: Number(form.count || 0) || null })
    if (error) setMessage('خطا در ثبت درخواست.')
    else { setMessage('درخواست همکاری ثبت شد.'); setForm({ name: '', shop: '', phone: '', count: '' }) }
  }
  return <form className="wholesale-form" onSubmit={submit}><input required placeholder="نام و نام خانوادگی" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input placeholder="نام فروشگاه / مزون" value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })} /><input required placeholder="شماره تماس" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><input type="number" min="1" placeholder="تعداد تقریبی" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} /><button className="light-btn">ثبت درخواست عمده</button>{message && <span className="form-message">{message}</span>}</form>
}

export default function App() {
  const [products, setProducts] = useState([])
  const [site, setSite] = useState(DEFAULT_SITE)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('retail')
  const [category, setCategory] = useState('all')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('*, product_variants(*), product_images(*)').eq('active', true).order('featured', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
    ]).then(([p, s]) => {
      setProducts(p.data || [])
      if (s.data) setSite({ ...DEFAULT_SITE, ...s.data })
      setLoading(false)
    })
  }, [])

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
  const categories = unique(products.map((p) => p.category)).slice(0, 3)
  const visibleProducts = category === 'all' ? products : products.filter((p) => p.category === category)
  const instagramHandle = String(site.instagram || '').replace(/^@/, '')
  const whatsapp = String(site.whatsapp || site.phone || '').replace(/\D/g, '').replace(/^0/, '98')
  const heroImage = site.hero_image_url || FALLBACK_HERO

  const pickCategory = (name) => {
    setCategory(name)
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })
  }

  return <div className="app">
    <div className="site-chrome">
      <div className="announcement"><span>{site.announcement}</span><a href={`https://www.instagram.com/${instagramHandle}/`} target="_blank" rel="noreferrer">@{instagramHandle}</a></div>
      <header className="site-header"><a className="brand" href="#top"><img src="/avenza-logo-v3.webp" alt="AVENZA Collection" /><span>AVENZA COLLECTION</span></a><nav><a href="#shop">فروشگاه</a><a href="#categories">دسته‌بندی</a><a href="#wholesale">عمده</a><a href="#about">درباره ما</a></nav><button className="cart-btn" onClick={() => setCartOpen(true)}>سبد <b>{cartCount}</b></button></header>
    </div>

    <main id="top" className="store-main">
      <section className="fashion-hero">
        <div className="hero-image" style={{ backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.22)),url(${heroImage})` }}>
          <div className="hero-stamp"><img src="/avenza-logo-v3.webp" alt="AVENZA" /></div>
          <span className="hero-vertical">AVENZA · 2026</span>
        </div>
        <div className="hero-copy">
          <span className="eyebrow">{site.hero_eyebrow}</span>
          <h1>{site.hero_title}</h1>
          <p>{site.hero_subtitle}</p>
          <div className="hero-actions"><a className="primary" href="#shop">خرید کالکشن</a><a className="text-link" href="#categories">دیدن دسته‌بندی‌ها ←</a></div>
          <div className="hero-trust"><span>سفارش مستقیم</span><span>فروش تکی و عمده</span><span>ارسال از تهران</span></div>
        </div>
      </section>

      <section className="category-section" id="categories">
        <div className="section-kicker">SHOP BY CATEGORY</div>
        <div className="category-grid">
          {(categories.length ? categories : ['مانتو', 'شومیز', 'ست']).map((name, index) => <button className="category-card" key={name} onClick={() => pickCategory(name)} style={{ backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.58)),url(${CATEGORY_IMAGES[index % CATEGORY_IMAGES.length]})` }}><span>0{index + 1}</span><strong>{name}</strong><small>مشاهده محصولات</small></button>)}
        </div>
      </section>

      <section className="shop-section" id="shop">
        <div className="shop-heading"><div><span className="eyebrow">NEW ARRIVALS</span><h2>انتخاب‌های جدید</h2></div><div className="shop-controls"><div className="category-tabs"><button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>همه</button>{categories.map((name) => <button key={name} className={category === name ? 'active' : ''} onClick={() => setCategory(name)}>{name}</button>)}</div><div className="mode-switch"><button className={mode === 'retail' ? 'active' : ''} onClick={() => setMode('retail')}>تکی</button><button className={mode === 'wholesale' ? 'active' : ''} onClick={() => setMode('wholesale')}>عمده</button></div></div></div>
        {loading ? <div className="loading">در حال بارگذاری...</div> : <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} mode={mode} onAdd={addToCart} />)}{!visibleProducts.length && <div className="empty">در این دسته محصولی ثبت نشده.</div>}</div>}
      </section>

      <section className="brand-marquee"><span>AVENZA COLLECTION</span><i>•</i><span>MINIMAL STYLE</span><i>•</i><span>RETAIL & WHOLESALE</span><i>•</i><span>TEHRAN</span></section>

      <section className="story-section" id="about">
        <div className="story-visual"><img src="/avenza-logo-v3.webp" alt="AVENZA" /><span>EST. 2026</span></div>
        <div className="story-copy"><span className="eyebrow">OUR STORY</span><h2>{site.about_title}</h2><p>{site.about_text}</p><a className="text-link" href={`https://www.instagram.com/${instagramHandle}/`} target="_blank" rel="noreferrer">اینستاگرام AVENZA ←</a></div>
      </section>

      <section className="wholesale-section" id="wholesale">
        <div className="wholesale-copy"><span className="eyebrow">WHOLESALE · AVENZA</span><h2>{site.wholesale_title}</h2><p>{site.wholesale_text}</p><div className="wholesale-points"><span>قیمت همکاری</span><span>هماهنگی مستقیم</span><span>سفارش تعداد</span></div></div>
        <WholesaleForm />
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-brand"><img src="/avenza-logo-v3.webp" alt="AVENZA" /><div><span>CONTACT · AVENZA</span><h2>با ما در ارتباط باشید.</h2></div></div>
        <div className="contact-links"><a href={`https://www.instagram.com/${instagramHandle}/`} target="_blank" rel="noreferrer"><small>اینستاگرام</small><strong>@{instagramHandle}</strong></a><a href={`tel:${site.phone}`}><small>تماس</small><strong dir="ltr">{site.phone}</strong></a><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><small>واتساپ</small><strong dir="ltr">{site.whatsapp}</strong></a><div><small>آدرس</small><strong>{site.address}</strong></div></div>
      </section>
    </main>

    <footer><div><img src="/avenza-logo-v3.webp" alt="AVENZA" /><strong>AVENZA COLLECTION</strong></div><span>© 2026 AVENZA</span></footer>

    <CartDrawer open={cartOpen} cart={cart} mode={mode} onClose={() => setCartOpen(false)} onQty={changeQty} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }} />
    <CheckoutModal open={checkoutOpen} cart={cart} mode={mode} onClose={() => setCheckoutOpen(false)} onSuccess={() => { setCart([]); setCheckoutOpen(false) }} />
  </div>
}
