import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  fetchInvoices, 
  computeBilling, 
  generateInvoice, 
  markInvoicePaid, 
  markInvoiceUnpaid, 
  backfillInvoices 
} from '../utils/api';

export const Billing = () => {
  const {
    billingSummary,
    setBillingSummary
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

  const loadBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch past invoices
      const invRes = await fetchInvoices();
      // Compute current bill
      const compRes = await computeBilling();

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
  }, []);

  // Find invoice for checkout
  const checkoutInvoice = invoiceList.find(i => (i.month || i._id) === monthId) || {
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
      
      const resGen = await generateInvoice(year, monthNum);
      const resBack = await backfillInvoices();
      
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

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!ccName || !ccNumber || !ccExpiry || !ccCvv) {
      alert("Please fill all payment fields.");
      return;
    }

    try {
      const res = await markInvoicePaid(monthId);
      if (res.ok) {
        alert(`Payment successful! Month: ${monthId}, Amount: $${checkoutInvoice.amount_due.toFixed(2)}`);
        await loadBillingData();
        navigate('/billing');
      } else {
        alert(res.data?.response_message || 'Payment processor failed to update invoice.');
      }
    } catch (err) {
      alert(`Could not process payment: ${err.message}`);
    }
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
    return (
      <div>
        <div style={{ marginBottom: '14px' }}>
          <Link to="/billing" className="link-accent">← Back to Billing summary</Link>
        </div>

        <div className="grid-2-wide">
          {/* Form */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-title">Secure Invoice Checkout</div>
            <p className="text-muted" style={{ marginBottom: '16px', fontSize: '13px' }}>
              We support all major debit/credit cards. Verification happens immediately.
            </p>

            <form onSubmit={handleCheckoutSubmit}>
              <div className="form-group">
                <label className="form-label">Name on card</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="John Doe"
                  value={ccName}
                  onChange={e => setCcName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Card number</label>
                <input
                  type="text"
                  required
                  className="form-control mono"
                  placeholder="•••• •••• •••• ••••"
                  maxLength="19"
                  value={ccNumber}
                  onChange={e => setCcNumber(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    required
                    className="form-control mono"
                    placeholder="12/28"
                    maxLength="5"
                    value={ccExpiry}
                    onChange={e => setCcExpiry(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ width: '100px' }}>
                  <label className="form-label">CVV</label>
                  <input
                    type="password"
                    required
                    className="form-control mono"
                    placeholder="•••"
                    maxLength="3"
                    value={ccCvv}
                    onChange={e => setCcCvv(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Pay ${checkoutInvoice.amount_due.toFixed(2)} Securely
                </button>
              </div>
            </form>
          </div>

          {/* Checkout summary */}
          <div className="panel" style={{ margin: 0, height: 'fit-content' }}>
            <div className="panel-title">Statement Summary</div>
            <div className="row-list" style={{ marginTop: '12px' }}>
              <div className="row-item">
                <span>Month Code</span>
                <span className="mono">{checkoutInvoice.month || checkoutInvoice._id}</span>
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
      {bannerMsg && (
        <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '6px', background: 'rgba(34,197,94,0.12)', color: 'var(--ok)', fontSize: '13px' }}>
          {bannerMsg}
        </div>
      )}

      {/* Postpaid description */}
      <div className="panel" style={{ display: 'flex', gap: '14px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <p className="text-muted" style={{ margin: 0 }}>
            Postpaid, metered billing on AWS Rekognition usage - every calendar month starts with a free allocation buffer. Invoices are generated at month-end.
          </p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleGenerateInvoice}>
            ⚡ Re-Sync Current Bill
          </button>
        </div>
      </div>

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
              {invoiceList.map((inv, idx) => (
                <div className="row-item" key={idx} style={{ paddingBlock: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>Statement: {inv.month || inv._id}</div>
                    <div className="text-muted" style={{ fontSize: '11px', marginTop: '1px' }}>
                      AWS search count: {inv.search_total} · training count: {inv.training_total}
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
                      <button className="btn btn-sm btn-primary" onClick={() => handleMarkPaid(inv.month || inv._id)}>
                        Mark Paid
                      </button>
                    ) : (
                      <button className="btn btn-sm btn-danger" onClick={() => handleMarkUnpaid(inv.month || inv._id)}>
                        Mark Unpaid
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
