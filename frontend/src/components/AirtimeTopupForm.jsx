import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function extractErrorMessage(error, fallback = "Request failed") {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function looksLikeZimbabweNumber(phone) {
  const raw = String(phone || "").replace(/\s+/g, "");
  return /^\+2637\d{8}$/.test(raw) || /^2637\d{8}$/.test(raw) || /^07\d{8}$/.test(raw);
}

export default function AirtimeTopupForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [operator, setOperator] = useState(null);
  const [options, setOptions] = useState([]);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState("form");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const amountValue = useMemo(() => Number(amount || 0), [amount]);

  useEffect(() => {
    if (!looksLikeZimbabweNumber(phoneNumber)) {
      setOperator(null);
      setOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const detectResponse = await api.post("/airtime/operator/detect", { phoneNumber });
        if (detectResponse?.data?.success) {
          setOperator(detectResponse.data.data.operator);
        }

        const optionsResponse = await api.post("/airtime/options", { phoneNumber });
        if (optionsResponse?.data?.success) {
          const suggested = optionsResponse.data.data?.options?.suggestedAmounts || [];
          setOptions(Array.isArray(suggested) ? suggested : []);
        }
      } catch {
        setOperator(null);
        setOptions([]);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [phoneNumber]);

  const onConfirm = () => setStep("confirm");

  const onTopup = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/airtime/topup", {
        phoneNumber,
        amount: amountValue,
        currency: "USD",
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.error?.message || "Top-up failed");
      }

      setStatus(response.data.data);
      setStep("success");
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to complete airtime top-up."));
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-zim-gold/60";

  return (
    <section className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 text-white">
      <h3 className="text-xl font-black tracking-tight">Airtime Top-up</h3>

      {step === "form" && (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Phone Number</span>
            <input
              className={fieldClass}
              placeholder="+2637XXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/80">
            <p>
              Operator: <span className="font-semibold text-zim-gold">{operator?.name || "Auto-detecting..."}</span>
            </p>
          </div>

          <div className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Amount Options</span>
            <div className="flex flex-wrap gap-2">
              {options.length > 0 ? (
                options.slice(0, 8).map((value) => (
                  <button
                    key={String(value)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      Number(amount) === Number(value)
                        ? "border-zim-gold/50 bg-zim-gold/15 text-zim-gold"
                        : "border-white/20 bg-white/[0.03] text-white/80 hover:bg-white/[0.07]"
                    }`}
                    onClick={() => setAmount(String(value))}
                    type="button"
                  >
                  {value}
                  </button>
                ))
              ) : (
                <span className="text-xs text-white/45">No suggested amounts yet.</span>
              )}
            </div>
          </div>

          <label className="grid gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Selected Amount (USD)</span>
            <input
              className={fieldClass}
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <button
            className="rounded-full bg-zim-gold px-4 py-3 text-[11px] font-black uppercase tracking-widest text-zim-black transition hover:bg-white disabled:opacity-60"
            onClick={onConfirm}
            disabled={!looksLikeZimbabweNumber(phoneNumber) || !amountValue}
          >
            Continue
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div className="mt-4 grid gap-3">
          <h4 className="text-sm font-black uppercase tracking-widest text-white/60">Confirm Airtime Purchase</h4>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
            <p>Phone: <span className="font-semibold text-white">{phoneNumber}</span></p>
            <p>Operator: <span className="font-semibold text-white">{operator?.name || "Unknown"}</span></p>
            <p>Amount: <span className="font-semibold text-zim-gold">{amountValue.toFixed(2)} USD</span></p>
          </div>
          <div className="flex gap-2">
            <button
              className="w-1/2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/80 hover:bg-white/[0.08]"
              onClick={() => setStep("form")}
              disabled={loading}
            >
              Edit
            </button>
            <button
              className="w-1/2 rounded-full bg-zim-gold px-4 py-3 text-[11px] font-black uppercase tracking-widest text-zim-black transition hover:bg-white disabled:opacity-60"
              onClick={onTopup}
              disabled={loading}
            >
              {loading ? "Processing..." : "Confirm Top-up"}
            </button>
          </div>
        </div>
      )}

      {step === "success" && status && (
        <div className="mt-4 grid gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <h4 className="text-sm font-black uppercase tracking-widest text-emerald-300">Top-up Successful</h4>
          <p>Transaction ID: {status.transaction?.id}</p>
          <p>Reference: {status.transaction?.reloadly_reference || "Pending"}</p>
          <p>Status: {status.transaction?.status || "pending"}</p>
          <button
            className="mt-2 rounded-full border border-emerald-300/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-300/15"
            onClick={() => setStep("form")}
          >
            New Top-up
          </button>
        </div>
      )}

      {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      <p className="mt-4 text-[11px] leading-relaxed text-white/50">
        Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds.
      </p>
    </section>
  );
}
