import { SuitlyClient, type SuitlyRecommendationResponse } from './client.js';

const styles = `
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
`;

export class SuitlyRecommenderElement extends HTMLElement {
  readonly #root: ShadowRoot;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.#root.innerHTML = `
      <style>${styles}</style>
      <form>
        <h2>${escapeHtml(this.getAttribute('heading') ?? 'Find your best match')}</h2>
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
    `;
    this.#root.querySelector('form')?.addEventListener('submit', (event) => {
      void this.#submit(event);
    });
  }

  async #submit(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const status = this.#root.querySelector<HTMLElement>('.status');
    const button = form.querySelector<HTMLButtonElement>('button');
    const data = new FormData(form);
    const photo = data.get('photo');
    if (!(photo instanceof Blob) || photo.size === 0) return;

    if (button) button.disabled = true;
    if (status) status.textContent = 'Analysing your photo and catalogue…';
    try {
      const sessionToken = this.getAttribute('session-token');
      const client = new SuitlyClient({
        apiBaseUrl: requiredAttribute(this, 'api-base-url'),
        merchantId: requiredAttribute(this, 'merchant-id'),
        ...(sessionToken === null ? {} : { sessionToken }),
      });
      const result = await client.recommend({
        audience: data.get('audience') as 'men' | 'women',
        category:
          typeof data.get('category') === 'string'
            ? (data.get('category') as string)
            : '',
        heightCm: Number(data.get('heightCm')),
        weightKg: Number(data.get('weightKg')),
        photo,
      });
      this.#renderResults(result);
      if (status) {
        status.textContent =
          result.warnings[0] ??
          `${result.recommendations.length} recommendations found.`;
      }
      this.dispatchEvent(
        new CustomEvent('suitly:recommendations', {
          detail: result,
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      if (status) {
        status.textContent =
          error instanceof Error ? error.message : 'Recommendation failed.';
      }
    } finally {
      if (button) button.disabled = false;
    }
  }

  #renderResults(result: SuitlyRecommendationResponse): void {
    const target = this.#root.querySelector<HTMLElement>('.results');
    if (!target) return;
    target.innerHTML = result.recommendations
      .map(
        (item) => `<article>
          <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}">
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${formatMoney(item.price, item.currency)} · ${item.styleScore}% match</p>
            <p>${escapeHtml(item.reasons[0] ?? '')}</p>
            <a href="${escapeHtml(item.productUrl)}">View product</a>
          </div>
        </article>`,
      )
      .join('');
  }
}

export function registerSuitlyWidget(): void {
  if (!customElements.get('suitly-recommender')) {
    customElements.define('suitly-recommender', SuitlyRecommenderElement);
  }
}

function requiredAttribute(element: HTMLElement, name: string): string {
  const value = element.getAttribute(name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ] ?? character,
  );
}

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amountMinor / 100);
}
