import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const statusLabel = (status) => ({ pending: 'در انتظار تایید', approved: 'تایید شده', rejected: 'رد شده' }[status] || status || 'ثبت نشده')

export function useCustomerSession() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [wholesale, setWholesale] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const hydrate = async (nextSession) => {
    setSession(nextSession || null)
    if (!nextSession?.user) {
      setProfile(null); setWholesale(null); setFavorites([]); setOrders([]); setLoading(false)
      return
    }
    const userId = nextSession.user.id
    const [p, w, f, o] = await Promise.all([
      supabase.from('customer_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('wholesale_accounts').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('favorites').select('product_id').eq('user_id', userId),
      supabase.from('orders').select('id,total,status,order_type,created_at,order_items(product_name,color,size,quantity)').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    ])
    setProfile(p.data || null)
    setWholesale(w.data || null)
    setFavorites((f.data || []).map((row) => Number(row.product_id)))
    setOrders(o.data || [])
    setLoading(false)
  }

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive) hydrate(data.session) })
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => { if (alive) hydrate(nextSession) }, 0)
    })
    return () => { alive = false; authListener.subscription.unsubscribe() }
  }, [])

  const signIn = async (email, password) => supabase.auth.signInWithPassword({ email, password })

  const signUp = async ({ email, password, fullName, phone, wantsWholesale, shopName }) => supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        wholesale_requested: Boolean(wantsWholesale),
        shop_name: wantsWholesale ? shopName : null,
      },
    },
  })

  const signOut = async () => { await supabase.auth.signOut(); await hydrate(null) }

  const updateProfile = async ({ fullName, phone, address }) => {
    if (!session?.user) return { error: new Error('not_signed_in') }
    const payload = { user_id: session.user.id, full_name: fullName || null, phone: phone || null, address: address || null, updated_at: new Date().toISOString() }
    const result = await supabase.from('customer_profiles').upsert(payload, { onConflict: 'user_id' }).select().single()
    if (!result.error) setProfile(result.data)
    return result
  }

  const requestWholesale = async ({ shopName, phone }) => {
    if (!session?.user) return { error: new Error('not_signed_in') }
    const result = await supabase.rpc('request_wholesale_access', { p_shop_name: shopName, p_phone: phone })
    if (!result.error) {
      const { data } = await supabase.from('wholesale_accounts').select('*').eq('user_id', session.user.id).maybeSingle()
      setWholesale(data || null)
    }
    return result
  }

  const toggleFavorite = async (productId) => {
    if (!session?.user) return { needsAuth: true }
    const id = Number(productId)
    const has = favorites.includes(id)
    const result = has
      ? await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('product_id', id)
      : await supabase.from('favorites').insert({ user_id: session.user.id, product_id: id })
    if (!result.error) setFavorites((items) => has ? items.filter((x) => x !== id) : [...items, id])
    return { error: result.error || null }
  }

  return {
    session, profile, wholesale, favorites, orders, loading,
    isWholesaleApproved: wholesale?.status === 'approved',
    signIn, signUp, signOut, updateProfile, requestWholesale, toggleFavorite,
  }
}

export function AccountPanel({ open, onClose, account }) {
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '', phone: '', wantsWholesale: false, shopName: '' })
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', address: '' })
  const [wholesaleForm, setWholesaleForm] = useState({ shopName: '', phone: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setProfileForm({
      fullName: account.profile?.full_name || '',
      phone: account.profile?.phone || '',
      address: account.profile?.address || '',
    })
    setWholesaleForm({
      shopName: account.wholesale?.shop_name || '',
      phone: account.wholesale?.phone || account.profile?.phone || '',
    })
  }, [account.profile, account.wholesale])

  const submitAuth = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('')
    if (authMode === 'login') {
      const { error } = await account.signIn(authForm.email.trim(), authForm.password)
      setMessage(error ? 'ایمیل یا رمز عبور صحیح نیست.' : '')
    } else {
      const { data, error } = await account.signUp(authForm)
      if (error) setMessage(error.message || 'ساخت حساب انجام نشد.')
      else if (!data.session) setMessage('حساب ساخته شد. لینک تایید ایمیل را باز کن و سپس وارد شو.')
      else setMessage('حساب ساخته شد.')
    }
    setBusy(false)
  }

  const saveProfile = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('')
    const { error } = await account.updateProfile(profileForm)
    setMessage(error ? 'ذخیره اطلاعات انجام نشد.' : 'اطلاعات حساب ذخیره شد.')
    setBusy(false)
  }

  const requestWholesale = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('')
    const { error } = await account.requestWholesale(wholesaleForm)
    setMessage(error ? 'ثبت درخواست عمده انجام نشد.' : 'درخواست عمده ثبت شد و بعد از تایید مدیریت فعال می‌شود.')
    setBusy(false)
  }

  const orders = useMemo(() => account.orders || [], [account.orders])
  if (!open) return null

  return <div className="ca-shell">
    <button className="ca-backdrop" type="button" onClick={onClose} aria-label="بستن" />
    <aside className="ca-panel">
      <header className="ca-head"><div><small>AVENZA ACCOUNT</small><h2>{account.session ? 'حساب من' : 'ورود / عضویت'}</h2></div><button type="button" onClick={onClose}>×</button></header>
      {account.loading ? <div className="ca-empty">در حال بارگذاری...</div> : !account.session ? <>
        <div className="ca-tabs"><button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>ورود</button><button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>ساخت حساب</button></div>
        <form className="ca-form" onSubmit={submitAuth}>
          {authMode === 'signup' && <><label>نام و نام خانوادگی<input required value={authForm.fullName} onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })} /></label><label>شماره تماس<input required inputMode="tel" value={authForm.phone} onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })} /></label></>}
          <label>ایمیل<input required type="email" autoComplete="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /></label>
          <label>رمز عبور<input required type="password" minLength="6" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} /></label>
          {authMode === 'signup' && <div className="ca-wholesale-signup"><label className="ca-check"><input type="checkbox" checked={authForm.wantsWholesale} onChange={(e) => setAuthForm({ ...authForm, wantsWholesale: e.target.checked })} /> حساب را برای خرید عمده می‌خواهم</label>{authForm.wantsWholesale && <label>نام فروشگاه / مزون<input required value={authForm.shopName} onChange={(e) => setAuthForm({ ...authForm, shopName: e.target.value })} /></label>}</div>}
          <button className="nx-primary" disabled={busy}>{busy ? 'در حال انجام...' : authMode === 'login' ? 'ورود' : 'ساخت حساب'}</button>
        </form>
      </> : <div className="ca-authenticated">
        <div className="ca-user-card"><div><small>{account.session.user.email}</small><strong>{account.profile?.full_name || 'مشتری AVENZA'}</strong></div><button type="button" onClick={account.signOut}>خروج</button></div>
        <section className="ca-section"><div className="ca-section-title"><span>حساب همکاری</span><b className={account.isWholesaleApproved ? 'ok' : ''}>{statusLabel(account.wholesale?.status)}</b></div>{!account.isWholesaleApproved && <form className="ca-form compact" onSubmit={requestWholesale}><label>نام فروشگاه / مزون<input required value={wholesaleForm.shopName} onChange={(e) => setWholesaleForm({ ...wholesaleForm, shopName: e.target.value })} /></label><label>شماره تماس<input required inputMode="tel" value={wholesaleForm.phone} onChange={(e) => setWholesaleForm({ ...wholesaleForm, phone: e.target.value })} /></label><button className="nx-primary" disabled={busy}>ثبت درخواست خرید عمده</button></form>}</section>
        <section className="ca-section"><div className="ca-section-title"><span>اطلاعات من</span></div><form className="ca-form compact" onSubmit={saveProfile}><label>نام و نام خانوادگی<input value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} /></label><label>شماره تماس<input inputMode="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></label><label>آدرس<textarea rows="3" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} /></label><button className="nx-primary" disabled={busy}>ذخیره اطلاعات</button></form></section>
        <section className="ca-section"><div className="ca-section-title"><span>سفارش‌های من</span><b>{orders.length}</b></div><div className="ca-orders">{orders.map((order) => <article key={order.id}><div><strong>سفارش #{order.id}</strong><small>{order.order_type === 'wholesale' ? 'عمده' : 'تکی'} · {order.status}</small></div><b>{new Intl.NumberFormat('fa-IR').format(Number(order.total || 0))} تومان</b></article>)}{!orders.length && <div className="ca-empty">هنوز سفارشی ثبت نشده.</div>}</div></section>
        <section className="ca-section ca-favorite-count"><span>علاقه‌مندی‌ها</span><b>{account.favorites.length}</b></section>
      </div>}
      {message && <div className="ca-message">{message}</div>}
    </aside>
  </div>
}
