import React,{useState} from 'react';

export default function App(){

const products=[
{name:'مانتو لینن بهاره',single:'2,850,000',wholesale:'1,950,000'},
{name:'شومیز ساتن',single:'1,950,000',wholesale:'1,200,000'},
{name:'ست مینیمال زنانه',single:'3,200,000',wholesale:'2,400,000'}
];

return <>

<header>
<div className="logo">AVENZA</div>
<nav>خانه | محصولات | عمده | سفارش | تماس</nav>
</header>

<section className="hero">
<h1>AVENZA COLLECTION</h1>
<p>استایل خاص برای هر روز خاص</p>
<button>خرید تکی</button>
<button className="gold">همکاری عمده</button>
</section>

<section>
<h2>محصولات جدید</h2>
<div className="grid">
{products.map((p,i)=><div className="card" key={i}>
<div className="image">IMAGE</div>
<h3>{p.name}</h3>
<p>تکی: {p.single}</p>
<p>عمده: {p.wholesale}</p>
<button>ثبت سفارش</button>
</div>)}
</div>
</section>

<section className="wholesale">
<h2>همکاری عمده</h2>
<p>ثبت درخواست همکاری فروشندگان</p>
</section>

<footer>
AVENZA COLLECTION
</footer>

</>
}