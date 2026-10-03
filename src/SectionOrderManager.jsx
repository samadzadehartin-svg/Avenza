import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './supabase'

const SECTION_DEFS = [
  { key: 'hero', label: 'Hero / بخش اول', selector: '.nx-hero' },
  { key: 'trust', label: 'مزیت‌ها', selector: '.nx-trust' },
  { key: 'arrivals', label: 'جدیدترین انتخاب‌ها', selector: '.nx-arrivals' },
  { key: 'categories', label: 'دسته‌بندی‌ها', selector: '#categories' },
  { key: 'shop', label: 'فروشگاه', selector: '#shop' },
  { key: 'wholesale', label: 'خرید عمده', selector: '#wholesale' },
  { key: 'editorial', label: 'اینستاگرام / Follow the look', selector: '.nx-editorial' },
  { key: 'about', label: 'درباره AVENZA', selector: '#about' },
]

export const DEFAULT_SECTION_ORDER = SECTION_DEFS.map((item) => item.key)

function normalizeOrder(value) {
  const known = new Set(DEFAULT_SECTION_ORDER)
  const source = Array.isArray(value) ? value : []
  const cleaned = source.filter((key, index) => known.has(key) && source.indexOf(key) === index)
  return [...cleaned, ...DEFAULT_SECTION_ORDER.filter((key) => !cleaned.includes(key))]
}

async function loadOrder() {
  const { data } = await supabase.from('site_settings').select('content').eq('id', 1).maybeSingle()
  return normalizeOrder(data?.content?.section_order)
}

async function saveOrder(order) {
  const normalized = normalizeOrder(order)
  const { data, error: readError } = await supabase.from('site_settings').select('content').eq('id', 1).maybeSingle()
  if (readError) throw readError
  const content = { ...(data?.content || {}), section_order: normalized }
  const { error } = await supabase.from('site_settings').update({ content, updated_at: new Date().toISOString() }).eq('id', 1)
  if (error) throw error
  return normalized
}

function applyHomepageOrder(order) {
  const root = document.querySelector('.avenza-store')
  if (!root) return
  const footer = root.querySelector(':scope > .nx-footer')
  if (!footer) return
  const nodes = new Map()
  SECTION_DEFS.forEach(({ key, selector }) => {
    const node = root.querySelector(`:scope > ${selector}`)
    if (node) nodes.set(key, node)
  })
  normalizeOrder(order).forEach((key) => {
    const node = nodes.get(key)
    if (node && node.parentElement === root) root.insertBefore(node, footer)
  })
}

export function OrderedStore({ children }) {
  const orderRef = useRef(DEFAULT_SECTION_ORDER)
  const rafRef = useRef(0)

  useEffect(() => {
    let alive = true
    const scheduleApply = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => applyHomepageOrder(orderRef.current))
    }
    loadOrder().then((order) => {
      if (!alive) return
      orderRef.current = order
      scheduleApply()
    })
    const observer = new MutationObserver(scheduleApply)
    observer.observe(document.body, { childList: true, subtree: true })
    const channel = supabase.channel('avenza-section-order')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: 'id=eq.1' }, (payload) => {
        orderRef.current = normalizeOrder(payload.new?.content?.section_order)
        scheduleApply()
      })
      .subscribe()
    return () => {
      alive = false
      observer.disconnect()
      cancelAnimationFrame(rafRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  return children
}

export function SectionOrderEditorPortal() {
  const [target, setTarget] = useState(null)
  const [order, setOrder] = useState(DEFAULT_SECTION_ORDER)
  const [dragged, setDragged] = useState(null)
  const [status, setStatus] = useState('')
  const orderRef = useRef(order)
  const saveSeq = useRef(0)
  orderRef.current = order

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
    loadOrder().then((next) => { if (alive) { setOrder(next); orderRef.current = next } })
    return () => { alive = false }
  }, [target])

  const persist = async (next) => {
    const seq = ++saveSeq.current
    setStatus('در حال ذخیره ترتیب...')
    try {
      const saved = await saveOrder(next)
      if (seq === saveSeq.current) {
        setOrder(saved)
        orderRef.current = saved
        setStatus('ترتیب ذخیره و منتشر شد.')
      }
    } catch (error) {
      console.error(error)
      if (seq === saveSeq.current) setStatus('ذخیره ترتیب انجام نشد.')
    }
  }

  useEffect(() => {
    if (!target) return
    const form = target.closest('form.site-editor')
    if (!form) return
    const handleSubmit = () => {
      const snapshot = [...orderRef.current]
      window.setTimeout(() => persist(snapshot), 900)
    }
    form.addEventListener('submit', handleSubmit)
    return () => form.removeEventListener('submit', handleSubmit)
  }, [target])

  const moveTo = (fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey) return
    const next = [...orderRef.current]
    const from = next.indexOf(fromKey)
    const to = next.indexOf(toKey)
    if (from < 0 || to < 0) return
    next.splice(from, 1)
    next.splice(to, 0, fromKey)
    setOrder(next)
    orderRef.current = next
    persist(next)
  }

  const moveBy = (key, delta) => {
    const next = [...orderRef.current]
    const index = next.indexOf(key)
    const targetIndex = index + delta
    if (index < 0 || targetIndex < 0 || targetIndex >= next.length) return
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    setOrder(next)
    orderRef.current = next
    persist(next)
  }

  if (!target) return null

  return createPortal(
    <section className="variant-section section-order-editor">
      <div className="variant-section-head">
        <div><span>SECTION ORDER</span><h3>جابجایی قسمت‌های صفحه اصلی</h3></div>
        <button type="button" className="soft-btn" onClick={() => { setOrder(DEFAULT_SECTION_ORDER); orderRef.current = DEFAULT_SECTION_ORDER; persist(DEFAULT_SECTION_ORDER) }}>ترتیب پیش‌فرض</button>
      </div>
      <p style={{ marginTop: 0, color: '#666', lineHeight: 1.9 }}>هر ردیف را بگیر و بکش. با فلش‌ها هم می‌توانی بخش‌ها را بالا و پایین ببری. تغییر ترتیب مستقیم روی فرانت ذخیره می‌شود.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        {order.map((key, index) => {
          const item = SECTION_DEFS.find((row) => row.key === key)
          if (!item) return null
          return <div
            key={key}
            draggable
            onDragStart={() => setDragged(key)}
            onDragEnd={() => setDragged(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); moveTo(dragged, key); setDragged(null) }}
            style={{ display: 'grid', gridTemplateColumns: '42px 1fr auto', gap: 10, alignItems: 'center', padding: '12px 14px', border: dragged === key ? '1px solid #111' : '1px solid #ddd', borderRadius: 14, background: '#fff', cursor: 'grab' }}
          >
            <span aria-hidden="true" style={{ fontSize: 22, color: '#888', textAlign: 'center' }}>⋮⋮</span>
            <div><strong>{item.label}</strong><small style={{ display: 'block', marginTop: 3, color: '#888' }}>{index + 1}</small></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="soft-btn" disabled={index === 0} onClick={() => moveBy(key, -1)} aria-label="انتقال به بالا">↑</button>
              <button type="button" className="soft-btn" disabled={index === order.length - 1} onClick={() => moveBy(key, 1)} aria-label="انتقال به پایین">↓</button>
            </div>
          </div>
        })}
      </div>
      {status && <div className="admin-message" style={{ marginTop: 12 }}>{status}</div>}
    </section>,
    target,
  )
}
