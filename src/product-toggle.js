const INTERACTIVE = 'button,a,input,select,textarea,label,[role="button"]'

function decorateCard(card){
  if(card.dataset.toggleReady === '1') return
  card.dataset.toggleReady = '1'
  const hint = document.createElement('span')
  hint.className = 'product-card-toggle-hint'
  hint.textContent = 'نمایش بیشتر'
  card.appendChild(hint)
}

function refreshCards(){
  document.querySelectorAll('.product-card').forEach(decorateCard)
}

function closeOthers(current){
  const grid = current.closest('.product-grid')
  if(!grid) return
  grid.querySelectorAll('.product-card.is-expanded').forEach((card)=>{
    if(card !== current){
      card.classList.remove('is-expanded')
      const hint = card.querySelector('.product-card-toggle-hint')
      if(hint) hint.textContent = 'نمایش بیشتر'
    }
  })
}

function toggleCard(card){
  closeOthers(card)
  const open = card.classList.toggle('is-expanded')
  const hint = card.querySelector('.product-card-toggle-hint')
  if(hint) hint.textContent = open ? 'بستن' : 'نمایش بیشتر'
}

if(typeof document !== 'undefined'){
  refreshCards()
  const observer = new MutationObserver(refreshCards)
  observer.observe(document.documentElement,{childList:true,subtree:true})

  document.addEventListener('click',(event)=>{
    const card = event.target.closest?.('.product-card')
    if(!card || event.target.closest(INTERACTIVE)) return
    toggleCard(card)
  })

  document.addEventListener('keydown',(event)=>{
    if(event.key !== 'Escape') return
    document.querySelectorAll('.product-card.is-expanded').forEach((card)=>{
      card.classList.remove('is-expanded')
      const hint = card.querySelector('.product-card-toggle-hint')
      if(hint) hint.textContent = 'نمایش بیشتر'
    })
  })
}
