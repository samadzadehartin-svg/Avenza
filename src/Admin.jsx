import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const money = (value = 0) => new Intl.NumberFormat('fa-IR').format(Number(value || 0)) + ' تومان'
const cleanList = (items) => [...new Set(items.map((v) => String(v || '').trim()).filter(Boolean))]
const keyOf = (color, size) => `${color || '_'}::${size || '_'}`

function AdminLogin({ onReady }) {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('aila.20021n@gmail.com')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const inspect = async (currentSession) => {
    setSession(currentSession)
    if (!currentSession) {
      setIsAdmin(false)
      setLoading(false)
      return
    }
    const { data } = await supabase.rpc('is_admin')
    setIsAdmin(Boolean(data))
    setLoading(false)
    if (data) onReady?.()
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => inspect(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => inspect(currentSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  const login = async (e) => {
    e.preventDefault()
    setMessage('در حال ورود...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMessage(error ? 'ایمیل یا رمز عبور صحیح نیست.' : '')
  }

  if (loading) return <div className="admin-loading">در حال بررسی دسترسی...</div>
  if (!session) {
    return <div className="admin-login-card">
      <img src="/avenza-logo.webp" alt="AVENZA" />
      <span>AVENZA ADMIN</span>
      <h1>ورود مدیریت</h1>
      <form onSubmit={login}>
        <label>ایمیل<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>رمز عبور<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="primary full">ورود</button>
      </form>
      {message && <p className="admin-form-message">{message}</p>}
      <a href="/">بازگشت به فروشگاه</a>
    </div>
  }
  if (!isAdmin) {
    return <div className="admin-login-card"><h2>این حساب دسترسی مدیریت ندارد.</h2><button className="dark" onClick={() => supabase.auth.signOut()}>خروج</button></div>
  }
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

  const addColor = () => setColors((rows) => [...rows, { name: '', files: [] }])
  const addSize = () => setSizes((rows) => [...rows, ''])
  const updateColor = (index, patch) => setColors((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row))
  const removeColor = (index) => setColors((rows) => rows.filter((_, i) => i !== index))
  const removeSize = (index) => setSizes((rows) => rows.filter((_, i) => i !== index))

  const uploadFiles = async (productId, files, color, startOrder = 0) => {
    const rows = []
    let order = startOrder
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`
      const uploaded = await supabase.storage.from('products').upload(path, file)
      if (uploaded.error) throw uploaded.error
      const imageUrl = supabase.storage.from('products').getPublicUrl(path).data.publicUrl
      rows.push({ product_id: productId, color: color || null, image_url: imageUrl, sort_order: order++ })
    }
    return rows
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage('در حال ذخیره محصول...')
    let productId = null
    try {
      const payload = {
        name: form.name.trim(),
        slug: `product-${Date.now()}`,
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        single_price: Number(form.single_price || 0),
        wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : null,
        image: null,
        stock: 0,
        active: true,
        featured: Boolean(form.featured)
      }
      const created = await supabase.from('products').insert(payload).select().single()
      if (created.error) throw created.error
      productId = created.data.id

      const variantRows = combos.map(({ color, size }) => ({
        product_id: productId,
        color,
        size,
        stock: trackStock ? Math.max(0, Number(stock[keyOf(color, size)] || 0)) : null,
        sku: `AV-${productId}-${String(color || 'NA').slice(0, 3)}-${String(size || 'NA').slice(0, 4)}-${Math.random().toString(36).slice(2, 7)}`
      }))
      if (variantRows.length) {
        const insertedVariants = await supabase.from('product_variants').insert(variantRows)
        if (insertedVariants.error) throw insertedVariants.error
      }

      let imageRows = await uploadFiles(productId, generalFiles, null, 0)
      for (const colorRow of colors) {
        if (!colorRow.name.trim() || !colorRow.files?.length) continue
        const nextRows = await uploadFiles(productId, colorRow.files, colorRow.name.trim(), imageRows.length)
        imageRows = imageRows.concat(nextRows)
      }
      if (imageRows.length) {
        const insertedImages = await supabase.from('product_images').insert(imageRows)
        if (insertedImages.error) throw insertedImages.error
        await supabase.from('products').update({ image: imageRows[0].image_url }).eq('id', productId)
      }

      if (trackStock) {
        const totalStock = variantRows.reduce((sum, row) => sum + Number(row.stock || 0), 0)
        await supabase.from('products').update({ stock: totalStock }).eq('id', productId)
      }

      setForm({ name: '', category: '', description: '', single_price: '', wholesale_price: '', featured: false })
      setColors([{ name: '', files: [] }])
      setSizes([''])
      setGeneralFiles([])
      setTrackStock(false)
      setStock({})
      setMessage('محصول با همه رنگ‌ها، سایزها و تصاویر ذخیره شد.')
      onSaved?.()
    } catch (error) {
      console.error(error)
      setMessage('ذخیره محصول کامل نشد. اطلاعات را بررسی و دوباره تلاش کنید.')
      if (productId) await supabase.from('products').delete().eq('id', productId)
    } finally {
      setBusy(false)
    }
  }

  return <form className="admin-builder" onSubmit={submit}>
    <div className="admin-block-head"><div><span>PRODUCT BUILDER</span><h2>افزودن محصول</h2></div><label className="admin-check"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> نمایش در منتخب‌ها</label></div>

    <div className="admin-form-grid">
      <label>نام محصول<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label>دسته‌بندی<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
      <label>قیمت تکی<input required type="number" min="0" value={form.single_price} onChange={(e) => setForm({ ...form, single_price: e.target.value })} /></label>
      <label>قیمت عمده<input type="number" min="0" value={form.wholesale_price} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} /></label>
      <label className="admin-wide">توضیحات<textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className="admin-wide">عکس‌های عمومی محصول<input type="file" accept="image/*" multiple onChange={(e) => setGeneralFiles(Array.from(e.target.files || []))} /><small>می‌توانی چند عکس انتخاب کنی.</small></label>
    </div>

    <section className="variant-section">
      <div className="variant-section-head"><div><span>COLORS</span><h3>رنگ‌ها و عکس‌های هر رنگ</h3></div><button type="button" className="soft-btn" onClick={addColor}>+ افزودن رنگ</button></div>
      <div className="variant-rows">
        {colors.map((row, index) => <div className="variant-row color-row" key={index}>
          <input placeholder="مثلاً مشکی" value={row.name} onChange={(e) => updateColor(index, { name: e.target.value })} />
          <label className="compact-upload">عکس‌های این رنگ<input type="file" accept="image/*" multiple onChange={(e) => updateColor(index, { files: Array.from(e.target.files || []) })} /></label>
          <span>{row.files?.length || 0} عکس</span>
          <button type="button" className="remove-btn" onClick={() => removeColor(index)} disabled={colors.length === 1}>حذف</button>
        </div>)}
      </div>
    </section>

    <section className="variant-section">
      <div className="variant-section-head"><div><span>SIZES</span><h3>سایزها</h3></div><button type="button" className="soft-btn" onClick={addSize}>+ افزودن سایز</button></div>
      <div className="size-chip-editor">
        {sizes.map((size, index) => <div className="size-edit" key={index}><input placeholder="مثلاً M یا 38" value={size} onChange={(e) => setSizes((rows) => rows.map((v, i) => i === index ? e.target.value : v))} /><button type="button" onClick={() => removeSize(index)} disabled={sizes.length === 1}>×</button></div>)}
      </div>
    </section>

    <section className="variant-section">
      <div className="variant-section-head inventory-head"><div><span>INVENTORY</span><h3>موجودی ترکیب‌ها</h3></div><label className="inventory-toggle"><input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} /><span>موجودی محدود ثبت شود</span></label></div>
      {!trackStock ? <div className="inventory-note">موجودی اختیاری است. در این حالت محصول «موجود» در نظر گرفته می‌شود و تعداد از سفارش کم نمی‌شود.</div> : <div className="inventory-grid">
        {combos.map(({ color, size }) => <label key={keyOf(color, size)}><span>{[color, size].filter(Boolean).join(' / ') || 'محصول'}</span><input type="number" min="0" placeholder="0" value={stock[keyOf(color, size)] ?? ''} onChange={(e) => setStock({ ...stock, [keyOf(color, size)]: e.target.value })} /></label>)}
      </div>}
    </section>

    {message && <div className="admin-save-message">{message}</div>}
    <button className="primary admin-save" disabled={busy}>{busy ? 'در حال ذخیره...' : 'ذخیره کامل محصول'}</button>
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
    setProducts(p.data || [])
    setOrders(o.data || [])
    setRequests(r.data || [])
    setLoading(false)
  }

  useEffect(() => { if (ready) refresh() }, [ready])

  const toggleProduct = async (product) => {
    await supabase.from('products').update({ active: !product.active }).eq('id', product.id)
    refresh()
  }
  const setOrderStatus = async (id, status) => {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    refresh()
  }
  const setRequestStatus = async (id, status) => {
    await supabase.from('wholesale_requests').update({ status }).eq('id', id)
    refresh()
  }

  return <div className="admin-page">
    <AdminLogin onReady={() => setReady(true)} />
    {ready && <>
      <header className="admin-header">
        <a className="admin-brand" href="/"><img src="/avenza-logo.webp" alt="AVENZA" /><div><strong>AVENZA</strong><span>ADMIN PANEL</span></div></a>
        <nav>
          <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>محصولات</button>
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>سفارش‌ها</button>
          <button className={tab === 'wholesale' ? 'active' : ''} onClick={() => setTab('wholesale')}>عمده</button>
        </nav>
        <div className="admin-header-actions"><a href="/">مشاهده فروشگاه</a><button onClick={() => supabase.auth.signOut()}>خروج</button></div>
      </header>

      <main className="admin-content">
        {tab === 'products' && <div className="admin-products-page">
          <ProductBuilder onSaved={refresh} />
          <section className="admin-catalog">
            <div className="admin-block-head"><div><span>CATALOG</span><h2>محصولات ثبت‌شده</h2></div><b>{products.length}</b></div>
            {loading ? <div className="admin-loading">در حال بارگذاری...</div> : <div className="admin-product-list">{products.map((product) => {
              const colors = cleanList((product.product_variants || []).map((v) => v.color))
              const sizes = cleanList((product.product_variants || []).map((v) => v.size))
              const tracked = (product.product_variants || []).some((v) => v.stock !== null)
              const total = (product.product_variants || []).reduce((sum, v) => sum + Number(v.stock || 0), 0)
              return <article className="admin-product-card" key={product.id}>
                <div className="admin-product-thumb">{product.image ? <img src={product.image} alt="" /> : <span>AV</span>}</div>
                <div className="admin-product-info"><strong>{product.name}</strong><small>{product.category || 'بدون دسته'} · {money(product.single_price)}</small><div className="variant-summary"><span>{colors.length ? colors.join('، ') : 'بدون رنگ'}</span><span>{sizes.length ? sizes.join('، ') : 'بدون سایز'}</span><span>{tracked ? `موجودی کل ${total}` : 'موجودی نامحدود'}</span><span>{product.product_images?.length || 0} عکس</span></div></div>
                <button className={product.active ? 'status-live' : 'status-off'} onClick={() => toggleProduct(product)}>{product.active ? 'فعال' : 'غیرفعال'}</button>
              </article>
            })}{!products.length && <div className="empty">هنوز محصولی ثبت نشده.</div>}</div>}
          </section>
        </div>}

        {tab === 'orders' && <section className="admin-table-section"><div className="admin-block-head"><div><span>ORDERS</span><h2>سفارش‌ها</h2></div><b>{orders.length}</b></div><div className="admin-order-list">{orders.map((order) => <article className="admin-order-card" key={order.id}><div><strong>#{order.id} · {order.name}</strong><small>{order.phone} · {order.order_type === 'wholesale' ? 'عمده' : 'تکی'} · {money(order.total)}</small><p>{order.address}</p>{order.order_items?.map((item) => <em key={item.id}>{item.product_name} {item.color || ''} {item.size || ''} × {item.quantity}</em>)}</div><select value={order.status} onChange={(e) => setOrderStatus(order.id, e.target.value)}><option>جدید</option><option>در حال بررسی</option><option>تایید شده</option><option>ارسال شده</option><option>لغو شده</option></select></article>)}{!orders.length && <div className="empty">سفارشی وجود ندارد.</div>}</div></section>}

        {tab === 'wholesale' && <section className="admin-table-section"><div className="admin-block-head"><div><span>WHOLESALE</span><h2>درخواست‌های عمده</h2></div><b>{requests.length}</b></div><div className="admin-order-list">{requests.map((request) => <article className="admin-order-card" key={request.id}><div><strong>{request.name}{request.shop ? ` · ${request.shop}` : ''}</strong><small>{request.phone} · تعداد تقریبی {request.count || '—'}</small></div><select value={request.status} onChange={(e) => setRequestStatus(request.id, e.target.value)}><option>جدید</option><option>تماس گرفته شد</option><option>تایید شد</option><option>رد شد</option></select></article>)}{!requests.length && <div className="empty">درخواستی وجود ندارد.</div>}</div></section>}
      </main>
    </>}
  </div>
}
