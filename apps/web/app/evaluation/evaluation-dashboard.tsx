'use client';

import { useCallback, useEffect, useState } from 'react';

type DashboardSummary = {
  recommendationCount: number;
  validPhotoCount: number;
  fallbackCount: number;
  latencyMs: {
    p50: number | null;
    p95: number | null;
    maximum: number | null;
  };
  feedbackCount: number;
  feedback: {
    liked: number;
    disliked: number;
    'would-buy': number;
  };
  productFeedback: Array<{
    productId: string;
    title: string;
    liked: number;
    disliked: number;
    wouldBuy: number;
  }>;
};

export function EvaluationDashboard() {
  const [summary, setSummary] = useState<DashboardSummary>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/evaluation', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Evaluation data could not be loaded.');
      }
      setSummary((await response.json()) as DashboardSummary);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Evaluation data could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return (
    <main className="evaluation-page">
      <nav className="nav shell" aria-label="Evaluation navigation">
        <a className="brand" href="/" aria-label="Suitly shopper demo">
          <span className="brand-mark">S</span>
          <span>Suitly</span>
        </a>
        <a className="back-link" href="/">
          ← Shopper demo
        </a>
      </nav>

      <section className="evaluation-shell">
        <header className="evaluation-header">
          <div>
            <div className="eyebrow">MVP evidence</div>
            <h1>Recommendation evaluation</h1>
            <p>
              Local, privacy-limited signals from shopper sessions. No photos,
              height, weight, or visual profiles are included.
            </p>
          </div>
          <button type="button" onClick={() => void loadSummary()}>
            {loading ? 'Refreshing…' : 'Refresh data'}
          </button>
        </header>

        {error !== undefined && (
          <div className="message error-message" role="alert">
            <strong>Dashboard unavailable</strong>
            <span>{error}</span>
          </div>
        )}

        {summary !== undefined && (
          <>
            <div className="metric-grid">
              <Metric
                label="Recommendations"
                value={summary.recommendationCount}
                detail={`${summary.validPhotoCount} valid-photo sessions`}
              />
              <Metric
                label="Feedback signals"
                value={summary.feedbackCount}
                detail={responseRate(summary)}
              />
              <Metric
                label="Median latency"
                value={formatLatency(summary.latencyMs.p50)}
                detail={`p95 ${formatLatency(summary.latencyMs.p95)}`}
              />
              <Metric
                label="Fallbacks"
                value={summary.fallbackCount}
                detail={percentage(
                  summary.fallbackCount,
                  summary.recommendationCount,
                )}
              />
            </div>

            <div className="evaluation-grid">
              <section className="signal-card">
                <div className="card-heading">
                  <div>
                    <span>Shopper signals</span>
                    <h2>Recommendation response</h2>
                  </div>
                  <strong>{summary.feedbackCount} total</strong>
                </div>
                <SignalBar
                  label="Good match"
                  value={summary.feedback.liked}
                  total={summary.feedbackCount}
                  tone="positive"
                />
                <SignalBar
                  label="Would buy"
                  value={summary.feedback['would-buy']}
                  total={summary.feedbackCount}
                  tone="purchase"
                />
                <SignalBar
                  label="Not for me"
                  value={summary.feedback.disliked}
                  total={summary.feedbackCount}
                  tone="negative"
                />
              </section>

              <section className="latency-card">
                <div className="card-heading">
                  <div>
                    <span>Local inference</span>
                    <h2>Response latency</h2>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>p50</dt>
                    <dd>{formatLatency(summary.latencyMs.p50)}</dd>
                  </div>
                  <div>
                    <dt>p95</dt>
                    <dd>{formatLatency(summary.latencyMs.p95)}</dd>
                  </div>
                  <div>
                    <dt>Slowest</dt>
                    <dd>{formatLatency(summary.latencyMs.maximum)}</dd>
                  </div>
                </dl>
                <p>
                  Collect at least 20 sessions before treating latency
                  percentiles as representative.
                </p>
              </section>
            </div>

            <section className="product-evaluation">
              <div className="card-heading">
                <div>
                  <span>Catalogue evidence</span>
                  <h2>Product-level feedback</h2>
                </div>
              </div>
              {summary.productFeedback.length === 0 ? (
                <div className="dashboard-empty">
                  <strong>No product feedback yet</strong>
                  <p>
                    Run recommendations in the shopper demo and use the feedback
                    actions on each product card.
                  </p>
                  <a href="/">Open shopper demo →</a>
                </div>
              ) : (
                <div className="feedback-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Good match</th>
                        <th>Would buy</th>
                        <th>Not for me</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.productFeedback.map((product) => (
                        <tr key={product.productId}>
                          <td>
                            <strong>{product.title}</strong>
                            <small>{product.productId}</small>
                          </td>
                          <td>{product.liked}</td>
                          <td>{product.wouldBuy}</td>
                          <td>{product.disliked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {summary.recommendationCount === 0 && (
              <div className="evaluation-callout">
                <strong>Start the evidence set</strong>
                <p>
                  Complete a recommendation in the demo, submit product
                  feedback, then refresh this page.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function SignalBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: 'positive' | 'purchase' | 'negative';
}) {
  const width = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="signal-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="signal-track">
        <i className={tone} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function responseRate(summary: DashboardSummary): string {
  return `${percentage(
    summary.feedbackCount,
    summary.recommendationCount * 3,
  )} of available card responses`;
}

function percentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function formatLatency(value: number | null): string {
  return value === null ? '—' : `${(value / 1000).toFixed(1)}s`;
}
