import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const money = (value = 0) => new Intl.NumberFormat('fa-IR').format(Number(value || 0)) + ' تومان'
const unique = (items) => [...new Set(items.filter(Boolean))]
const FALLBACK_HERO = 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=88'
const EDITORIAL = [
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85'
]
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

const colorHex = (name = '') => {
  const n = String(name).trim()
  const map = [
    ['مشکی','#111111'],['سفید','#ffffff'],['کرم','#eadfcd'],['شیری','#f2eadf'],['طوسی','#9a9a9a'],['خاکستری','#8c8c8c'],
    ['قهوه','#74513b'],['نسکافه','#b89572'],['بژ','#d8c6aa'],['قرمز','#b51f2f'],['زرشکی','#6e1728'],['صورتی','#e7b6c2'],
    ['سبز','#4f6d54'],['آبی','#476e9e'],['سرمه','#1d2c46'],['طلایی','#b28a52'],['زرد','#e3c349'],['بنفش','#72558b']
  ]
  return map.find(([key]) => n.includes(key))?.[1] || '#d7d7d7'
}

function navigate(path, setRoute) {
  window.history.pushState({}, '', path)
  setRoute(path)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function ProductImage({ product, className = '' }) {
  const src = product.image || product.product_images?.[0]?.image_url
  return src ? <img className={className} src={src} alt={product.name} loading="lazy" /> : <div className={`nx-fallback ${className}`}><b>AV</b><span>{product.name}</span></div>
}

function ProductCard({ product, mode, onOpen }) {
  const colors = unique((product.product_variants || []).map(v => v.color))
  const price = mode === 'wholesale' ? (product.wholesale_price ?? product.single_price) : product.single_price
  return <article className="nx-card">
    <button className="nx-card-media" type="button" onClick={() => onOpen(product)}>
      <ProductImage product={product} />
      {product.featured && <span className="nx-badge">پرفروش</span>}
      <span className="nx-card-view">مشاهده محصول</span>
    </button>
    <div className="nx-card-info">
      <div><small>{product.category || 'AVENZA'}</small><h3>{product.name}</h3></div>
      <strong>{money(price)}</strong>
    </div>
    {!!colors.length && <div className="nx-swatches" aria-label="رنگ‌های موجود">{colors.slice(0, 6).map(color => <span key={color} title={color} style={{ background: colorHex(color) }} />)}</div>}
  </article>
}

function CartDrawer({ open, cart, mode, onClose, onQty, onCheckout }) {
  const total = cart.reduce((sum, item) => sum + item.quantity * (mode === 'wholesale' ? (item.product.wholesale_price ?? item.product.single_price) : item.product.single_price), 0)
  return <div className={`nx-drawer-shell ${open ? 'open' : ''}`}>
    <button className="nx-backdrop" onClick={onClose} aria-label="بستن سبد" />
    <aside className="nx-drawer">
      <div className="nx-drawer-head"><div><small>AVENZA</small><h3>سبد خرید</h3></div><button onClick={onClose}>×</button></div>
      <div className="nx-cart-items">
        {!cart.length && <div className="nx-empty">سبد خرید هنوز خالی است.</div>}
        {cart.map(item => <div className="nx-cart-row" key={item.key}><div><b>{item.product.name}</b><small>{[item.variant?.color,item.variant?.size].filter(Boolean).join(' / ')}</small></div><div className="nx-qty"><button onClick={() => onQty(item.key,-1)}>−</button><span>{item.quantity}</span><button onClick={() => onQty(item.key,1)}>+</button></div></div>)}
      </div>
      <div className="nx-cart-foot"><div><span>جمع سفارش</span><b>{money(total)}</b></div><button className="nx-primary" disabled={!cart.length} onClick={onCheckout}>ادامه ثبت سفارش</button><p>پرداخت آنلاین فعلاً فعال نیست؛ سفارش ثبت می‌شود و برای هماهنگی با شما تماس گرفته می‌شود.</p></div>
    </aside>
  </div>
}

function Checkout({ open, cart, mode, onClose, onDone }) {
  const [form,setForm] = useState({ name:'', phone:'', address:'' })
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  if (!open) return null
  const submit = async e => {
    e.preventDefault(); setBusy(true); setMessage('')
    const items = cart.map(item => ({ product_id:item.product.id, variant_id:item.variant?.id || null, quantity:item.quantity }))
    const { data,error } = await supabase.rpc('place_order',{ p_name:form.name,p_phone:form.phone,p_address:form.address,p_order_type:mode,p_items:items })
    if (error) setMessage('ثبت سفارش انجام نشد. اطلاعات را بررسی کنید.')
    else { setMessage(`سفارش شماره ${data} ثبت شد.`); setTimeout(onDone,850) }
    setBusy(false)
  }
  return <div className="nx-modal-shell"><form className="nx-checkout" onSubmit={submit}><div className="nx-drawer-head"><div><small>CHECKOUT</small><h3>ثبت سفارش</h3></div><button type="button" onClick={onClose}>×</button></div><label>نام و نام خانوادگی<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></label><label>شماره تماس<input required inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></label><label>آدرس<textarea required rows="4" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></label>{message && <div className="nx-message">{message}</div>}<button className="nx-primary" disabled={busy}>{busy?'در حال ثبت...':'ثبت نهایی سفارش'}</button></form></div>
}

function ProductPage({ product, mode, onAdd, onBack }) {
  const variants = product.product_variants || []
  const allImages = product.product_images || []
  const colors = unique(variants.map(v=>v.color))
  const [color,setColor] = useState(colors[0] || '')
  const sizeRows = variants.filter(v => !color || v.color === color)
  const sizes = unique(sizeRows.map(v=>v.size))
  const [size,setSize] = useState(sizes[0] || '')
  useEffect(()=>{ setSize(variants.find(v=>!color || v.color===color)?.size || '') },[color])
  const selected = variants.find(v => (!color || v.color===color) && (!size || v.size===size)) || sizeRows[0] || variants[0] || null
  const colorImages = color ? allImages.filter(i=>i.color===color) : []
  const general = allImages.filter(i=>!i.color)
  const gallery = colorImages.length ? [...colorImages,...general] : allImages.length ? allImages : product.image ? [{id:'cover',image_url:product.image}] : []
  const [active,setActive] = useState(gallery[0]?.image_url || product.image || '')
  useEffect(()=>{ setActive(gallery[0]?.image_url || product.image || '') },[color,product.id])
  const soldOut = selected?.stock === 0
  const price = mode === 'wholesale' ? (product.wholesale_price ?? product.single_price) : product.single_price

  return <main className="nx-product-page">
    <button className="nx-back" onClick={onBack}>← بازگشت به فروشگاه</button>
    <div className="nx-product-layout">
      <section className="nx-product-gallery">
        <div className="nx-product-main">{active ? <img src={active} alt={product.name} /> : <ProductImage product={product} />}</div>
        {gallery.length>1 && <div className="nx-product-thumbs">{gallery.map(img=><button key={img.id || img.image_url} className={active===img.image_url?'active':''} onClick={()=>setActive(img.image_url)}><img src={img.image_url} alt="" /></button>)}</div>}
      </section>
      <section className="nx-product-copy">
        <small className="nx-kicker">{product.category || 'AVENZA COLLECTION'}</small>
        <h1>{product.name}</h1>
        <strong className="nx-product-price">{money(price)}</strong>
        <p>{product.description || 'انتخابی از کالکشن AVENZA با تمرکز روی فرم، راحتی و استایل روزمره.'}</p>
        {!!colors.length && <div className="nx-choice"><span>رنگ: <b>{color}</b></span><div className="nx-color-choices">{colors.map(item=><button key={item} className={color===item?'active':''} onClick={()=>setColor(item)}><i style={{background:colorHex(item)}} />{item}</button>)}</div></div>}
        {!!sizes.length && <div className="nx-choice"><span>سایز</span><div className="nx-size-choices">{sizes.map(item=>{ const row=variants.find(v=>(!color||v.color===color)&&v.size===item); return <button key={item} disabled={row?.stock===0} className={size===item?'active':''} onClick={()=>setSize(item)}>{item}</button> })}</div></div>}
        {variants.length>0 && <div className={`nx-stock ${soldOut?'off':''}`}>{selected?.stock == null ? 'موجود' : selected.stock>0 ? `موجودی ${selected.stock} عدد` : 'ناموجود'}</div>}
        <button className="nx-primary nx-add-big" disabled={soldOut} onClick={()=>onAdd(product,selected)}>{soldOut?'ناموجود':'افزودن به سبد خرید'}</button>
        <div className="nx-product-notes"><div><b>سفارش مستقیم</b><span>ثبت آنلاین و هماهنگی پرداخت</span></div><div><b>پشتیبانی واتساپ</b><span>پاسخ‌گویی برای انتخاب و سفارش</span></div><div><b>خرید عمده</b><span>قیمت عمده در حالت همکاری</span></div></div>
      </section>
    </div>
  </main>
}

function WholesaleForm() {
  const [form,setForm] = useState({name:'',shop:'',phone:'',count:''})
  const [message,setMessage] = useState('')
  const submit = async e => {
    e.preventDefault(); setMessage('در حال ثبت...')
    const { error } = await supabase.from('wholesale_requests').insert({ name:form.name,shop:form.shop,phone:form.phone,count:Number(form.count||0)||null })
    if(error) setMessage('خطا در ثبت درخواست.')
    else { setMessage('درخواست شما ثبت شد.'); setForm({name:'',shop:'',phone:'',count:''}) }
  }
  return <form className="nx-wholesale-form" onSubmit={submit}><input required placeholder="نام و نام خانوادگی" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder="نام فروشگاه / مزون" value={form.shop} onChange={e=>setForm({...form,shop:e.target.value})}/><input required placeholder="شماره تماس" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><input type="number" min="1" placeholder="تعداد تقریبی" value={form.count} onChange={e=>setForm({...form,count:e.target.value})}/><button className="nx-light">ثبت درخواست همکاری</button>{message&&<span>{message}</span>}</form>
}

export default function StoreNext() {
  const [products,setProducts] = useState([])
  const [site,setSite] = useState(DEFAULT_SITE)
  const [loading,setLoading] = useState(true)
  const [mode,setMode] = useState('retail')
  const [category,setCategory] = useState('all')
  const [cart,setCart] = useState(()=>{ try { return JSON.parse(localStorage.getItem('avenza-cart')||'[]') } catch { return [] } })
  const [cartOpen,setCartOpen] = useState(false)
  const [checkoutOpen,setCheckoutOpen] = useState(false)
  const [route,setRoute] = useState(window.location.pathname)

  useEffect(()=>{
    const pop=()=>setRoute(window.location.pathname); window.addEventListener('popstate',pop); return ()=>window.removeEventListener('popstate',pop)
  },[])
  useEffect(()=>{ localStorage.setItem('avenza-cart',JSON.stringify(cart)) },[cart])
  useEffect(()=>{
    Promise.all([
      supabase.from('products').select('*, product_variants(*), product_images(*)').eq('active',true).order('featured',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('site_settings').select('*').eq('id',1).maybeSingle()
    ]).then(([p,s])=>{ setProducts(p.data||[]); if(s.data) setSite({...DEFAULT_SITE,...s.data}); setLoading(false) })
  },[])

  const openProduct = product => navigate(`/product/${product.id}`,setRoute)
  const addToCart = (product,variant) => {
    const key=`${product.id}-${variant?.id||'none'}`
    setCart(items=>{ const existing=items.find(i=>i.key===key); if(existing){ const max=variant?.stock==null?Infinity:Number(variant.stock); return items.map(i=>i.key===key?{...i,quantity:Math.min(i.quantity+1,max)}:i) } return [...items,{key,product,variant,quantity:1}] })
    setCartOpen(true)
  }
  const changeQty=(key,delta)=>setCart(items=>items.map(i=>{ if(i.key!==key)return i; const max=i.variant?.stock==null?Infinity:Number(i.variant.stock); return {...i,quantity:Math.min(max,Math.max(0,i.quantity+delta))} }).filter(i=>i.quantity>0))
  const cartCount=useMemo(()=>cart.reduce((sum,i)=>sum+i.quantity,0),[cart])
  const categories=unique(products.map(p=>p.category))
  const visible=category==='all'?products:products.filter(p=>p.category===category)
  const featured=products.filter(p=>p.featured).slice(0,4)
  const arrivals=(featured.length?featured:products.slice(0,4))
  const productMatch=route.match(/^\/product\/(\d+)\/?$/)
  const activeProduct=productMatch?products.find(p=>String(p.id)===productMatch[1]):null
  const instagram=String(site.instagram||'Avenza_co').replace(/^@/,'')
  const whatsapp=String(site.whatsapp||site.phone||'').replace(/\D/g,'').replace(/^0/,'98')
  const editorial = [...products.map(p=>p.image||p.product_images?.[0]?.image_url).filter(Boolean),...EDITORIAL].slice(0,4)

  const header=<><div className="nx-announcement"><span>{site.announcement}</span><a target="_blank" rel="noreferrer" href={`https://instagram.com/${instagram}`}>@{instagram}</a></div><header className="nx-header"><button className="nx-brand" onClick={()=>navigate('/',setRoute)}><img src="/avenza-logo-v3.webp" alt="AVENZA"/><span>AVENZA COLLECTION</span></button><nav><button onClick={()=>{ if(route!=='/') navigate('/',setRoute); setTimeout(()=>document.getElementById('shop')?.scrollIntoView({behavior:'smooth'}),50)}}>فروشگاه</button><button onClick={()=>{ if(route!=='/') navigate('/',setRoute); setTimeout(()=>document.getElementById('categories')?.scrollIntoView({behavior:'smooth'}),50)}}>دسته‌بندی‌ها</button><button onClick={()=>{ if(route!=='/') navigate('/',setRoute); setTimeout(()=>document.getElementById('wholesale')?.scrollIntoView({behavior:'smooth'}),50)}}>عمده</button></nav><button className="nx-cart-button" onClick={()=>setCartOpen(true)}>سبد <b>{cartCount}</b></button></header></>

  if(!loading && productMatch && !activeProduct) return <div className="avenza-store">{header}<div className="nx-not-found"><h1>محصول پیدا نشد</h1><button className="nx-primary" onClick={()=>navigate('/',setRoute)}>بازگشت به فروشگاه</button></div></div>

  return <div className="avenza-store">
    {header}
    {activeProduct ? <ProductPage product={activeProduct} mode={mode} onAdd={addToCart} onBack={()=>navigate('/',setRoute)} /> : <>
      <section className="nx-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(0,0,0,.62),rgba(0,0,0,.08)),url('${site.hero_image_url||FALLBACK_HERO}')`}}><div className="nx-hero-copy"><small>{site.hero_eyebrow}</small><h1>{site.hero_title}</h1><p>{site.hero_subtitle}</p><div><button className="nx-primary invert" onClick={()=>document.getElementById('shop')?.scrollIntoView({behavior:'smooth'})}>مشاهده کالکشن</button><button className="nx-ghost-light" onClick={()=>document.getElementById('wholesale')?.scrollIntoView({behavior:'smooth'})}>خرید عمده</button></div></div><div className="nx-hero-label"><span>AVENZA</span><small>COLLECTION · 2026</small></div></section>

      <section className="nx-trust"><div><b>ارسال به سراسر کشور</b><span>هماهنگی قبل از ارسال</span></div><div><b>خرید تکی و عمده</b><span>دو حالت قیمت‌گذاری</span></div><div><b>پشتیبانی واتساپ</b><span>راهنمای انتخاب و سفارش</span></div><div><b>سفارش مستقیم</b><span>بدون واسطه</span></div></section>

      <section className="nx-section nx-arrivals"><div className="nx-section-title"><div><small>NEW ARRIVALS</small><h2>جدیدترین انتخاب‌ها</h2></div><button onClick={()=>document.getElementById('shop')?.scrollIntoView({behavior:'smooth'})}>مشاهده همه ←</button></div><div className="nx-grid">{arrivals.map(p=><ProductCard key={p.id} product={p} mode={mode} onOpen={openProduct}/>)}</div></section>

      {!!categories.length && <section className="nx-section" id="categories"><div className="nx-section-title"><div><small>SHOP BY CATEGORY</small><h2>انتخاب براساس دسته‌بندی</h2></div></div><div className="nx-category-grid">{categories.slice(0,6).map((cat,index)=>{ const p=products.find(x=>x.category===cat); const img=p?.image||p?.product_images?.[0]?.image_url||EDITORIAL[index%EDITORIAL.length]; return <button key={cat} onClick={()=>{setCategory(cat);setTimeout(()=>document.getElementById('shop')?.scrollIntoView({behavior:'smooth'}),50)}} style={{backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.6)),url('${img}')`}}><span>{cat}</span><small>مشاهده محصولات</small></button>})}</div></section>}

      <section className="nx-section" id="shop"><div className="nx-section-title nx-shop-head"><div><small>THE COLLECTION</small><h2>فروشگاه AVENZA</h2></div><div className="nx-mode"><button className={mode==='retail'?'active':''} onClick={()=>setMode('retail')}>تکی</button><button className={mode==='wholesale'?'active':''} onClick={()=>setMode('wholesale')}>عمده</button></div></div><div className="nx-filter-row"><button className={category==='all'?'active':''} onClick={()=>setCategory('all')}>همه</button>{categories.map(cat=><button key={cat} className={category===cat?'active':''} onClick={()=>setCategory(cat)}>{cat}</button>)}</div>{loading?<div className="nx-empty">در حال بارگذاری...</div>:<div className="nx-grid">{visible.map(p=><ProductCard key={p.id} product={p} mode={mode} onOpen={openProduct}/>)}</div>}</section>

      <section className="nx-wholesale" id="wholesale"><div><small>WHOLESALE · AVENZA</small><h2>{site.wholesale_title}</h2><p>{site.wholesale_text}</p><ul><li>قیمت همکاری برای سفارش تعداد</li><li>هماهنگی مستقیم با مجموعه</li><li>مناسب فروشگاه‌ها و مزون‌ها</li></ul></div><WholesaleForm/></section>

      <section className="nx-editorial"><div className="nx-editorial-copy"><small>FOLLOW THE LOOK</small><h2>@{instagram}</h2><p>استایل‌ها، کالکشن‌های تازه و محصولات جدید AVENZA را در اینستاگرام دنبال کنید.</p><a target="_blank" rel="noreferrer" href={`https://instagram.com/${instagram}`}>مشاهده اینستاگرام</a></div><div className="nx-editorial-grid">{editorial.map((img,i)=><a target="_blank" rel="noreferrer" href={`https://instagram.com/${instagram}`} key={`${img}-${i}`}><img src={img} alt="AVENZA style" loading="lazy"/></a>)}</div></section>

      <section className="nx-about" id="about"><img src="/avenza-logo-v3.webp" alt="AVENZA"/><div><small>ABOUT AVENZA</small><h2>{site.about_title}</h2><p>{site.about_text}</p></div></section>

      <footer className="nx-footer"><div><img src="/avenza-logo-v3.webp" alt="AVENZA"/><b>AVENZA COLLECTION</b></div><div><span>اینستاگرام</span><a target="_blank" rel="noreferrer" href={`https://instagram.com/${instagram}`}>@{instagram}</a></div><div><span>تماس و واتساپ</span><a href={`tel:${site.phone}`}>{site.phone}</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}`}>واتساپ</a></div><div><span>آدرس</span><p>{site.address}</p></div></footer>
    </>}

    <nav className="nx-mobile-nav"><button onClick={()=>navigate('/',setRoute)}>خانه</button><button onClick={()=>{ if(route!=='/') navigate('/',setRoute); setTimeout(()=>document.getElementById('shop')?.scrollIntoView({behavior:'smooth'}),50)}}>محصولات</button><button onClick={()=>setCartOpen(true)}>سبد <b>{cartCount}</b></button></nav>
    <CartDrawer open={cartOpen} cart={cart} mode={mode} onClose={()=>setCartOpen(false)} onQty={changeQty} onCheckout={()=>{setCartOpen(false);setCheckoutOpen(true)}}/>
    <Checkout open={checkoutOpen} cart={cart} mode={mode} onClose={()=>setCheckoutOpen(false)} onDone={()=>{setCheckoutOpen(false);setCart([])}}/>
  </div>
}
