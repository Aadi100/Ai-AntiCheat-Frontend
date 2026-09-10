import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import {
  fetchInvoices,
  computeBilling,
  generateInvoice,
  markInvoicePaid,
  markInvoiceUnpaid,
  backfillInvoices
} from '../utils/api';

// Dummy saved payment methods (demo/enterprise checkout — not persisted server-side)
const SAVED_PAYMENT_METHODS = [
  { id: 'pm_1', brand: 'visa', last4: '4242', expiry: '08/27', name: 'Corporate Visa', default: true },
  { id: 'pm_2', brand: 'mastercard', last4: '5556', expiry: '11/26', name: 'Operations Mastercard' },
  { id: 'pm_3', brand: 'amex', last4: '1007', expiry: '02/28', name: 'Amex Business' }
];

const detectCardBrand = (number) => {
  const n = (number || '').replace(/\s+/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6(?:011|5)/.test(n)) return 'discover';
  return 'generic';
};

const formatCardNumber = (value) => {
  const brand = detectCardBrand(value);
  const digits = value.replace(/\D/g, '').slice(0, brand === 'amex' ? 15 : 16);
  if (brand === 'amex') {
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const brandLabel = (brand) => ({ visa: 'VISA', mastercard: 'MC', amex: 'AMEX', discover: 'DISC' }[brand] || 'CARD');

export const Billing = () => {
  const {
    billingSummary,
    setBillingSummary,
    defaultBranchId
  } = useApp();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isCheckout = location.pathname.includes('/checkout');
  const monthId = searchParams.get('month') || billingSummary.month;

  const [invoiceList, setInvoiceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment inputs
  const [ccName, setCcName] = useState('');
  const [ccNumber, setCcNumber] = useState('');
  const [ccExpiry, setCcExpiry] = useState('');
  const [ccCvv, setCcCvv] = useState('');
  const [bannerMsg, setBannerMsg] = useState('');

  // Enterprise checkout state
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'paypal' | 'bank'
  const [selectedSavedCard, setSelectedSavedCard] = useState(SAVED_PAYMENT_METHODS.find(c => c.default)?.id || 'new');
  const [saveCard, setSaveCard] = useState(false);
  const [savedCards, setSavedCards] = useState(SAVED_PAYMENT_METHODS);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const ccBrand = detectCardBrand(ccNumber);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Invoice history and the computed current bill are both scoped to the
      // app's currently selected branch.
      const invRes = await fetchInvoices(defaultBranchId);
      const compRes = await computeBilling('', '', defaultBranchId);

      if (invRes.ok && compRes.ok) {
        if (invRes.data && compRes.data) {
          setInvoiceList(invRes.data.response_data || []);
          setBillingSummary(compRes.data.response_data || billingSummary);
        } else {
          setError('Unexpected response format from server');
        }
      } else {
        const errorText = invRes.data?.response_message || compRes.data?.response_message || 'Failed to query billing accounts';
        setError(errorText);
      }
    } catch (err) {
      setError(`Could not connect to the backend server: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [defaultBranchId]);

  // Find invoice for checkout
  const rawCheckoutInvoice = invoiceList.find(i => (i.month || i.id || i._id) === monthId) || {
    month: monthId,
    search_total: billingSummary.search_total,
    free_search_limit: billingSummary.free_search_limit,
    billable_search: billingSummary.billable_search,
    rate_search: billingSummary.rate_search,
    training_total: billingSummary.training_total,
    free_training_limit: billingSummary.free_training_limit,
    billable_training: billingSummary.billable_training,
    rate_training: billingSummary.rate_training,
    amount_due: billingSummary.amount_due,
    status: 'unpaid'
  };

  // Normalize numeric fields — a real backend invoice record may omit some of these
  const checkoutInvoice = {
    ...rawCheckoutInvoice,
    search_total: Number(rawCheckoutInvoice.search_total) || 0,
    free_search_limit: Number(rawCheckoutInvoice.free_search_limit) || 0,
    billable_search: Number(rawCheckoutInvoice.billable_search) || 0,
    rate_search: Number(rawCheckoutInvoice.rate_search) || 0,
    training_total: Number(rawCheckoutInvoice.training_total) || 0,
    free_training_limit: Number(rawCheckoutInvoice.free_training_limit) || 0,
    billable_training: Number(rawCheckoutInvoice.billable_training) || 0,
    rate_training: Number(rawCheckoutInvoice.rate_training) || 0,
    amount_due: Number(rawCheckoutInvoice.amount_due) || 0
  };

  // Actions
  const handleMarkPaid = async (month) => {
    try {
      const res = await markInvoicePaid(month);
      if (res.ok) {
        setBannerMsg(`Statement for ${month} marked as Paid successfully.`);
        await loadBillingData();
      } else {
        alert(res.data?.response_message || 'Failed to update statement.');
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleMarkUnpaid = async (month) => {
    try {
      const res = await markInvoiceUnpaid(month);
      if (res.ok) {
        setBannerMsg(`Statement for ${month} marked as Unpaid successfully.`);
        await loadBillingData();
      } else {
        alert(res.data?.response_message || 'Failed to update statement.');
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    try {
      if (!billingSummary.month) return;
      const [yearStr, monthStr] = billingSummary.month.split('-');
      const year = parseInt(yearStr);
      const monthNum = parseInt(monthStr);
      
      setBannerMsg('Generating statement and backfilling months...');

      const resGen = await generateInvoice(year, monthNum, defaultBranchId);
      const resBack = await backfillInvoices(defaultBranchId);
      
      if (resGen.ok && resBack.ok) {
        setBannerMsg(`Invoice statements refreshed and synced successfully!`);
        await loadBillingData();
      } else {
        alert(resGen.data?.response_message || resBack.data?.response_message || 'Failed to generate invoice statement.');
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const generateTxnId = () => 'TXN-' + Math.random().toString(36).slice(2, 10).toUpperCase();

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (paymentMethod === 'card' && selectedSavedCard === 'new') {
      if (!ccName || !ccNumber || !ccExpiry || !ccCvv) {
        setPaymentResult({ success: false, message: 'Please fill in all card details.' });
        return;
      }
    }

    setProcessing(true);
    setPaymentResult(null);

    // Simulate gateway authorization latency (demo — no real payment processor is wired up)
    await new Promise(resolve => setTimeout(resolve, 1400));

    try {
      const res = await markInvoicePaid(monthId);
      if (res.ok) {
        let methodLabel = 'PayPal';
        if (paymentMethod === 'bank') {
          methodLabel = 'Bank Transfer (ACH)';
        } else if (paymentMethod === 'card') {
          if (selectedSavedCard === 'new') {
            const last4 = ccNumber.replace(/\D/g, '').slice(-4);
            methodLabel = `${brandLabel(ccBrand)} •••• ${last4}`;
            if (saveCard) {
              setSavedCards(prev => [...prev, { id: `pm_${prev.length + 1}_${last4}`, brand: ccBrand, last4, expiry: ccExpiry, name: ccName }]);
            }
          } else {
            const card = savedCards.find(c => c.id === selectedSavedCard);
            methodLabel = card ? `${brandLabel(card.brand)} •••• ${card.last4}` : 'Saved Card';
          }
        }

        setPaymentResult({
          success: true,
          txnId: generateTxnId(),
          amount: checkoutInvoice.amount_due,
          month: monthId,
          method: methodLabel
        });
        await loadBillingData();
      } else {
        setPaymentResult({ success: false, message: res.data?.response_message || 'Payment processor declined this transaction.' });
      }
    } catch (err) {
      setPaymentResult({ success: false, message: `Could not process payment: ${err.message}` });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!paymentResult?.success) return;
    const lines = [
      'AntiCheat Surveillance — Payment Receipt',
      '============================================',
      `Transaction ID: ${paymentResult.txnId}`,
      `Billing Period: ${paymentResult.month}`,
      `Payment Method: ${paymentResult.method}`,
      `Amount Charged: $${paymentResult.amount.toFixed(2)}`,
      `Date: ${new Date().toLocaleString()}`,
      '',
      'Thank you for your payment.'
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${paymentResult.txnId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
        <span className="text-muted">Loading billing details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <div className="banner-err" style={{ width: '100%', maxWidth: '600px', margin: 0 }}>
          ⚠️ {error}
        </div>
        <button className="btn btn-primary" onClick={loadBillingData}>
          🔄 Retry Loading Billing Summary
        </button>
      </div>
    );
  }

  if (isCheckout) {
    const showSuccess = paymentResult?.success;

    return (
      <div>
        <div style={{ marginBottom: '14px' }}>
          <Link to="/billing" className="link-accent">← Back to Billing summary</Link>
        </div>

        <div className="grid-2-wide">
          {/* Payment Panel */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="checkout-head" style={{ marginBottom: '16px' }}>
              <div className="panel-title" style={{ marginBottom: 0 }}>Secure Invoice Checkout</div>
              <span className="checkout-secure">
                <Icon name="shield" size={12} /> 256-bit SSL Secured
              </span>
            </div>

            {processing ? (
              <div className="pay-processing">
                <span className="spinner"></span>
                <div className="pay-processing-title">Authorizing payment…</div>
                <div className="pay-processing-sub">
                  Contacting {paymentMethod === 'card' ? 'the card network' : paymentMethod === 'paypal' ? 'PayPal' : 'your bank'}. Please don't close this window.
                </div>
              </div>
            ) : showSuccess ? (
              <div className="pay-success">
                <div className="pay-success-icon"><Icon name="check-circle" size={30} /></div>
                <div className="pay-success-title">Payment Successful</div>
                <div className="pay-success-sub">
                  Your statement for {paymentResult.month} has been settled via {paymentResult.method}.
                </div>
                <div className="pay-receipt">
                  <div className="bank-detail-row"><span className="lbl">Transaction ID</span><span className="val">{paymentResult.txnId}</span></div>
                  <div className="bank-detail-row"><span className="lbl">Amount Charged</span><span className="val">${paymentResult.amount.toFixed(2)}</span></div>
                  <div className="bank-detail-row"><span className="lbl">Payment Method</span><span className="val">{paymentResult.method}</span></div>
                </div>
                <div className="pay-success-actions">
                  <button type="button" className="btn" onClick={handleDownloadReceipt}>⬇ Download Receipt</button>
                  <button type="button" className="btn btn-primary" onClick={() => navigate('/billing')}>Back to Billing</button>
                </div>
              </div>
            ) : (
              <>
                {paymentResult && !paymentResult.success && (
                  <div className="banner-err">⚠️ {paymentResult.message}</div>
                )}

                <div className="pay-tabs">
                  <button type="button" className={`pay-tab ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => setPaymentMethod('card')}>💳 Card</button>
                  <button type="button" className={`pay-tab ${paymentMethod === 'paypal' ? 'active' : ''}`} onClick={() => setPaymentMethod('paypal')}>PayPal</button>
                  <button type="button" className={`pay-tab ${paymentMethod === 'bank' ? 'active' : ''}`} onClick={() => setPaymentMethod('bank')}>🏦 Bank Transfer</button>
                </div>

                <form onSubmit={handleCheckoutSubmit}>
                  {paymentMethod === 'card' && (
                    <>
                      <div className="saved-cards">
                        {savedCards.map(card => (
                          <div
                            key={card.id}
                            className={`saved-card ${selectedSavedCard === card.id ? 'selected' : ''}`}
                            onClick={() => setSelectedSavedCard(card.id)}
                          >
                            <span className="saved-card-radio"></span>
                            <span className={`card-brand-badge ${card.brand}`}>{brandLabel(card.brand)}</span>
                            <div className="saved-card-info">
                              <div className="saved-card-name">{card.name}</div>
                              <div className="saved-card-meta">•••• {card.last4} · expires {card.expiry}</div>
                            </div>
                            {card.default && <span className="saved-card-default">Default</span>}
                          </div>
                        ))}
                        <div
                          className={`saved-card ${selectedSavedCard === 'new' ? 'selected' : ''}`}
                          onClick={() => setSelectedSavedCard('new')}
                        >
                          <span className="saved-card-radio"></span>
                          <span className="card-brand-badge generic">+</span>
                          <div className="saved-card-info">
                            <div className="saved-card-name">Use a new card</div>
                            <div className="saved-card-meta">Enter card details below</div>
                          </div>
                        </div>
                      </div>

                      {selectedSavedCard === 'new' && (
                        <>
                          <div className="form-group">
                            <label className="form-label">Name on card</label>
                            <input
                              type="text"
                              required
                              className="form-input"
                              placeholder="John Doe"
                              value={ccName}
                              onChange={e => setCcName(e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Card number</label>
                            <div className="card-input-wrap">
                              <input
                                type="text"
                                required
                                className="form-input mono"
                                placeholder="4242 4242 4242 4242"
                                value={ccNumber}
                                onChange={e => setCcNumber(formatCardNumber(e.target.value))}
                              />
                              <span className={`card-brand-badge ${ccBrand}`}>{brandLabel(ccBrand)}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Expiry (MM/YY)</label>
                              <input
                                type="text"
                                required
                                className="form-input mono"
                                placeholder="12/28"
                                maxLength="5"
                                value={ccExpiry}
                                onChange={e => setCcExpiry(formatExpiry(e.target.value))}
                              />
                            </div>
                            <div className="form-group" style={{ width: '100px' }}>
                              <label className="form-label">CVV</label>
                              <input
                                type="password"
                                required
                                className="form-input mono"
                                placeholder="•••"
                                maxLength={ccBrand === 'amex' ? 4 : 3}
                                value={ccCvv}
                                onChange={e => setCcCvv(e.target.value.replace(/\D/g, ''))}
                              />
                            </div>
                          </div>

                          <label className="form-check" style={{ marginTop: '4px', marginBottom: '4px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} />
                            Save this card for future payments
                          </label>
                        </>
                      )}

                      <div style={{ marginTop: '16px' }}>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                          🔒 Pay ${checkoutInvoice.amount_due.toFixed(2)} Securely
                        </button>
                      </div>
                    </>
                  )}

                  {paymentMethod === 'paypal' && (
                    <div className="paypal-panel">
                      <div className="paypal-logo"><span>Pay</span><span>Pal</span></div>
                      <p className="text-muted" style={{ fontSize: '12.5px', marginBottom: '16px' }}>
                        You'll be securely redirected to PayPal to authorize this payment, then returned here automatically.
                      </p>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Continue with PayPal — ${checkoutInvoice.amount_due.toFixed(2)}
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'bank' && (
                    <div className="bank-panel">
                      <div className="bank-detail-row"><span className="lbl">Bank Name</span><span className="val">First Enterprise Bank</span></div>
                      <div className="bank-detail-row"><span className="lbl">Account Name</span><span className="val">AntiCheat Surveillance LLC</span></div>
                      <div className="bank-detail-row"><span className="lbl">Account Number</span><span className="val">0021 4487 9932</span></div>
                      <div className="bank-detail-row"><span className="lbl">Routing / SWIFT</span><span className="val">FEBKUS44XXX</span></div>
                      <div className="bank-detail-row"><span className="lbl">Reference Code</span><span className="val">INV-{monthId}</span></div>
                      <p className="text-muted" style={{ fontSize: '11.5px', marginTop: '12px' }}>
                        Include the reference code with your transfer. Transfers typically clear in 1-3 business days; for this demo, confirming below settles the invoice immediately.
                      </p>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                        I've Sent the Transfer — ${checkoutInvoice.amount_due.toFixed(2)}
                      </button>
                    </div>
                  )}
                </form>

                <div className="trust-row">
                  <span className="trust-badge"><Icon name="shield" size={12} /> PCI DSS Compliant</span>
                  <span className="trust-badge">🔒 Encrypted end-to-end</span>
                  <div className="accepted-cards">
                    <span className="card-brand-badge visa">VISA</span>
                    <span className="card-brand-badge mastercard">MC</span>
                    <span className="card-brand-badge amex">AMEX</span>
                    <span className="card-brand-badge discover">DISC</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Checkout summary */}
          <div className="panel" style={{ margin: 0, height: 'fit-content' }}>
            <div className="panel-title">Statement Summary</div>
            <div className="row-list" style={{ marginTop: '12px' }}>
              <div className="row-item">
                <span>Invoice ID</span>
                <span className="mono">{checkoutInvoice.invoice_code || `INV-${checkoutInvoice.month || checkoutInvoice.id || checkoutInvoice._id}`}</span>
              </div>
              <div className="row-item">
                <span>Month Code</span>
                <span className="mono">{checkoutInvoice.month || checkoutInvoice.id || checkoutInvoice._id}</span>
              </div>
              <div className="row-item">
                <span>Rate per image search</span>
                <span>${checkoutInvoice.rate_search.toFixed(3)}</span>
              </div>
              <div className="row-item">
                <span>Rate per image trained</span>
                <span>${checkoutInvoice.rate_training.toFixed(3)}</span>
              </div>
              <div className="row-item">
                <span>Searches (Total / Billable)</span>
                <span>{checkoutInvoice.search_total} / {checkoutInvoice.billable_search}</span>
              </div>
              <div className="row-item">
                <span>Training (Total / Billable)</span>
                <span>{checkoutInvoice.training_total} / {checkoutInvoice.billable_training}</span>
              </div>
              <div className="row-item font-bold" style={{ fontSize: '14px', borderTop: '1px solid var(--border-soft)', paddingTop: '10px', marginTop: '10px' }}>
                <span>Amount Due</span>
                <span style={{ color: 'var(--err)' }}>${checkoutInvoice.amount_due.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Postpaid, metered usage on Server Rekognition — every calendar month starts with a free allocation buffer, and statements are generated automatically at month-end."
      >
        <button className="btn btn-primary" onClick={handleGenerateInvoice}>
          <Icon name="refresh-cw" size={14} /> Re-Sync Current Bill
        </button>
      </PageHeader>

      {bannerMsg && (
        <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '6px', background: 'rgba(34,197,94,0.12)', color: 'var(--ok)', fontSize: '13px' }}>
          {bannerMsg}
        </div>
      )}

      <div className="grid-2-wide" style={{ marginTop: '18px' }}>
        {/* Left: current billing counters */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="section-title">Current Month - {billingSummary.month} (live, not yet invoiced)</div>
          
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span>Rekognition Searches</span>
              <span>{billingSummary.search_total} / {billingSummary.free_search_limit} free</span>
            </div>
            <div className="usage-bar">
              <div 
                className={`usage-bar-fill ${billingSummary.billable_search > 0 ? 'err' : billingSummary.search_total > 0 ? 'blue' : ''}`}
                style={{ width: `${Math.min(100, (billingSummary.search_total / billingSummary.free_search_limit) * 100)}%` }}
              ></div>
            </div>
            {billingSummary.billable_search > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--err)', marginTop: '4px', textAlign: 'right' }}>
                {billingSummary.billable_search} over free allowance - ${(billingSummary.billable_search * billingSummary.rate_search).toFixed(2)}
              </div>
            )}
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span>Rekognition Training (Person additions)</span>
              <span>{billingSummary.training_total} / {billingSummary.free_training_limit} free</span>
            </div>
            <div className="usage-bar">
              <div 
                className={`usage-bar-fill ${billingSummary.billable_training > 0 ? 'err' : billingSummary.training_total > 0 ? 'blue' : ''}`}
                style={{ width: `${Math.min(100, (billingSummary.training_total / billingSummary.free_training_limit) * 100)}%` }}
              ></div>
            </div>
            {billingSummary.billable_training > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--err)', marginTop: '4px', textAlign: 'right' }}>
                {billingSummary.billable_training} over free allowance - ${(billingSummary.billable_training * billingSummary.rate_training).toFixed(2)}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: '20px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className={`stat-card ${billingSummary.amount_due > 0 ? 'err' : 'ok'}`} style={{ alignSelf: 'stretch', width: '220px', padding: '10px 14px' }}>
              <div className="stat-label">Current balance due</div>
              <div className="stat-val">${billingSummary.amount_due.toFixed(2)}</div>
            </div>
            {billingSummary.amount_due > 0 && (
              <Link className="btn btn-ok" to={`/billing/checkout?month=${billingSummary.month}`} style={{ height: 'fit-content' }}>
                Pay ${billingSummary.amount_due.toFixed(2)} Now
              </Link>
            )}
          </div>
        </div>

        {/* Right: invoice history */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="section-title">Invoice Records</div>
          {invoiceList.length > 0 ? (
            <div className="row-list" style={{ marginTop: '12px' }}>
              {invoiceList.map((inv, idx) => {
                const invId = inv.month || inv.id || inv._id;
                return (
                  <div className="row-item" key={invId || idx} style={{ paddingBlock: '10px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Statement: {inv.month || invId}
                        {inv.invoice_code && <span className="badge badge-muted" style={{ fontSize: '9px' }}>{inv.invoice_code}</span>}
                      </div>
                      <div className="text-muted" style={{ fontSize: '11px', marginTop: '1px' }}>
                        Server search count: {inv.search_total} · training count: {inv.training_total}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                        ${inv.amount_due.toFixed(2)}
                      </span>
                      {inv.status === 'paid' ? (
                        <span className="badge badge-ok">Paid</span>
                      ) : (
                        <span className="badge badge-err">Unpaid</span>
                      )}

                      {inv.status === 'unpaid' ? (
                        <button className="btn btn-sm btn-primary" onClick={() => handleMarkPaid(invId)}>
                          Mark Paid
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-danger" onClick={() => handleMarkUnpaid(invId)}>
                          Mark Unpaid
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ border: 'none' }}>
              No statements generated yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
