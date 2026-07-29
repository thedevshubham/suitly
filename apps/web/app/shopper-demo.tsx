'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

type Recommendation = {
  productId: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  price: number;
  currency: string;
  colour?: string;
  size?: string;
  styleScore: number;
  styleConfidence: number;
  sizeConfidence: number;
  reasons: string[];
  fitRisk?: string;
  source: 'ai' | 'deterministic' | 'deterministic-fallback';
};

type RecommendationResponse = {
  recommendationId: string;
  photoStatus: 'valid' | 'invalid' | 'analysis-unavailable';
  shopperProfileSummary?: {
    visibleBuild: string;
    recommendedSilhouettes: string[];
    styleConfidence: number;
    geometryConfidence: number;
  };
  recommendations: Recommendation[];
  warnings: string[];
  usedFallback: boolean;
  timing: { analysisMs: number; totalMs: number };
};

type ErrorResponse = {
  error?: { message?: string; issues?: { path: string; message: string }[] };
};

type Audience = 'men' | 'women';

const categoriesByAudience = {
  men: [
    ['jacket', 'Jackets'],
    ['shirt', 'Shirts'],
    ['shoes', 'Shoes'],
  ],
  women: [
    ['jacket', 'Jackets'],
    ['top', 'Tops'],
    ['t-shirt', 'T-shirts'],
    ['jumper', 'Jumpers'],
    ['bag', 'Bags'],
  ],
} as const;

export function ShopperDemo() {
  const [photo, setPhoto] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [result, setResult] = useState<RecommendationResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audience, setAudience] = useState<Audience>('men');
  const [category, setCategory] = useState('jacket');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (photo === undefined) {
      setPreviewUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!loading) return;
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      500,
    );
    return () => window.clearInterval(timer);
  }, [loading]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    setPhoto(event.target.files?.[0]);
    setError(undefined);
    setResult(undefined);
  }

  async function useDemoPhoto() {
    setError(undefined);
    try {
      const response = await fetch('/api/demo-photo');
      if (!response.ok) throw new Error('Demo photo could not be loaded.');
      const blob = await response.blob();
      setPhoto(
        new File([blob], 'synthetic-shopper.png', { type: 'image/png' }),
      );
      setResult(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Demo photo could not load.',
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photo === undefined) {
      setError('Choose a clear full-body photo first.');
      return;
    }

    setLoading(true);
    setElapsed(0);
    setError(undefined);
    setResult(undefined);
    const form = new FormData(event.currentTarget);
    form.set('merchantId', 'sample-merchant');
    form.set('photo', photo);

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        body: form,
      });
      const body = (await response.json()) as
        | RecommendationResponse
        | ErrorResponse;
      if (!response.ok && !('photoStatus' in body)) {
        const details =
          'error' in body ? body.error?.issues?.[0]?.message : undefined;
        throw new Error(
          details ??
            ('error' in body ? body.error?.message : undefined) ??
            'Recommendation failed.',
        );
      }
      setResult(body as RecommendationResponse);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="experience shell" aria-labelledby="demo-heading">
      <div className="section-heading">
        <span>01</span>
        <div>
          <h2 id="demo-heading">Build your style profile</h2>
          <p>A few inputs. One private local analysis. No account needed.</p>
        </div>
      </div>

      <div className="demo-grid">
        <form
          className="style-form"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <div className="photo-field">
            <input
              ref={fileInput}
              type="file"
              name="photo-picker"
              accept="image/jpeg,image/png,image/webp"
              onChange={choosePhoto}
              className="visually-hidden"
            />
            {previewUrl === undefined ? (
              <button
                className="photo-empty"
                type="button"
                onClick={() => fileInput.current?.click()}
              >
                <span className="upload-icon">↑</span>
                <strong>Add a full-body photo</strong>
                <small>JPEG, PNG or WebP · minimum 480 × 720</small>
              </button>
            ) : (
              <div className="photo-preview">
                <img src={previewUrl} alt="Selected shopper preview" />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                >
                  Change photo
                </button>
              </div>
            )}
            <button
              className="demo-photo-link"
              type="button"
              onClick={() => {
                void useDemoPhoto();
              }}
            >
              Or use our synthetic demo photo
            </button>
          </div>

          <div className="form-fields">
            <div className="field-row">
              <label>
                <span>Height</span>
                <div className="input-with-unit">
                  <input
                    type="number"
                    name="heightCm"
                    defaultValue="178"
                    min="120"
                    max="230"
                    required
                  />
                  <span>cm</span>
                </div>
              </label>
              <label>
                <span>Weight</span>
                <div className="input-with-unit">
                  <input
                    type="number"
                    name="weightKg"
                    defaultValue="75"
                    min="35"
                    max="250"
                    required
                  />
                  <span>kg</span>
                </div>
              </label>
            </div>
            <label>
              <span>Show me</span>
              <select
                name="audience"
                value={audience}
                onChange={(event) => {
                  const nextAudience = event.target.value as Audience;
                  setAudience(nextAudience);
                  setCategory(categoriesByAudience[nextAudience][0][0]);
                }}
              >
                <option value="men">Men&apos;s styles</option>
                <option value="women">Women&apos;s styles</option>
              </select>
            </label>
            <label>
              <span>What are you shopping for?</span>
              <select
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categoriesByAudience[audience].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  {progressMessage(elapsed)}
                </>
              ) : (
                <>
                  Find my matches <span>→</span>
                </>
              )}
            </button>
            <p className="privacy-note">
              Your image is sanitized, processed locally, and deleted
              automatically after analysis.
            </p>
          </div>
        </form>

        <aside className="process-card">
          <div className="process-label">What happens next</div>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>Photo check</strong>
                <p>We verify the pose and image quality.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Private analysis</strong>
                <p>Local AI reads only fashion-relevant geometry.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Catalogue match</strong>
                <p>Real, available products are scored and verified.</p>
              </div>
            </li>
          </ol>
          <div className="sample-caveat">
            <strong>Sample catalogue</strong>
            Product options and sizes are limited in this development fixture.
          </div>
        </aside>
      </div>

      {error !== undefined && (
        <div className="message error-message" role="alert">
          <strong>We couldn&apos;t complete that.</strong>
          <span>{error}</span>
        </div>
      )}

      {result !== undefined && <Results result={result} elapsed={elapsed} />}
    </section>
  );
}

function Results({
  result,
}: {
  result: RecommendationResponse;
  elapsed: number;
}) {
  if (result.photoStatus === 'invalid') {
    return (
      <div className="message invalid-photo" role="status">
        <strong>Let&apos;s try another photo</strong>
        <span>
          {result.warnings.join(' ') ||
            'Use a clear, front-facing photo showing you from head to feet.'}
        </span>
      </div>
    );
  }

  return (
    <div className="results" aria-live="polite">
      <div className="results-heading">
        <div>
          <div className="eyebrow">Your edit</div>
          <h2>Three pieces selected for you</h2>
        </div>
        <div className="result-meta">
          {result.shopperProfileSummary !== undefined && (
            <span>
              {result.shopperProfileSummary.recommendedSilhouettes.join(
                ' · ',
              ) || 'Balanced styling'}
            </span>
          )}
          <small>{(result.timing.totalMs / 1000).toFixed(1)}s local run</small>
        </div>
      </div>

      {result.recommendations.length === 0 ? (
        <div className="message">
          <strong>No catalogue match yet</strong>
          <span>{result.warnings.join(' ')}</span>
        </div>
      ) : (
        <div className="product-grid">
          {result.recommendations.map((item, index) => (
            <article className="product-card" key={item.productId}>
              <div className="product-image">
                <img src={item.imageUrl} alt={item.title} />
                <span className="match-score">{item.styleScore}% match</span>
                <span className="product-number">0{index + 1}</span>
              </div>
              <div className="product-info">
                <div className="product-title-row">
                  <div>
                    <p>Catalogue match</p>
                    <h3>{item.title}</h3>
                  </div>
                  <strong>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: item.currency,
                    }).format(item.price / 100)}
                  </strong>
                </div>
                <p className="reason">{item.reasons[0]}</p>
                <div className="confidence-row">
                  <span>Style confidence</span>
                  <div>
                    <i
                      style={{
                        width: `${Math.round(item.styleConfidence * 100)}%`,
                      }}
                    />
                  </div>
                  <strong>{Math.round(item.styleConfidence * 100)}%</strong>
                </div>
                <div className="fit-note">
                  <span>Fit note</span>
                  <p>{item.fitRisk ?? 'No material fit concern identified.'}</p>
                </div>
                <a href={item.productUrl}>
                  View product <span>↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
      {result.warnings.length > 0 && result.recommendations.length > 0 && (
        <p className="result-warning">{result.warnings.join(' ')}</p>
      )}
    </div>
  );
}

function progressMessage(elapsed: number): string {
  if (elapsed < 2) return 'Checking your photo…';
  if (elapsed < 8) return 'Analysing proportions…';
  if (elapsed < 18) return 'Matching the catalogue…';
  return 'Local AI is still working…';
}
