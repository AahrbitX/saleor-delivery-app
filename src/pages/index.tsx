import { useState } from "react";

interface TrackingInfo {
  status: string;
  statusTime: string;
  location: string;
  awb: string;
}

interface ServiceabilityData {
  success: boolean;
  error: string;
  data: Array<{
    center: string;
    city: string;
    state: string;
    pincode: string;
    fm_serviceable: boolean;
    payment_type: string;
  }>;
}

export default function DelhiveryApp() {
  const [waybill, setWaybill] = useState("");
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [trackError, setTrackError] = useState("");
  const [pincode, setPincode] = useState("");
  const [serviceability, setServiceability] = useState<ServiceabilityData | null>(null);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [loadingPin, setLoadingPin] = useState(false);

  async function trackShipment() {
    if (!waybill.trim()) return;
    setLoadingTrack(true);
    setTracking(null);
    setTrackError("");
    try {
      const res = await fetch(`/api/delhivery/track?waybill=${waybill}`);
      const data = await res.json();
      if (data.error) setTrackError(data.error);
      else setTracking(data);
    } catch {
      setTrackError("Failed to fetch tracking info.");
    } finally {
      setLoadingTrack(false);
    }
  }

  async function checkServiceability() {
    if (!pincode.trim()) return;
    setLoadingPin(true);
    setServiceability(null);
    try {
      const res = await fetch(`/api/delhivery/serviceability?pin=${pincode}`);
      const data = await res.json();
      setServiceability(data);
    } catch {
      setServiceability(null);
    } finally {
      setLoadingPin(false);
    }
  }

  const parsePaymentTypes = (payment_type: string): string[] => {
    try { return JSON.parse(payment_type); } catch { return []; }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #fff;
          color: #111;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
        }

        .app {
          max-width: 760px;
          margin: 0 auto;
          padding: 40px 20px 60px;
        }

        .header {
          margin-bottom: 36px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e5e5;
        }

        .header h1 {
          font-size: 22px;
          font-weight: 700;
          color: #111;
          letter-spacing: -0.02em;
        }

        .header p {
          margin-top: 4px;
          font-size: 13px;
          color: #888;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 600px) {
          .app { padding: 24px 16px 40px; }
          .header { margin-bottom: 24px; padding-bottom: 20px; }
          .header h1 { font-size: 18px; }
          .header p { font-size: 12px; }
          .grid { grid-template-columns: 1fr; gap: 12px; }
          .card { padding: 16px; }
          .input-field { font-size: 16px; }
          .result-row { flex-wrap: wrap; gap: 4px; }
          .result-value { text-align: left; }
          .tags { justify-content: flex-start; }
        }

        .card {
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 20px;
        }

        .card h2 {
          font-size: 14px;
          font-weight: 600;
          color: #111;
          margin-bottom: 2px;
        }

        .card-desc {
          font-size: 12px;
          color: #999;
          margin-bottom: 14px;
        }

        .input-row {
          display: flex;
          gap: 8px;
        }

        .input-field {
          flex: 1;
          min-width: 0;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 8px 11px;
          font-size: 13px;
          color: #111;
          outline: none;
          background: #fff;
          transition: border-color 0.15s;
        }

        .input-field::placeholder { color: #bbb; }
        .input-field:focus { border-color: #111; }

        .btn {
          background: #111;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
          min-width: 52px;
          text-align: center;
        }

        .btn:hover:not(:disabled) { background: #333; }
        .btn:disabled { background: #ccc; cursor: not-allowed; }

        .spinner {
          display: inline-block;
          width: 11px;
          height: 11px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .result-box {
          margin-top: 14px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          overflow: hidden;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .result-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 14px;
          border-bottom: 1px solid #f0f0f0;
          gap: 12px;
        }

        .result-row:last-child { border-bottom: none; }

        .result-label {
          font-size: 11px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .result-value {
          font-size: 13px;
          color: #111;
          font-weight: 500;
          text-align: right;
          word-break: break-word;
        }

        .result-value.mono {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 12px;
        }

        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        .badge-ok {
          background: #f0f0f0;
          color: #111;
          border: 1px solid #ddd;
        }

        .badge-err {
          background: #fff0f0;
          color: #c00;
          border: 1px solid #fcc;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          justify-content: flex-end;
        }

        .tag {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid #ddd;
          color: #555;
          background: #fafafa;
        }

        .msg-error {
          margin-top: 10px;
          padding: 9px 12px;
          border: 1px solid #fcc;
          border-radius: 6px;
          font-size: 12px;
          color: #c00;
          background: #fff8f8;
        }

        .msg-warn {
          margin-top: 10px;
          padding: 9px 12px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          font-size: 12px;
          color: #666;
          background: #fafafa;
        }
        @media (max-width: 600px) {
          .app { padding: 24px 16px 40px; }
          .header { margin-bottom: 24px; padding-bottom: 20px; }
          .header h1 { font-size: 18px; }
          .header p { font-size: 12px; }
          .grid { grid-template-columns: 1fr; gap: 12px; }
          .card { padding: 16px; }
          .input-field { font-size: 16px; }
          .result-row { flex-wrap: wrap; gap: 4px; }
          .result-value { text-align: left; }
          .tags { justify-content: flex-start; }
        }
        @media (max-width: 600px) {
          .app { padding: 24px 16px 40px; }
          .header { margin-bottom: 24px; padding-bottom: 20px; }
          .header h1 { font-size: 18px; }
          .header p { font-size: 12px; }
          .grid { grid-template-columns: 1fr; gap: 12px; }
          .card { padding: 16px; }
          .input-field { font-size: 16px; }
          .result-row { flex-wrap: wrap; gap: 4px; }
          .result-value { text-align: left; }
          .tags { justify-content: flex-start; }
        }
      `}</style>

      <div className="app">
        <div className="header">
          <h1>Delhivery Shipping</h1>
          <p>Track shipments · Check pincode serviceability</p>
        </div>

        <div className="grid">
          {/* Track */}
          <div className="card">
            <h2>Track Shipment</h2>
            <p className="card-desc">Enter AWB / waybill number</p>
            <div className="input-row">
              <input
                className="input-field"
                value={waybill}
                onChange={(e) => setWaybill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && trackShipment()}
                placeholder="e.g. 1234567890"
              />
              <button className="btn" onClick={trackShipment} disabled={loadingTrack || !waybill.trim()}>
                {loadingTrack ? <span className="spinner" /> : "Track"}
              </button>
            </div>

            {trackError && <div className="msg-error">⚠ {trackError}</div>}

            {tracking && (
              <div className="result-box">
                <div className="result-row">
                  <span className="result-label">AWB</span>
                  <span className="result-value mono">{tracking.awb}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Status</span>
                  <span className="badge badge-ok">{tracking.status}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Location</span>
                  <span className="result-value">{tracking.location}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Updated</span>
                  <span className="result-value mono">{tracking.statusTime}</span>
                </div>
              </div>
            )}
          </div>

          {/* Pincode */}
          <div className="card">
            <h2>Pincode Check</h2>
            <p className="card-desc">Verify delivery coverage</p>
            <div className="input-row">
              <input
                className="input-field"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && checkServiceability()}
                placeholder="6-digit pincode"
                maxLength={6}
              />
              <button className="btn" onClick={checkServiceability} disabled={loadingPin || pincode.length !== 6}>
                {loadingPin ? <span className="spinner" /> : "Check"}
              </button>
            </div>

            {serviceability && !serviceability.success && (
              <div className="msg-warn">Not serviceable by Delhivery.</div>
            )}

            {serviceability?.success && serviceability.data[0] && (() => {
              const d = serviceability.data[0];
              const payments = parsePaymentTypes(d.payment_type);
              return (
                <div className="result-box">
                  <div className="result-row">
                    <span className="result-label">Status</span>
                    <span className="badge badge-ok">Serviceable</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">City</span>
                    <span className="result-value">{d.city}, {d.state}</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Hub</span>
                    <span className="result-value" style={{ fontSize: "11px" }}>{d.center}</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">First Mile</span>
                    <span className={`badge ${d.fm_serviceable ? "badge-ok" : "badge-err"}`}>
                      {d.fm_serviceable ? "Yes" : "No"}
                    </span>
                  </div>
                  {payments.length > 0 && (
                    <div className="result-row">
                      <span className="result-label">Payment</span>
                      <div className="tags">
                        {payments.map((p) => <span key={p} className="tag">{p}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </>
  );
}