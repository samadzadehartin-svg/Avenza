import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const money = (value = 0) => new Intl.NumberFormat('fa-IR').format(Number(value || 0)) + ' تومان'
const cleanList = (items) => [...new Set(items.map((v) => String(v || '').trim()).filter(Boolean))]
const keyOf = (color, size) => `${color || '_'}::${size || '_'}`

const DEFAULT_SITE = {
  id: 1,
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

function AdminLogin({ onReady }) {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('aila.20021n@gmail.com')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const inspect = async (currentSession) => {
    setSession(currentSession)
    if (!currentSession) { setIsAdmin(false); setLoading(false); return }
    const { data } = await supabase.rpc('is_admin')
    setIsAdmin(Boolean(data)); setLoading(false)
    if (data) onReady?.()
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => inspect(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => inspect(currentSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  const login = async (e) => {
    e.preventDefault(); setMessage('در حال ورود...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMessage(error ? 'ایمیل یا رمز عبور صحیح نیست.' : '')
  }

  if (loading) return <div className="admin-login-wrap"><div className="admin-loading">در حال بررسی دسترسی...</div></div>
  if (!session) return <div className="admin-login-wrap"><div className="admin-login-card"><img src="/avenza-logo-v3.webp" alt="AVENZA" /><span>AVENZA ADMIN</span><h1>ورود مدیریت</h1><form onSubmit={login}><label>ایمیل<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>رمز عبور<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button className="primary full">ورود</button></form>{message && <p>{message}</p>}<a href="/">بازگشت به فروشگاه</a></div></div>
  if (!isAdmin) return <div className="admin-login-wrap"><div className="admin-login-card"><h2>این حساب دسترسی مدیریت ندارد.</h2><button className="primary" onClick={() => supabase.auth.signOut()}>خروج</button></div></div>
  return null
}

function ProductBuilder({ onSaved }) {
  const [form, setForm] = useState({ name: '', category: '', description: '', single_price: '', wholesale_price: '', featured: false })
  const [colors, setColors] = useState([{ name: '', files: [] }])
  const [sizes, setSizes] = useState([''])
  const [generalFiles, setGeneralFiles] = useState([])
  const [trackStock, setTrackStock] = useState(false)
  const [stock, setStock] = useState({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const colorNames = useMemo(() => cleanList(colors.map((c) => c.name)), [colors])
  const sizeNames = useMemo(() => cleanList(sizes), [sizes])
  const combos = useMemo(() => {
    const cs = colorNames.length ? colorNames : [null]
    const ss = sizeNames.length ? sizeNames : [null]
    return cs.flatMap((color) => ss.map((size) => ({ color, size })))
  }, [colorNames, sizeNames])

  const uploadFiles = async (productId, files, color, startOrder = 0) => {
    const rows = []
    let order = startOrder
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`
      const uploaded = await supabase.storage.from('products').upload(path, file)
      if (uploaded.error) throw uploaded.error
      rows.push({ product_id: productId, color: color || null, image_url: supabase.storage.from('products').getPublicUrl(path).data.publicUrl, sort_order: order++ })
    }
    return rows
  }

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMessage('در حال ذخیره محصول...')
    let productId = null
    try {
      const created = await supabase.from('products').insert({
        name: form.name.trim(), slug: `product-${Date.now()}`, category: form.category.trim() || null,
        description: form.description.trim() || null, single_price: Number(form.single_price || 0),
        wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : null,
        image: null, stock: 0, active: true, featured: Boolean(form.featured)
      }).select().single()
      if (created.error) throw created.error
      productId = created.data.id

      const variantRows = combos.map(({ color, size }) => ({ product_id: productId, color, size, stock: trackStock ? Math.max(0, Number(stock[keyOf(color, size)] || 0)) : null, sku: `AV-${productId}-${Math.random().toString(36).slice(2, 8)}` }))
      if (variantRows.length) {
        const result = await supabase.from('product_variants').insert(variantRows)
        if (result.error) throw result.error
      }

      let imageRows = await uploadFiles(productId, generalFiles, null, 0)
      for (const colorRow of colors) {
        if (!colorRow.name.trim() || !colorRow.files?.length) continue
        imageRows = imageRows.concat(await uploadFiles(productId, colorRow.files, colorRow.name.trim(), imageRows.length))
      }
      if (imageRows.length) {
        const result = await supabase.from('product_images').insert(imageRows)
        if (result.error) throw result.error
        await supabase.from('products').update({ image: imageRows[0].image_url }).eq('id', productId)
      }
      if (trackStock) await supabase.from('products').update({ stock: variantRows.reduce((sum, row) => sum + Number(row.stock || 0), 0) }).eq('id', productId)

      setForm({ name: '', category: '', description: '', single_price: '', wholesale_price: '', featured: false })
      setColors([{ name: '', files: [] }]); setSizes(['']); setGeneralFiles([]); setTrackStock(false); setStock({})
      setMessage('محصول ذخیره شد.'); onSaved?.()
    } catch (error) {
      console.error(error); setMessage('ذخیره محصول کامل نشد.')
      if (productId) await supabase.from('products').delete().eq('id', productId)
    } finally { setBusy(false) }
  }

  return <form className="admin-builder" onSubmit={submit}>
    <div className="admin-block-head"><div><span>PRODUCT BUILDER</span><h2>افزودن محصول</h2></div><label className="inline-check"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> پرفروش / منتخب</label></div>
    <div className="admin-form-grid"><label>نام محصول<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>دسته‌بندی<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label>قیمت تکی<input required type="number" min="0" value={form.single_price} onChange={(e) => setForm({ ...form, single_price: e.target.value })} /></label><label>قیمت عمده<input type="number" min="0" value={form.wholesale_price} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} /></label><label className="admin-wide">توضیحات<textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="admin-wide upload-box">عکس‌های عمومی محصول<input type="file" accept="image/*" multiple onChange={(e) => setGeneralFiles(Array.from(e.target.files || []))} /><small>{generalFiles.length} عکس انتخاب شده</small></label></div>

    <section className="variant-section"><div className="variant-section-head"><div><span>COLORS</span><h3>رنگ‌ها و عکس هر رنگ</h3></div><button type="button" className="soft-btn" onClick={() => setColors((rows) => [...rows, { name: '', files: [] }])}>+ رنگ</button></div><div className="variant-rows">{colors.map((row, index) => <div className="variant-row" key={index}><input placeholder="مثلاً مشکی" value={row.name} onChange={(e) => setColors((rows) => rows.map((r, i) => i === index ? { ...r, name: e.target.value } : r))} /><label className="mini-upload">عکس‌های این رنگ<input type="file" accept="image/*" multiple onChange={(e) => setColors((rows) => rows.map((r, i) => i === index ? { ...r, files: Array.from(e.target.files || []) } : r))} /></label><span>{row.files.length} عکس</span><button type="button" className="remove-btn" disabled={colors.length === 1} onClick={() => setColors((rows) => rows.filter((_, i) => i !== index))}>حذف</button></div>)}</div></section>

    <section className="variant-section"><div className="variant-section-head"><div><span>SIZES</span><h3>سایزها</h3></div><button type="button" className="soft-btn" onClick={() => setSizes((rows) => [...rows, ''])}>+ سایز</button></div><div className="size-editor">{sizes.map((size, index) => <div key={index}><input placeholder="M یا 38" value={size} onChange={(e) => setSizes((rows) => rows.map((v, i) => i === index ? e.target.value : v))} /><button type="button" disabled={sizes.length === 1} onClick={() => setSizes((rows) => rows.filter((_, i) => i !== index))}>×</button></div>)}</div></section>

    <section className="variant-section"><div className="variant-section-head"><div><span>INVENTORY</span><h3>موجودی</h3></div><label className="inline-check"><input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} /> موجودی محدود</label></div>{!trackStock ? <div className="inventory-note">اختیاری است؛ اگر خاموش باشد محصول بدون محدودیت تعداد قابل سفارش است.</div> : <div className="inventory-grid">{combos.map(({ color, size }) => <label key={keyOf(color, size)}><span>{[color, size].filter(Boolean).join(' / ') || 'محصول'}</span><input type="number" min="0" value={stock[keyOf(color, size)] ?? ''} onChange={(e) => setStock({ ...stock, [keyOf(color, size)]: e.target.value })} /></label>)}</div>}</section>

    {message && <div className="admin-message">{message}</div>}
    <button className="primary admin-save" disabled={busy}>{busy ? 'در حال ذخیره...' : 'ذخیره کامل محصول'}</button>
  </form>
}

function SiteEditor() {
  const [form, setForm] = useState(DEFAULT_SITE)
  const [heroFile, setHeroFile] = useState(null)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setForm({ ...DEFAULT_SITE, ...data })
      setBusy(false)
    })
  }, [])

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMessage('در حال ذخیره تغییرات سایت...')
    try {
      let heroImageUrl = form.hero_image_url || null
      if (heroFile) {
        const ext = heroFile.name.split('.').pop() || 'jpg'
        const path = `site/hero-${Date.now()}.${ext}`
        const uploaded = await supabase.storage.from('products').upload(path, heroFile, { upsert: false })
        if (uploaded.error) throw uploaded.error
        heroImageUrl = supabase.storage.from('products').getPublicUrl(path).data.publicUrl
      }
      const payload = { ...form, id: 1, hero_image_url: heroImageUrl, updated_at: new Date().toISOString() }
      const { error } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' })
      if (error) throw error
      setForm(payload); setHeroFile(null); setMessage('تغییرات سایت ذخیره شد و روی فرانت اعمال می‌شود.')
    } catch (error) { console.error(error); setMessage('ذخیره تغییرات انجام نشد.') }
    finally { setBusy(false) }
  }

  return <form className="site-editor" onSubmit={save}>
    <div className="admin-block-head"><div><span>SITE EDITOR</span><h2>ادیت سایت</h2></div><a className="preview-link" href="/" target="_blank" rel="noreferrer">مشاهده سایت ↗</a></div>
    <div className="editor-layout"><div className="editor-fields">
      <label>نوار بالای سایت<input value={form.announcement} onChange={(e) => setForm({ ...form, announcement: e.target.value })} /></label>
      <div className="editor-grid"><label>متن کوچک Hero<input value={form.hero_eyebrow} onChange={(e) => setForm({ ...form, hero_eyebrow: e.target.value })} /></label><label>عنوان اصلی Hero<input value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} /></label></div>
      <label>توضیح Hero<textarea rows="3" value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} /></label>
      <label className="upload-box">عکس بزرگ صفحه اول<input type="file" accept="image/*" onChange={(e) => setHeroFile(e.target.files?.[0] || null)} /><small>بهتر است عکس عمودی فشن با کیفیت بالا باشد.</small></label>
      <div className="editor-grid"><label>عنوان درباره ما<input value={form.about_title} onChange={(e) => setForm({ ...form, about_title: e.target.value })} /></label><label>عنوان عمده<input value={form.wholesale_title} onChange={(e) => setForm({ ...form, wholesale_title: e.target.value })} /></label></div>
      <label>متن درباره ما<textarea rows="3" value={form.about_text} onChange={(e) => setForm({ ...form, about_text: e.target.value })} /></label>
      <label>متن همکاری عمده<textarea rows="3" value={form.wholesale_text} onChange={(e) => setForm({ ...form, wholesale_text: e.target.value })} /></label>
      <div className="editor-grid"><label>اینستاگرام<input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></label><label>تلفن<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>واتساپ<input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label></div>
      <label>آدرس<textarea rows="2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
      {message && <div className="admin-message">{message}</div>}
      <button className="primary admin-save" disabled={busy}>{busy ? 'در حال ذخیره...' : 'ذخیره و انتشار تغییرات'}</button>
    </div><aside className="editor-preview"><span>PREVIEW</span><div className="editor-preview-image">{form.hero_image_url ? <img src={form.hero_image_url} alt="Hero" /> : <img src="/avenza-logo-v3.webp" alt="AVENZA" />}</div><small>عکس Hero فعلی</small></aside></div>
  </form>
}

export default function Admin() {
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    const [p, o, r] = await Promise.all([
      supabase.from('products').select('*, product_variants(*), product_images(*)').order('created_at', { ascending: false }),
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      supabase.from('wholesale_requests').select('*').order('created_at', { ascending: false })
    ])
    setProducts(p.data || []); setOrders(o.data || []); setRequests(r.data || []); setLoading(false)
  }
  useEffect(() => { if (ready) refresh() }, [ready])

  const toggleProduct = async (product) => { await supabase.from('products').update({ active: !product.active }).eq('id', product.id); refresh() }
  const setOrderStatus = async (id, status) => { await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id); refresh() }
  const setRequestStatus = async (id, status) => { await supabase.from('wholesale_requests').update({ status }).eq('id', id); refresh() }

  return <div className="admin-page">
    <AdminLogin onReady={() => setReady(true)} />
    {ready && <><header className="admin-header"><a className="admin-brand" href="/"><img src="/avenza-logo-v3.webp" alt="AVENZA" /><div><strong>AVENZA</strong><span>ADMIN PANEL</span></div></a><nav><button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>محصولات</button><button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>سفارش‌ها</button><button className={tab === 'wholesale' ? 'active' : ''} onClick={() => setTab('wholesale')}>عمده</button><button className={tab === 'site' ? 'active' : ''} onClick={() => setTab('site')}>ادیت سایت</button></nav><div className="admin-header-actions"><a href="/" target="_blank" rel="noreferrer">مشاهده سایت</a><button onClick={() => supabase.auth.signOut()}>خروج</button></div></header>

    <main className="admin-content">
      {tab === 'products' && <div className="admin-products-page"><ProductBuilder onSaved={refresh} /><section className="admin-catalog"><div className="admin-block-head"><div><span>CATALOG</span><h2>محصولات ثبت‌شده</h2></div><b>{products.length}</b></div>{loading ? <div className="admin-loading">در حال بارگذاری...</div> : <div className="admin-product-list">{products.map((product) => { const colors = cleanList((product.product_variants || []).map((v) => v.color)); const sizes = cleanList((product.product_variants || []).map((v) => v.size)); const tracked = (product.product_variants || []).some((v) => v.stock !== null); const total = (product.product_variants || []).reduce((sum, v) => sum + Number(v.stock || 0), 0); return <article className="admin-product-card" key={product.id}><div className="admin-product-thumb">{product.image ? <img src={product.image} alt="" /> : <span>AV</span>}</div><div className="admin-product-info"><strong>{product.name}</strong><small>{product.category || 'بدون دسته'} · {money(product.single_price)}</small><div className="variant-summary"><span>{colors.length ? colors.join('، ') : 'بدون رنگ'}</span><span>{sizes.length ? sizes.join('، ') : 'بدون سایز'}</span><span>{tracked ? `موجودی ${total}` : 'نامحدود'}</span><span>{product.product_images?.length || 0} عکس</span></div></div><button className={product.active ? 'status-live' : 'status-off'} onClick={() => toggleProduct(product)}>{product.active ? 'فعال' : 'غیرفعال'}</button></article> })}{!products.length && <div className="empty">هنوز محصولی ثبت نشده.</div>}</div>}</section></div>}

      {tab === 'orders' && <section className="admin-table-section"><div className="admin-block-head"><div><span>ORDERS</span><h2>سفارش‌ها</h2></div><b>{orders.length}</b></div><div className="admin-order-list">{orders.map((order) => <article className="admin-order-card" key={order.id}><div><strong>#{order.id} · {order.name}</strong><small>{order.phone} · {order.order_type === 'wholesale' ? 'عمده' : 'تکی'} · {money(order.total)}</small><p>{order.address}</p>{order.order_items?.map((item) => <em key={item.id}>{item.product_name} {item.color || ''} {item.size || ''} × {item.quantity}</em>)}</div><select value={order.status} onChange={(e) => setOrderStatus(order.id, e.target.value)}><option>جدید</option><option>در حال بررسی</option><option>تایید شده</option><option>ارسال شده</option><option>لغو شده</option></select></article>)}{!orders.length && <div className="empty">سفارشی وجود ندارد.</div>}</div></section>}

      {tab === 'wholesale' && <section className="admin-table-section"><div className="admin-block-head"><div><span>WHOLESALE</span><h2>درخواست‌های عمده</h2></div><b>{requests.length}</b></div><div className="admin-order-list">{requests.map((request) => <article className="admin-order-card" key={request.id}><div><strong>{request.name}{request.shop ? ` · ${request.shop}` : ''}</strong><small>{request.phone} · تعداد تقریبی {request.count || '—'}</small></div><select value={request.status} onChange={(e) => setRequestStatus(request.id, e.target.value)}><option>جدید</option><option>تماس گرفته شد</option><option>تایید شد</option><option>رد شد</option></select></article>)}{!requests.length && <div className="empty">درخواستی وجود ندارد.</div>}</div></section>}

      {tab === 'site' && <SiteEditor />}
    </main></>}
  </div>
}
