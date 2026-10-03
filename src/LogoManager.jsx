import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './supabase'

const DEFAULT_LOGO = '/avenza-logo-v3.webp'

async function getLogoUrl() {
  const { data } = await supabase.from('site_settings').select('content').eq('id', 1).maybeSingle()
  return data?.content?.logo_url || DEFAULT_LOGO
}

function applyLogo(url) {
  const logo = url || DEFAULT_LOGO
  document.querySelectorAll('.avenza-store .nx-brand img, .avenza-store .nx-footer img, .avenza-store .nx-about img, .avenza-store img[alt="AVENZA"]').forEach((img) => {
    if (img.getAttribute('src') !== logo) img.setAttribute('src', logo)
  })
  const favicon = document.querySelector('link[rel~="icon"]')
  if (favicon && favicon.getAttribute('href') !== logo) favicon.setAttribute('href', logo)
}

export function LogoApplicator() {
  useEffect(() => {
    let alive = true
    let currentLogo = DEFAULT_LOGO
    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => applyLogo(currentLogo))
    }
    getLogoUrl().then((url) => {
      if (!alive) return
      currentLogo = url
      schedule()
    })
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    const channel = supabase.channel('avenza-logo-settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: 'id=eq.1' }, (payload) => {
        currentLogo = payload.new?.content?.logo_url || DEFAULT_LOGO
        schedule()
      })
      .subscribe()
    return () => {
      alive = false
      observer.disconnect()
      cancelAnimationFrame(raf)
      supabase.removeChannel(channel)
    }
  }, [])
  return null
}

export function LogoEditorPortal() {
  const [target, setTarget] = useState(null)
  const [currentLogo, setCurrentLogo] = useState(DEFAULT_LOGO)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const findTarget = () => setTarget(document.querySelector('.site-editor .editor-fields'))
    findTarget()
    const observer = new MutationObserver(findTarget)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!target) return
    let alive = true
    getLogoUrl().then((url) => { if (alive) setCurrentLogo(url) })
    return () => { alive = false }
  }, [target])

  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const saveLogo = async () => {
    if (!file) { setMessage('اول یک فایل لوگو انتخاب کن.'); return }
    setBusy(true)
    setMessage('در حال آپلود و ذخیره لوگو...')
    try {
      const ext = String(file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp'
      const path = `site/logo-${Date.now()}.${ext}`
      const uploaded = await supabase.storage.from('products').upload(path, file, { upsert: false, contentType: file.type || undefined })
      if (uploaded.error) throw uploaded.error
      const logoUrl = supabase.storage.from('products').getPublicUrl(path).data.publicUrl
      const { data, error: readError } = await supabase.from('site_settings').select('content').eq('id', 1).maybeSingle()
      if (readError) throw readError
      const content = { ...(data?.content || {}), logo_url: logoUrl }
      const { error } = await supabase.from('site_settings').update({ content, updated_at: new Date().toISOString() }).eq('id', 1)
      if (error) throw error
      setCurrentLogo(logoUrl)
      setFile(null)
      setMessage('لوگوی جدید ذخیره و روی سایت منتشر شد.')
    } catch (error) {
      console.error(error)
      setMessage('ذخیره لوگو انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  const restoreDefault = async () => {
    setBusy(true)
    setMessage('در حال بازگردانی لوگوی پیش‌فرض...')
    try {
      const { data, error: readError } = await supabase.from('site_settings').select('content').eq('id', 1).maybeSingle()
      if (readError) throw readError
      const content = { ...(data?.content || {}), logo_url: DEFAULT_LOGO }
      const { error } = await supabase.from('site_settings').update({ content, updated_at: new Date().toISOString() }).eq('id', 1)
      if (error) throw error
      setCurrentLogo(DEFAULT_LOGO)
      setFile(null)
      setMessage('لوگوی پیش‌فرض برگردانده شد.')
    } catch (error) {
      console.error(error)
      setMessage('بازگردانی لوگو انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  if (!target) return null

  return createPortal(
    <section className="variant-section logo-editor-section">
      <div className="variant-section-head">
        <div><span>BRAND LOGO</span><h3>تغییر لوگوی سایت</h3></div>
        <button type="button" className="soft-btn" disabled={busy} onClick={restoreDefault}>لوگوی پیش‌فرض</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '140px minmax(0,1fr)', gap: 18, alignItems: 'center' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 16, padding: 10, background: '#fff', aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <img src={preview || currentLogo} alt="پیش‌نمایش لوگو" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <label className="upload-box">انتخاب لوگوی جدید
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <small>PNG، JPG، WEBP یا SVG. برای نتیجه بهتر لوگوی مربعی یا با پس‌زمینه شفاف استفاده کن.</small>
          </label>
          <button type="button" className="primary admin-save" disabled={busy || !file} onClick={saveLogo}>{busy ? 'در حال ذخیره...' : 'ذخیره و انتشار لوگو'}</button>
        </div>
      </div>
      {message && <div className="admin-message" style={{ marginTop: 12 }}>{message}</div>}
    </section>,
    target,
  )
}
