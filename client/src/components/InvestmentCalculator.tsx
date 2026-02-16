import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, ShieldCheck, AlertTriangle, Receipt, BarChart3, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "i18next";

export default function SophisticatedCalculator() {
  const [amount, setAmount] = useState([10000]);
  const [timeline, setTimeline] = useState([5]);
  const [rate, setRate] = useState([12]);
  const [taxRate, setTaxRate] = useState([15]);
  const [insurance, setInsurance] = useState([200]);
  const [isRiskActive, setIsRiskActive] = useState(false);

  const calculateData = () => {
    let currentPrincipal = amount[0];
    const yearlyData = [];
    const totalInsurance = insurance[0] * timeline[0];
    
    for (let i = 1; i <= timeline[0]; i++) {
      let annualGain = currentPrincipal * (rate[0] / 100);
      if (isRiskActive && i === 2) {
        annualGain -= (currentPrincipal * 0.15);
      }
      const taxAmount = annualGain > 0 ? annualGain * (taxRate[0] / 100) : 0;
      const netGain = annualGain - taxAmount - insurance[0];
      currentPrincipal += netGain;
      yearlyData.push({ year: i, value: currentPrincipal, netGain });
    }
    const totalProfit = currentPrincipal - amount[0];
    return { yearlyData, finalValue: currentPrincipal, totalProfit, totalInsurance };
  };

  const { yearlyData, finalValue, totalProfit, totalInsurance } = calculateData();

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
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">{t("data.investment_calculator_principal")}</Label>
              <p className="text-xs font-black text-white">{formatCurrency(amount[0])}</p>
            </div>
            <Slider value={amount} onValueChange={setAmount} min={1000} max={100000} step={1000} className="py-4" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">{t("data.investment_calculator_returns")}</Label>
              <p className="text-xs font-black text-zim-gold">{rate[0]}%</p>
            </div>
            <Slider value={rate} onValueChange={setRate} min={1} max={25} step={1} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">{t("data.investment_calculator_taxRate")}</Label>
              <p className="text-xs font-black text-white">{taxRate[0]}%</p>
            </div>
            <Slider value={taxRate} onValueChange={setTaxRate} min={0} max={40} step={1} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] uppercase font-black text-white/30 tracking-widest">{t("data.investment_calculator_insurance/Year")}</Label>
              <p className="text-xs font-black text-white">{formatCurrency(insurance[0])}</p>
            </div>
            <Slider value={insurance} onValueChange={setInsurance} min={0} max={2000} step={50} />
          </div>
        </div>

        {/* Sophisticated Result Summary */}
        <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-inner">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-zim-gold mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t("data.investment_calculator_netProfit")}</span>
            </div>
            <p className="text-3xl font-black tabular-nums text-white tracking-tighter">{formatCurrency(totalProfit)}</p>
          </div>
          <div className="h-12 w-px bg-white/10 hidden sm:block" />
          <div className="text-center sm:text-right">
            <div className="flex items-center justify-center sm:justify-end gap-2 text-white/30 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t("data.investment_calculator_final")} (Post-Tax)</span>
            </div>
            <p className="text-3xl font-black tabular-nums text-zim-gold tracking-tighter drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              {formatCurrency(finalValue)}
            </p>
          </div>
        </div>

        {/* Risk/Expense Breakdown Strip */}
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="p-2 bg-white/5 rounded-lg">
                  <Receipt className="h-4 w-4 text-white/60" />
                </div>
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">
                  {t("data.investment_calculator_fees")} : <span className="text-white">{formatCurrency(totalInsurance)}</span>
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

        {/* Scrollable Timeline */}
        <div className="space-y-4">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] block">Growth Projection</span>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {yearlyData.map((d) => (
              <div key={d.year} className="flex-shrink-0 w-32 p-4 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md group hover:bg-white/5 transition-colors">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">{t("data.investment_calculator_year")} { d.year}</p>
                <p className="text-sm font-black text-white tabular-nums group-hover:text-zim-gold transition-colors">{formatCurrency(d.value)}</p>
                <div className="h-1 w-full mt-3 rounded-full bg-white/10 overflow-hidden">
                   <div 
                    className={`h-full transition-all duration-1000 ${d.netGain > 0 ? 'bg-zim-gold' : 'bg-red-500'}`} 
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
            {t("data.investment_calculator_disclaimer")}
          </p>
        </div>
      </CardContent>
    </div>
  );
}