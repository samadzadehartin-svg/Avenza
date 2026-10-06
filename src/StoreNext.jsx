import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { AccountPanel, useCustomerSession } from './CustomerAccount.jsx'

const money = (value = 0) => new Intl.NumberFormat('fa-IR').format(Number(value || 0)) + ' تومان'
const unique = (items) => [...new Set(items.filter(Boolean))]
const wholesaleRow = (product) => product.wholesale_prices?.[0] || null
const productPrice = (product, mode) => mode === 'wholesale' ? (wholesaleRow(product)?.price ?? product.single_price) : product.single_price
const wholesaleMinQty = (product) => Math.max(1, Number(wholesaleRow(product)?.min_qty || 1))
const FALLBACK_HERO = 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1800&q=88'
const EDITORIAL = [
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85'
]

const DEFAULT_CONTENT = {
  brand_text: 'AVENZA COLLECTION',
  announcement_link_label: '@{instagram}',
  announcement_link_url: '',
  nav_shop_label: 'فروشگاه',
  nav_shop_target: '#shop',
  nav_categories_label: 'دسته‌بندی‌ها',
  nav_categories_target: '#categories',
  nav_wholesale_label: 'عمده',
  nav_wholesale_target: '#wholesale',
  cart_label: 'سبد',
  hero_primary_label: 'مشاهده کالکشن',
  hero_primary_target: '#shop',
  hero_secondary_label: 'خرید عمده',
  hero_secondary_target: '#wholesale',
  hero_brand_label: 'AVENZA',
  hero_brand_subtitle: 'COLLECTION · 2026',
  trust_1_title: 'ارسال به سراسر کشور',
  trust_1_text: 'هماهنگی قبل از ارسال',
  trust_2_title: 'خرید تکی و عمده',
  trust_2_text: 'دو حالت قیمت‌گذاری',
  trust_3_title: 'پشتیبانی واتساپ',
  trust_3_text: 'راهنمای انتخاب و سفارش',
  trust_4_title: 'سفارش مستقیم',
  trust_4_text: 'بدون واسطه',
  arrivals_eyebrow: 'NEW ARRIVALS',
  arrivals_title: 'جدیدترین انتخاب‌ها',
  arrivals_cta_label: 'مشاهده همه ←',
  arrivals_cta_target: '#shop',
  categories_eyebrow: 'SHOP BY CATEGORY',
  categories_title: 'انتخاب براساس دسته‌بندی',
  categories_item_cta: 'مشاهده محصولات',
  shop_eyebrow: 'THE COLLECTION',
  shop_title: 'فروشگاه AVENZA',
  shop_retail_label: 'تکی',
  shop_wholesale_label: 'عمده',
  shop_all_label: 'همه',
  shop_loading_text: 'در حال بارگذاری...',
  wholesale_eyebrow: 'WHOLESALE · AVENZA',
  wholesale_bullet_1: 'قیمت همکاری برای سفارش تعداد',
  wholesale_bullet_2: 'هماهنگی مستقیم با مجموعه',
  wholesale_bullet_3: 'مناسب فروشگاه‌ها و مزون‌ها',
  wholesale_name_placeholder: 'نام و نام خانوادگی',
  wholesale_shop_placeholder: 'نام فروشگاه / مزون',
  wholesale_phone_placeholder: 'شماره تماس',
  wholesale_count_placeholder: 'تعداد تقریبی',
  wholesale_submit_label: 'ثبت درخواست همکاری',
  wholesale_busy_text: 'در حال ثبت...',
  wholesale_success_text: 'درخواست شما ثبت شد.',
  wholesale_error_text: 'خطا در ثبت درخواست.',
  editorial_eyebrow: 'FOLLOW THE LOOK',
  editorial_title: '@{instagram}',
  editorial_text: 'استایل‌ها، کالکشن‌های تازه و محصولات جدید AVENZA را در اینستاگرام دنبال کنید.',
  editorial_cta_label: 'مشاهده اینستاگرام',
  editorial_cta_url: '',
  about_eyebrow: 'ABOUT AVENZA',
  footer_brand: 'AVENZA COLLECTION',
  footer_instagram_label: 'اینستاگرام',
  footer_contact_label: 'تماس و واتساپ',
  footer_whatsapp_label: 'واتساپ',
  footer_address_label: 'آدرس',
  mobile_home_label: 'خانه',
  mobile_products_label: 'محصولات',
  mobile_cart_label: 'سبد',
  product_featured_badge: 'پرفروش',
  product_card_cta: 'مشاهده محصول',
  product_back_label: '← بازگشت به فروشگاه',
  product_fallback_description: 'انتخابی از کالکشن AVENZA با تمرکز روی فرم، راحتی و استایل روزمره.',
  product_color_label: 'رنگ',
  product_size_label: 'سایز',
  product_available_label: 'موجود',
  product_stock_prefix: 'موجودی',
  product_soldout_label: 'ناموجود',
  product_add_label: 'افزودن به سبد خرید',
  product_note_1_title: 'سفارش مستقیم',
  product_note_1_text: 'ثبت آنلاین و هماهنگی پرداخت',
  product_note_2_title: 'پشتیبانی واتساپ',
  product_note_2_text: 'پاسخ‌گویی برای انتخاب و سفارش',
  product_note_3_title: 'خرید عمده',
  product_note_3_text: 'قیمت عمده در حالت همکاری',
  cart_title: 'سبد خرید',
  cart_empty_text: 'سبد خرید هنوز خالی است.',
  cart_total_label: 'جمع سفارش',
  cart_checkout_label: 'ادامه ثبت سفارش',
  cart_note: 'پرداخت آنلاین فعلاً فعال نیست؛ سفارش ثبت می‌شود و برای هماهنگی با شما تماس گرفته می‌شود.',
  checkout_eyebrow: 'CHECKOUT',
  checkout_title: 'ثبت سفارش',
  checkout_name_label: 'نام و نام خانوادگی',
  checkout_phone_label: 'شماره تماس',
  checkout_address_label: 'آدرس',
  checkout_submit_label: 'ثبت نهایی سفارش',
  checkout_busy_label: 'در حال ثبت...',
  checkout_error_text: 'ثبت سفارش انجام نشد. اطلاعات را بررسی کنید.',
  checkout_success_prefix: 'سفارش شماره',
  not_found_title: 'محصول پیدا نشد',
  not_found_cta: 'بازگشت به فروشگاه'
}

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
  address: 'تهران، فردوسی، نبش جمهوری، پاساژ کویتی‌های استانبول، واحد ۱۰۱',
  content: DEFAULT_CONTENT
}

const hydrateSite = (row) => ({ ...DEFAULT_SITE, ...(row || {}), content: { ...DEFAULT_CONTENT, ...(row?.content || {}) } })
const renderToken = (value, vars = {}) => String(value || '').replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

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

function ProductCard({ product, mode, onOpen, content, favorite = false, onFavorite }) {
  const colors = unique((product.product_variants || []).map(v => v.color))
  const price = productPrice(product, mode)
  return <article className="nx-card">
    <button className={`nx-favorite ${favorite ? 'active' : ''}`} type="button" aria-label={favorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'} onClick={() => onFavorite?.(product)}>{favorite ? '♥' : '♡'}</button>
    <button className="nx-card-media" type="button" onClick={() => onOpen(product)}>
      <ProductImage product={product} />
      {product.featured && <span className="nx-badge">{content.product_featured_badge}</span>}
      <span className="nx-card-view">{content.product_card_cta}</span>
    </button>
    <div className="nx-card-info"><div><small>{product.category || 'AVENZA'}</small><h3>{product.name}</h3></div><strong>{money(price)}</strong></div>
    {!!colors.length && <div className="nx-swatches" aria-label="رنگ‌های موجود">{colors.slice(0, 6).map(color => <span key={color} title={color} style={{ background: colorHex(color) }} />)}</div>}
  </article>
}

function CartDrawer({ open, cart, mode, onClose, onQty, onCheckout, content }) {
  const total = cart.reduce((sum, item) => sum + item.quantity * productPrice(item.product, mode), 0)
  return <div className={`nx-drawer-shell ${open ? 'open' : ''}`}>
    <button className="nx-backdrop" onClick={onClose} aria-label="بستن سبد" />
    <aside className="nx-drawer"><div className="nx-drawer-head"><div><small>AVENZA</small><h3>{content.cart_title}</h3></div><button onClick={onClose}>×</button></div><div className="nx-cart-items">{!cart.length && <div className="nx-empty">{content.cart_empty_text}</div>}{cart.map(item => <div className="nx-cart-row" key={item.key}><div><b>{item.product.name}</b><small>{[item.variant?.color,item.variant?.size].filter(Boolean).join(' / ')}</small></div><div className="nx-qty"><button onClick={() => onQty(item.key,-1)}>−</button><span>{item.quantity}</span><button onClick={() => onQty(item.key,1)}>+</button></div></div>)}</div><div className="nx-cart-foot"><div><span>{content.cart_total_label}</span><b>{money(total)}</b></div><button className="nx-primary" disabled={!cart.length} onClick={onCheckout}>{content.cart_checkout_label}</button><p>{content.cart_note}</p></div></aside>
  </div>
}

function Checkout({ open, cart, mode, onClose, onDone, content }) {
  const [form,setForm] = useState({ name:'', phone:'', address:'' })
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  if (!open) return null
  const submit = async e => {
    e.preventDefault(); setBusy(true); setMessage('')
    const items = cart.map(item => ({ product_id:item.product.id, variant_id:item.variant?.id || null, quantity:item.quantity }))
    const { data,error } = await supabase.rpc('place_order',{ p_name:form.name,p_phone:form.phone,p_address:form.address,p_order_type:mode,p_items:items })
    if (error) setMessage(content.checkout_error_text)
    else { setMessage(`${content.checkout_success_prefix} ${data} ثبت شد.`); setTimeout(onDone,850) }
    setBusy(false)
  }
  return <div className="nx-modal-shell"><form className="nx-checkout" onSubmit={submit}><div className="nx-drawer-head"><div><small>{content.checkout_eyebrow}</small><h3>{content.checkout_title}</h3></div><button type="button" onClick={onClose}>×</button></div><label>{content.checkout_name_label}<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></label><label>{content.checkout_phone_label}<input required inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></label><label>{content.checkout_address_label}<textarea required rows="4" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></label>{message && <div className="nx-message">{message}</div>}<button className="nx-primary" disabled={busy}>{busy?content.checkout_busy_label:content.checkout_submit_label}</button></form></div>
}

function ProductPage({ product, mode, onAdd, onBack, content }) {
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
  const price = productPrice(product, mode)
  return <main className="nx-product-page"><button className="nx-back" onClick={onBack}>{content.product_back_label}</button><div className="nx-product-layout"><section className="nx-product-gallery"><div className="nx-product-main">{active ? <img src={active} alt={product.name} /> : <ProductImage product={product} />}</div>{gallery.length>1 && <div className="nx-product-thumbs">{gallery.map(img=><button key={img.id || img.image_url} className={active===img.image_url?'active':''} onClick={()=>setActive(img.image_url)}><img src={img.image_url} alt="" /></button>)}</div>}</section><section className="nx-product-copy"><small className="nx-kicker">{product.category || 'AVENZA COLLECTION'}</small><h1>{product.name}</h1><strong className="nx-product-price">{money(price)}</strong><p>{product.description || content.product_fallback_description}</p>{!!colors.length && <div className="nx-choice"><span>{content.product_color_label}: <b>{color}</b></span><div className="nx-color-choices">{colors.map(item=><button key={item} className={color===item?'active':''} onClick={()=>setColor(item)}><i style={{background:colorHex(item)}} />{item}</button>)}</div></div>}{!!sizes.length && <div className="nx-choice"><span>{content.product_size_label}</span><div className="nx-size-choices">{sizes.map(item=>{ const row=variants.find(v=>(!color||v.color===color)&&v.size===item); return <button key={item} disabled={row?.stock===0} className={size===item?'active':''} onClick={()=>setSize(item)}>{item}</button> })}</div></div>}{variants.length>0 && <div className={`nx-stock ${soldOut?'off':''}`}>{selected?.stock == null ? content.product_available_label : selected.stock>0 ? `${content.product_stock_prefix} ${selected.stock} عدد` : content.product_soldout_label}</div>}<button className="nx-primary nx-add-big" disabled={soldOut} onClick={()=>onAdd(product,selected)}>{soldOut?content.product_soldout_label:content.product_add_label}</button><div className="nx-product-notes"><div><b>{content.product_note_1_title}</b><span>{content.product_note_1_text}</span></div><div><b>{content.product_note_2_title}</b><span>{content.product_note_2_text}</span></div><div><b>{content.product_note_3_title}</b><span>{content.product_note_3_text}</span></div></div></section></div></main>
}

function WholesaleForm({ content }) {
  const [form,setForm] = useState({name:'',shop:'',phone:'',count:''})
  const [message,setMessage] = useState('')
  const submit = async e => {
    e.preventDefault(); setMessage(content.wholesale_busy_text)
    const { error } = await supabase.from('wholesale_requests').insert({ name:form.name,shop:form.shop,phone:form.phone,count:Number(form.count||0)||null })
    if(error) setMessage(content.wholesale_error_text)
    else { setMessage(content.wholesale_success_text); setForm({name:'',shop:'',phone:'',count:''}) }
  }
  return <form className="nx-wholesale-form" onSubmit={submit}><input required placeholder={content.wholesale_name_placeholder} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder={content.wholesale_shop_placeholder} value={form.shop} onChange={e=>setForm({...form,shop:e.target.value})}/><input required placeholder={content.wholesale_phone_placeholder} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><input type="number" min="1" placeholder={content.wholesale_count_placeholder} value={form.count} onChange={e=>setForm({...form,count:e.target.value})}/><button className="nx-light">{content.wholesale_submit_label}</button>{message&&<span>{message}</span>}</form>
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
  const [accountOpen,setAccountOpen] = useState(false)
  const account = useCustomerSession()
  const [route,setRoute] = useState(window.location.pathname)
  useEffect(()=>{ const pop=()=>setRoute(window.location.pathname); window.addEventListener('popstate',pop); return ()=>window.removeEventListener('popstate',pop) },[])
  useEffect(()=>{ localStorage.setItem('avenza-cart',JSON.stringify(cart)) },[cart])
  useEffect(()=>{ if(!account.isWholesaleApproved && mode==='wholesale') setMode('retail') },[account.isWholesaleApproved,mode])
  useEffect(()=>{ Promise.all([supabase.from('products').select('id,name,slug,description,category,single_price,image,stock,active,featured,created_at,product_variants(*),product_images(*),wholesale_prices(price,min_qty)').eq('active',true).order('featured',{ascending:false}).order('created_at',{ascending:false}),supabase.from('site_settings').select('*').eq('id',1).maybeSingle()]).then(([p,s])=>{ setProducts(p.data||[]); if(s.data) setSite(hydrateSite(s.data)); setLoading(false) }) },[account.session?.user?.id,account.wholesale?.status])
  const content = site.content || DEFAULT_CONTENT
  const openProduct = product => navigate(`/product/${product.id}`,setRoute)
  const goTarget = (rawTarget) => { const target = String(rawTarget || '').trim(); if (!target) return; if (target.startsWith('#')) { if (route !== '/') navigate('/',setRoute); setTimeout(()=>document.querySelector(target)?.scrollIntoView({behavior:'smooth'}),60); return } if (target.startsWith('/')) { navigate(target,setRoute); return } window.open(target,'_blank','noopener,noreferrer') }
  const addToCart = (product,variant) => { if(mode==='wholesale' && !account.isWholesaleApproved){ setAccountOpen(true); return } const key=`${product.id}-${variant?.id||'none'}`; setCart(items=>{ const existing=items.find(i=>i.key===key); if(existing){ const max=variant?.stock==null?Infinity:Number(variant.stock); return items.map(i=>i.key===key?{...i,quantity:Math.min(i.quantity+1,max)}:i) } const startQty=mode==='wholesale'?wholesaleMinQty(product):1; return [...items,{key,product,variant,quantity:startQty}] }); setCartOpen(true) }
  const toggleFavorite = async (product) => { const result=await account.toggleFavorite(product.id); if(result?.needsAuth) setAccountOpen(true) }
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
  const instagramUrl = `https://instagram.com/${instagram}`
  const vars = { instagram }
  const header=<><div className="nx-announcement"><span>{site.announcement}</span><a target="_blank" rel="noreferrer" href={content.announcement_link_url || instagramUrl}>{renderToken(content.announcement_link_label,vars)}</a></div><header className="nx-header"><button className="nx-brand" onClick={()=>navigate('/',setRoute)}><img src="/avenza-logo-v3.webp" alt="AVENZA"/><span>{content.brand_text}</span></button><nav><button onClick={()=>goTarget(content.nav_shop_target)}>{content.nav_shop_label}</button><button onClick={()=>goTarget(content.nav_categories_target)}>{content.nav_categories_label}</button><button onClick={()=>goTarget(content.nav_wholesale_target)}>{content.nav_wholesale_label}</button></nav><div className="nx-header-actions"><button className={`nx-account-button ${account.isWholesaleApproved?'wholesale':''}`} onClick={()=>setAccountOpen(true)}>{account.session ? 'حساب من' : 'ورود'}</button><button className="nx-cart-button" onClick={()=>setCartOpen(true)}>{content.cart_label} <b>{cartCount}</b></button></div></header></>
  if(!loading && productMatch && !activeProduct) return <div className="avenza-store">{header}<div className="nx-not-found"><h1>{content.not_found_title}</h1><button className="nx-primary" onClick={()=>navigate('/',setRoute)}>{content.not_found_cta}</button></div></div>
  return <div className="avenza-store">{header}{activeProduct ? <ProductPage product={activeProduct} mode={mode} onAdd={addToCart} onBack={()=>navigate('/',setRoute)} content={content} /> : <><section className="nx-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(0,0,0,.62),rgba(0,0,0,.08)),url('${site.hero_image_url||FALLBACK_HERO}')`}}><div className="nx-hero-copy"><small>{site.hero_eyebrow}</small><h1>{site.hero_title}</h1><p>{site.hero_subtitle}</p><div><button className="nx-primary invert" onClick={()=>goTarget(content.hero_primary_target)}>{content.hero_primary_label}</button><button className="nx-ghost-light" onClick={()=>goTarget(content.hero_secondary_target)}>{content.hero_secondary_label}</button></div></div><div className="nx-hero-label"><span>{content.hero_brand_label}</span><small>{content.hero_brand_subtitle}</small></div></section><section className="nx-trust"><div><b>{content.trust_1_title}</b><span>{content.trust_1_text}</span></div><div><b>{content.trust_2_title}</b><span>{content.trust_2_text}</span></div><div><b>{content.trust_3_title}</b><span>{content.trust_3_text}</span></div><div><b>{content.trust_4_title}</b><span>{content.trust_4_text}</span></div></section><section className="nx-section nx-arrivals"><div className="nx-section-title"><div><small>{content.arrivals_eyebrow}</small><h2>{content.arrivals_title}</h2></div><button onClick={()=>goTarget(content.arrivals_cta_target)}>{content.arrivals_cta_label}</button></div><div className="nx-grid">{arrivals.map(p=><ProductCard key={p.id} product={p} mode={mode} onOpen={openProduct} content={content} favorite={account.favorites.includes(Number(p.id))} onFavorite={toggleFavorite}/>)}</div></section>{!!categories.length && <section className="nx-section" id="categories"><div className="nx-section-title"><div><small>{content.categories_eyebrow}</small><h2>{content.categories_title}</h2></div></div><div className="nx-category-grid">{categories.slice(0,6).map((cat,index)=>{ const p=products.find(x=>x.category===cat); const img=p?.image||p?.product_images?.[0]?.image_url||EDITORIAL[index%EDITORIAL.length]; return <button key={cat} onClick={()=>{setCategory(cat);setTimeout(()=>document.getElementById('shop')?.scrollIntoView({behavior:'smooth'}),50)}} style={{backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.6)),url('${img}')`}}><span>{cat}</span><small>{content.categories_item_cta}</small></button>})}</div></section>}<section className="nx-section" id="shop"><div className="nx-section-title nx-shop-head"><div><small>{content.shop_eyebrow}</small><h2>{content.shop_title}</h2></div><div className="nx-mode"><button className={mode==='retail'?'active':''} onClick={()=>setMode('retail')}>{content.shop_retail_label}</button><button className={mode==='wholesale'?'active':''} onClick={()=>account.isWholesaleApproved?setMode('wholesale'):setAccountOpen(true)}>{content.shop_wholesale_label}</button></div></div><div className="nx-filter-row"><button className={category==='all'?'active':''} onClick={()=>setCategory('all')}>{content.shop_all_label}</button>{categories.map(cat=><button key={cat} className={category===cat?'active':''} onClick={()=>setCategory(cat)}>{cat}</button>)}</div>{loading?<div className="nx-empty">{content.shop_loading_text}</div>:<div className="nx-grid">{visible.map(p=><ProductCard key={p.id} product={p} mode={mode} onOpen={openProduct} content={content} favorite={account.favorites.includes(Number(p.id))} onFavorite={toggleFavorite}/>)}</div>}</section><section className="nx-wholesale" id="wholesale"><div><small>{content.wholesale_eyebrow}</small><h2>{site.wholesale_title}</h2><p>{site.wholesale_text}</p><ul><li>{content.wholesale_bullet_1}</li><li>{content.wholesale_bullet_2}</li><li>{content.wholesale_bullet_3}</li></ul></div><div className="nx-wholesale-gate">{account.isWholesaleApproved ? <><strong>حساب عمده شما فعال است.</strong><p>قیمت همکاری در بخش فروشگاه برای شما نمایش داده می‌شود.</p><button className="nx-primary" onClick={()=>{setMode('wholesale');document.getElementById('shop')?.scrollIntoView({behavior:'smooth'})}}>ورود به خرید عمده</button></> : <><strong>خرید عمده با حساب تاییدشده</strong><p>برای دیدن قیمت همکاری و ثبت سفارش عمده، وارد حساب شو و درخواست همکاری را ثبت کن.</p><button className="nx-primary" onClick={()=>setAccountOpen(true)}>{account.session ? 'تکمیل درخواست عمده' : 'ورود / ساخت حساب'}</button></>}</div></section><section className="nx-editorial"><div className="nx-editorial-copy"><small>{content.editorial_eyebrow}</small><h2>{renderToken(content.editorial_title,vars)}</h2><p>{content.editorial_text}</p><a target="_blank" rel="noreferrer" href={content.editorial_cta_url || instagramUrl}>{content.editorial_cta_label}</a></div><div className="nx-editorial-grid">{editorial.map((img,i)=><a target="_blank" rel="noreferrer" href={content.editorial_cta_url || instagramUrl} key={`${img}-${i}`}><img src={img} alt="AVENZA style" loading="lazy"/></a>)}</div></section><section className="nx-about" id="about"><img src="/avenza-logo-v3.webp" alt="AVENZA"/><div><small>{content.about_eyebrow}</small><h2>{site.about_title}</h2><p>{site.about_text}</p></div></section><footer className="nx-footer"><div><img src="/avenza-logo-v3.webp" alt="AVENZA"/><b>{content.footer_brand}</b></div><div><span>{content.footer_instagram_label}</span><a target="_blank" rel="noreferrer" href={instagramUrl}>@{instagram}</a></div><div><span>{content.footer_contact_label}</span><a href={`tel:${site.phone}`}>{site.phone}</a><a target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}`}>{content.footer_whatsapp_label}</a></div><div><span>{content.footer_address_label}</span><p>{site.address}</p></div></footer></>}<nav className="nx-mobile-nav account-enabled"><button onClick={()=>navigate('/',setRoute)}>{content.mobile_home_label}</button><button onClick={()=>goTarget('#shop')}>{content.mobile_products_label}</button><button onClick={()=>setAccountOpen(true)}>{account.session?'حساب':'ورود'}</button><button onClick={()=>setCartOpen(true)}>{content.mobile_cart_label} <b>{cartCount}</b></button></nav><CartDrawer open={cartOpen} cart={cart} mode={mode} onClose={()=>setCartOpen(false)} onQty={changeQty} onCheckout={()=>{setCartOpen(false);setCheckoutOpen(true)}} content={content}/><Checkout open={checkoutOpen} cart={cart} mode={mode} onClose={()=>setCheckoutOpen(false)} onDone={()=>{setCheckoutOpen(false);setCart([])}} content={content}/><AccountPanel open={accountOpen} onClose={()=>setAccountOpen(false)} account={account}/></div>
}
