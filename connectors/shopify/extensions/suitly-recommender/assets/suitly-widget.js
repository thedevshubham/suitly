"use strict";(()=>{var c=class{#e;constructor(e){if(!e.apiBaseUrl||!e.merchantId)throw new Error("apiBaseUrl and merchantId are required.");this.#e=e}async recommend(e){let t=new FormData;return t.set("merchantId",this.#e.merchantId),t.set("audience",e.audience),t.set("heightCm",String(e.heightCm)),t.set("weightKg",String(e.weightKg)),t.set("category",e.category),t.set("photo",e.photo),this.#t("/api/recommend",{method:"POST",body:t})}async feedback(e,t,r){await this.#t("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({recommendationId:e,productId:t,feedback:r})})}async#t(e,t){let r=this.#e.fetch??globalThis.fetch,o=new Headers(t.headers);this.#e.sessionToken&&o.set("authorization",`Bearer ${this.#e.sessionToken}`);let n=await r(new URL(e,g(this.#e.apiBaseUrl)),{...t,headers:o});if(!n.ok){let a=await n.json().catch(()=>{});throw new Error(a?.error?.message??`Suitly request failed (${n.status}).`)}return await n.json()}};function g(i){return i.endsWith("/")?i:`${i}/`}var h=`
  :host { color: #172019; display: block; font: 15px/1.5 system-ui, sans-serif; }
  * { box-sizing: border-box; }
  form { background: #f4f1e9; border: 1px solid #d6d1c4; border-radius: 18px; padding: 20px; }
  h2 { font: 600 24px/1.15 Georgia, serif; margin: 0 0 16px; }
  .grid { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  label { display: grid; gap: 5px; font-weight: 600; }
  input, select, button { border: 1px solid #aaa497; border-radius: 10px; font: inherit; padding: 10px; }
  button { background: #173f31; color: white; cursor: pointer; font-weight: 700; }
  button:disabled { cursor: wait; opacity: .65; }
  .photo, button { grid-column: 1 / -1; }
  .status { margin: 12px 0; min-height: 24px; }
  .results { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
  article { border: 1px solid #dedbd2; border-radius: 14px; overflow: hidden; }
  article img { aspect-ratio: 4/5; object-fit: cover; width: 100%; }
  article div { padding: 12px; }
  article h3 { margin: 0 0 5px; }
  article a { color: #173f31; font-weight: 700; }
  @media (max-width: 520px) { .grid { grid-template-columns: 1fr; } }
`,m=class extends HTMLElement{#e;constructor(){super(),this.#e=this.attachShadow({mode:"open"})}connectedCallback(){this.#e.innerHTML=`
      <style>${h}</style>
      <form>
        <h2>${s(this.getAttribute("heading")??"Find your best match")}</h2>
        <div class="grid">
          <label>Styles for
            <select name="audience"><option value="men">Men</option><option value="women">Women</option></select>
          </label>
          <label>Category <input name="category" value="t-shirt" required></label>
          <label>Height (cm) <input name="heightCm" type="number" min="120" max="230" value="175" required></label>
          <label>Weight (kg) <input name="weightKg" type="number" min="35" max="250" value="75" required></label>
          <label class="photo">Full-body photo <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required></label>
          <button>Get recommendations</button>
        </div>
        <p class="status" role="status">Your photo is processed temporarily and deleted after analysis.</p>
      </form>
      <section class="results" aria-live="polite"></section>
    `,this.#e.querySelector("form")?.addEventListener("submit",e=>{this.#t(e)})}async#t(e){e.preventDefault();let t=e.currentTarget,r=this.#e.querySelector(".status"),o=t.querySelector("button"),n=new FormData(t),a=n.get("photo");if(!(!(a instanceof Blob)||a.size===0)){o&&(o.disabled=!0),r&&(r.textContent="Analysing your photo and catalogue\u2026");try{let l=this.getAttribute("session-token"),d=await new c({apiBaseUrl:u(this,"api-base-url"),merchantId:u(this,"merchant-id"),...l===null?{}:{sessionToken:l}}).recommend({audience:n.get("audience"),category:typeof n.get("category")=="string"?n.get("category"):"",heightCm:Number(n.get("heightCm")),weightKg:Number(n.get("weightKg")),photo:a});this.#r(d),r&&(r.textContent=d.warnings[0]??`${d.recommendations.length} recommendations found.`),this.dispatchEvent(new CustomEvent("suitly:recommendations",{detail:d,bubbles:!0,composed:!0}))}catch(l){r&&(r.textContent=l instanceof Error?l.message:"Recommendation failed.")}finally{o&&(o.disabled=!1)}}}#r(e){let t=this.#e.querySelector(".results");t&&(t.innerHTML=e.recommendations.map(r=>`<article>
          <img src="${s(r.imageUrl)}" alt="${s(r.title)}">
          <div>
            <h3>${s(r.title)}</h3>
            <p>${y(r.price,r.currency)} \xB7 ${r.styleScore}% match</p>
            <p>${s(r.reasons[0]??"")}</p>
            <a href="${s(r.productUrl)}">View product</a>
          </div>
        </article>`).join(""))}};function p(){customElements.get("suitly-recommender")||customElements.define("suitly-recommender",m)}function u(i,e){let t=i.getAttribute(e);if(!t)throw new Error(`${e} is required.`);return t}function s(i){return i.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]??e)}function y(i,e){return new Intl.NumberFormat(void 0,{style:"currency",currency:e}).format(i/100)}p();})();
