import { useMemo, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, AlertTriangle, Receipt, BarChart3, Info, Target, Wallet, Gauge, PiggyBank } from "lucide-react";
import { motion } from "framer-motion";
import { t } from "i18next";

export default function SophisticatedCalculator() {
  const [principal, setPrincipal] = useState([10000]);
  const [monthlyContribution, setMonthlyContribution] = useState([300]);
  const [years, setYears] = useState([7]);
  const [annualReturn, setAnnualReturn] = useState([14]);
  const [inflationRate, setInflationRate] = useState([6]);
  const [taxRate, setTaxRate] = useState([15]);
  const [annualPlatformFee, setAnnualPlatformFee] = useState([1.5]);
  const [isRiskActive, setIsRiskActive] = useState(false);

  const runProjection = (targetReturn: number) => {
    let balance = principal[0];
    let contributions = principal[0];
    let totalFees = 0;
    let totalTaxes = 0;
    let breakEvenYear: number | null = null;
    const rows: Array<{
      year: number;
      endBalance: number;
      realBalance: number;
      netChange: number;
      contributionY: number;
      fees: number;
      taxes: number;
    }> = [];

    const monthlyRate = targetReturn / 100 / 12;
    const annualInflationFactor = 1 + inflationRate[0] / 100;

    for (let year = 1; year <= years[0]; year++) {
      const startBalance = balance;
      let yearlyContribution = 0;

      for (let month = 1; month <= 12; month++) {
        balance += monthlyContribution[0];
        contributions += monthlyContribution[0];
        yearlyContribution += monthlyContribution[0];
        balance *= 1 + monthlyRate;
      }

      if (isRiskActive && year === 2) {
        balance *= 0.88;
      }

      const grossGain = Math.max(0, balance - startBalance - yearlyContribution);
      const annualTax = grossGain * (taxRate[0] / 100);
      const annualFee = balance * (annualPlatformFee[0] / 100);

      balance -= annualTax;
      balance -= annualFee;

      totalTaxes += annualTax;
      totalFees += annualFee;

      const realBalance = balance / Math.pow(annualInflationFactor, year);
      const netChange = balance - startBalance;

      if (breakEvenYear === null && balance >= contributions) {
        breakEvenYear = year;
      }

      rows.push({
        year,
        endBalance: balance,
        realBalance,
        netChange,
        contributionY: yearlyContribution,
        fees: annualFee,
        taxes: annualTax,
      });
    }

    const finalValue = balance;
    const totalProfit = finalValue - contributions;
    const roi = contributions > 0 ? (totalProfit / contributions) * 100 : 0;
    const cagr =
      years[0] > 0 && principal[0] > 0
        ? (Math.pow(finalValue / principal[0], 1 / years[0]) - 1) * 100
        : 0;
    const realFinalValue = finalValue / Math.pow(1 + inflationRate[0] / 100, years[0]);

    return {
      rows,
      finalValue,
      realFinalValue,
      totalProfit,
      roi,
      cagr,
      totalFees,
      totalTaxes,
      contributions,
      breakEvenYear,
    };
  };

  const base = useMemo(() => runProjection(annualReturn[0]), [
    principal,
    monthlyContribution,
    years,
    annualReturn,
    inflationRate,
    taxRate,
    annualPlatformFee,
    isRiskActive,
  ]);

  const conservative = useMemo(() => runProjection(Math.max(1, annualReturn[0] - 3)), [
    principal,
    monthlyContribution,
    years,
    annualReturn,
    inflationRate,
    taxRate,
    annualPlatformFee,
    isRiskActive,
  ]);

  const optimistic = useMemo(() => runProjection(annualReturn[0] + 3), [
    principal,
    monthlyContribution,
    years,
    annualReturn,
    inflationRate,
    taxRate,
    annualPlatformFee,
    isRiskActive,
  ]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500">
      {/* The Crispy Edge Finish */}
      <span className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none z-20" />
      
      {/* Top Gradient Accent */}
      <div className="h-1 w-full bg-gradient-to-r from-zim-gold via-white/20 to-zim-gold opacity-50" />
      
      <CardContent className="p-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zim-gold/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-zim-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
            </div>
            <h3 className="font-black text-white text-sm uppercase tracking-[0.2em]">
              {t("data.investment_calculator_proInvestmentModeler")}
            </h3>
          </div>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              {t("data.investment_calculator_stressTest")}
            </span>
            <Switch 
              checked={isRiskActive} 
              onCheckedChange={setIsRiskActive}
              className="data-[state=checked]:bg-zim-gold"
            />
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">{t("data.investment_calculator_principal") || "Principal"}</Label>
              <p className="text-xs font-black text-white">{formatCurrency(principal[0])}</p>
            </div>
            <Slider value={principal} onValueChange={setPrincipal} min={1000} max={250000} step={500} className="py-4" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">Monthly Top-Up</Label>
              <p className="text-xs font-black text-white">{formatCurrency(monthlyContribution[0])}</p>
            </div>
            <Slider value={monthlyContribution} onValueChange={setMonthlyContribution} min={0} max={5000} step={50} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">{t("data.investment_calculator_returns") || "Expected Return (p.a.)"}</Label>
              <p className="text-xs font-black text-zim-gold">{annualReturn[0]}%</p>
            </div>
            <Slider value={annualReturn} onValueChange={setAnnualReturn} min={3} max={30} step={1} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">Investment Horizon</Label>
              <p className="text-xs font-black text-white">{years[0]} years</p>
            </div>
            <Slider value={years} onValueChange={setYears} min={1} max={20} step={1} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">{t("data.investment_calculator_taxRate") || "Tax on Gains"}</Label>
              <p className="text-xs font-black text-white">{taxRate[0]}%</p>
            </div>
            <Slider value={taxRate} onValueChange={setTaxRate} min={0} max={40} step={1} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">Inflation Assumption</Label>
              <p className="text-xs font-black text-white">{inflationRate[0]}%</p>
            </div>
            <Slider value={inflationRate} onValueChange={setInflationRate} min={0} max={20} step={0.5} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">Annual Platform/Management Fee</Label>
              <p className="text-xs font-black text-white">{annualPlatformFee[0].toFixed(1)}%</p>
            </div>
            <Slider value={annualPlatformFee} onValueChange={setAnnualPlatformFee} min={0} max={5} step={0.1} />
          </div>
        </div>

        {/* Result Summary */}
        <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-inner">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-zim-gold mb-1">
              <Target className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Projected Net Profit</span>
            </div>
            <p className="text-3xl font-black tabular-nums text-white tracking-tighter">{formatCurrency(base.totalProfit)}</p>
          </div>
          <div className="h-12 w-px bg-white/10 hidden sm:block" />
          <div className="text-center sm:text-right">
            <div className="flex items-center justify-center sm:justify-end gap-2 text-white/30 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t("data.investment_calculator_final") || "Final Value"} (Post-Tax/Fees)</span>
            </div>
            <p className="text-3xl font-black tabular-nums text-zim-gold tracking-tighter drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              {formatCurrency(base.finalValue)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-zim-gold mb-1"><Wallet className="h-4 w-4" /><span className="text-[10px] uppercase tracking-widest font-black">Total Contributions</span></div>
            <p className="text-lg font-black text-white">{formatCurrency(base.contributions)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-zim-gold mb-1"><Gauge className="h-4 w-4" /><span className="text-[10px] uppercase tracking-widest font-black">CAGR Estimate</span></div>
            <p className="text-lg font-black text-white">{base.cagr.toFixed(1)}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-zim-gold mb-1"><PiggyBank className="h-4 w-4" /><span className="text-[10px] uppercase tracking-widest font-black">Real Value (Today USD)</span></div>
            <p className="text-lg font-black text-white">{formatCurrency(base.realFinalValue)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-zim-gold mb-1"><ShieldCheck className="h-4 w-4" /><span className="text-[10px] uppercase tracking-widest font-black">ROI</span></div>
            <p className="text-lg font-black text-white">{base.roi.toFixed(1)}%</p>
          </div>
        </div>

        {/* Risk/Expense Breakdown Strip */}
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="p-2 bg-white/5 rounded-lg">
                  <Receipt className="h-4 w-4 text-white/60" />
                </div>
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">
                  Total Fees + Taxes : <span className="text-white">{formatCurrency(base.totalFees + base.totalTaxes)}</span>
                </span>
            </div>
            <div className="flex-1 flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="p-2 bg-white/5 rounded-lg">
                <BarChart3 className="h-4 w-4 text-white/60" />
              </div>
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">
                Break-even Year : <span className="text-white">{base.breakEvenYear ? `Year ${base.breakEvenYear}` : "Not reached"}</span>
              </span>
            </div>
            {isRiskActive && (
                 <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
                 >
                 <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                 <span className="text-[11px] font-bold text-red-500 uppercase tracking-widest">{t("data.investment_calculator_shockIncluded")}</span>
             </motion.div>
            )}
        </div>

        {/* Scenario Analysis */}
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 space-y-3">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em]">Scenario Outcomes</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Conservative ({Math.max(1, annualReturn[0] - 3)}%)</p>
              <p className="text-lg font-black text-white mt-1">{formatCurrency(conservative.finalValue)}</p>
            </div>
            <div className="rounded-xl border border-zim-gold/30 bg-zim-gold/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zim-gold">Base ({annualReturn[0]}%)</p>
              <p className="text-lg font-black text-white mt-1">{formatCurrency(base.finalValue)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Optimistic ({annualReturn[0] + 3}%)</p>
              <p className="text-lg font-black text-white mt-1">{formatCurrency(optimistic.finalValue)}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Timeline */}
        <div className="space-y-4">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] block">Year-by-Year Projection</span>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {base.rows.map((d) => (
              <div key={d.year} className="flex-shrink-0 w-32 p-4 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md group hover:bg-white/5 transition-colors">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">{t("data.investment_calculator_year") || "Year"} {d.year}</p>
                <p className="text-sm font-black text-white tabular-nums group-hover:text-zim-gold transition-colors">{formatCurrency(d.endBalance)}</p>
                <p className="text-[10px] text-white/50 mt-1">Real: {formatCurrency(d.realBalance)}</p>
                <div className="h-1 w-full mt-3 rounded-full bg-white/10 overflow-hidden">
                   <div 
                    className={`h-full transition-all duration-1000 ${d.netChange > 0 ? 'bg-zim-gold' : 'bg-red-500'}`} 
                    style={{ width: '100%' }}
                   />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-6 bg-zim-gold/5 border border-zim-gold/10 rounded-[1.5rem] flex gap-4 items-start">
          <Info className="h-5 w-5 text-zim-gold shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/60 leading-relaxed">
            <strong className="text-zim-gold uppercase tracking-widest mr-2">{t("data.investment_calculator_note")}:</strong> 
            {t("data.investment_calculator_disclaimer") || "This is a planning tool for comparing scenarios. It is not financial advice and does not guarantee performance."}
          </p>
        </div>
      </CardContent>
    </div>
  );
}
