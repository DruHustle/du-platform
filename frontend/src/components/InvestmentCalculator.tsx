import { useMemo, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, BarChart3, Info } from "lucide-react";
import { t } from "i18next";

export default function SophisticatedCalculator() {
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zim-gold/10 rounded-md">
              <BarChart3 className="h-4 w-4 text-zim-gold" />
            </div>
            <h3 className="font-black text-white text-sm">
              {tr("calculator.pro_modeler", "Pro Investment Modeler")}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-white/70">
              {tr("calculator.stress_test", "Stress Test")}
            </span>
            <Switch 
              checked={isRiskActive} 
              onCheckedChange={setIsRiskActive}
              className="data-[state=checked]:bg-zim-gold"
            />
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[11px] font-medium text-white/70">{tr("calculator.principal", "Principal")}</Label>
              <p className="text-xs font-semibold text-white">{formatCurrency(principal[0])}</p>
            </div>
            <Slider value={principal} onValueChange={setPrincipal} min={1000} max={250000} step={500} className="py-4" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[11px] font-medium text-white/70">Monthly Top-Up</Label>
              <p className="text-xs font-semibold text-white">{formatCurrency(monthlyContribution[0])}</p>
            </div>
            <Slider value={monthlyContribution} onValueChange={setMonthlyContribution} min={0} max={5000} step={50} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[11px] font-medium text-white/70">{tr("calculator.expected_return", "Expected Return (p.a.)")}</Label>
              <p className="text-xs font-semibold text-zim-gold">{annualReturn[0]}%</p>
            </div>
            <Slider value={annualReturn} onValueChange={setAnnualReturn} min={3} max={30} step={1} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[11px] font-medium text-white/70">Investment Horizon</Label>
              <p className="text-xs font-semibold text-white">{years[0]} years</p>
            </div>
            <Slider value={years} onValueChange={setYears} min={1} max={20} step={1} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[11px] font-medium text-white/70">{tr("calculator.tax_on_gains", "Tax on Gains")}</Label>
              <p className="text-xs font-semibold text-white">{taxRate[0]}%</p>
            </div>
            <Slider value={taxRate} onValueChange={setTaxRate} min={0} max={40} step={1} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[11px] font-medium text-white/70">Inflation Assumption</Label>
              <p className="text-xs font-semibold text-white">{inflationRate[0]}%</p>
            </div>
            <Slider value={inflationRate} onValueChange={setInflationRate} min={0} max={20} step={0.5} />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <Label className="text-[11px] font-medium text-white/70">Annual Platform/Management Fee</Label>
              <p className="text-xs font-semibold text-white">{annualPlatformFee[0].toFixed(1)}%</p>
            </div>
            <Slider value={annualPlatformFee} onValueChange={setAnnualPlatformFee} min={0} max={5} step={0.1} />
          </div>
        </div>

        {/* Result Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-3 border-b border-white/10">
          <div>
            <p className="text-[11px] font-medium text-white/70">Projected Net Profit</p>
            <p className="text-2xl font-black tabular-nums text-white">{formatCurrency(base.totalProfit)}</p>
          </div>
          <div className="sm:text-right lg:text-left">
            <p className="text-[11px] font-medium text-white/70">{tr("calculator.final_value_short", "Final Value")} (Post-Tax/Fees)</p>
            <p className="text-2xl font-black tabular-nums text-zim-gold">{formatCurrency(base.finalValue)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/70">Total Fees + Taxes</p>
            <p className="text-2xl font-black tabular-nums text-white">{formatCurrency(base.totalFees + base.totalTaxes)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/70">Break-even Year</p>
            <p className="text-2xl font-black tabular-nums text-white">{base.breakEvenYear ? `Year ${base.breakEvenYear}` : "Not reached"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/10 border-y border-white/10">
          <div className="py-3 md:px-4">
            <p className="text-[11px] font-medium text-white/70">Total Contributions</p>
            <p className="text-lg font-black text-white">{formatCurrency(base.contributions)}</p>
          </div>
          <div className="py-3 md:px-4">
            <p className="text-[11px] font-medium text-white/70">CAGR Estimate</p>
            <p className="text-lg font-black text-white">{base.cagr.toFixed(1)}%</p>
          </div>
          <div className="py-3 md:px-4">
            <p className="text-[11px] font-medium text-white/70">Real Value (Today USD)</p>
            <p className="text-lg font-black text-white">{formatCurrency(base.realFinalValue)}</p>
          </div>
          <div className="py-3 md:px-4">
            <p className="text-[11px] font-medium text-white/70">ROI</p>
            <p className="text-lg font-black text-white">{base.roi.toFixed(1)}%</p>
          </div>
        </div>

        {isRiskActive && (
          <div className="flex items-center gap-2 py-2 border-b border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-red-500">{tr("calculator.shock_included", "Shock Included")}</span>
          </div>
        )}

        {/* Scenario Analysis */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-medium text-white/70">Scenario Outcomes</span>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/10 border-y border-white/10">
            <div className="py-3 md:px-4">
              <p className="text-[11px] font-medium text-white/70">Conservative ({Math.max(1, annualReturn[0] - 3)}%)</p>
              <p className="text-lg font-black text-white mt-1">{formatCurrency(conservative.finalValue)}</p>
            </div>
            <div className="py-3 md:px-4">
              <p className="text-[11px] font-medium text-zim-gold">Base ({annualReturn[0]}%)</p>
              <p className="text-lg font-black text-white mt-1">{formatCurrency(base.finalValue)}</p>
            </div>
            <div className="py-3 md:px-4">
              <p className="text-[11px] font-medium text-white/70">Optimistic ({annualReturn[0] + 3}%)</p>
              <p className="text-lg font-black text-white mt-1">{formatCurrency(optimistic.finalValue)}</p>
            </div>
            <div className="py-3 md:px-4">
              <p className="text-[11px] font-medium text-white/70">Scenario Range</p>
              <p className="text-lg font-black text-white mt-1">
                {formatCurrency(optimistic.finalValue - conservative.finalValue)}
              </p>
            </div>
          </div>
        </div>

        {/* Year-by-Year Projection */}
        <div className="mt-2 pt-4 border-t border-white/10 space-y-2">
          <span className="text-[11px] font-medium text-white/70 block">Year-by-Year Projection</span>
          <div className="border-y border-white/10 divide-y divide-white/10">
            {base.rows.map((d) => (
              <div key={d.year} className="py-3 px-1 sm:px-2 grid grid-cols-3 gap-2 items-center">
                <p className="text-[11px] font-medium text-white/70">{tr("calculator.year_short", "Year")} {d.year}</p>
                <p className="text-sm font-black text-white tabular-nums">{formatCurrency(d.endBalance)}</p>
                <p className="text-[11px] text-white/70 text-right">Real: {formatCurrency(d.realBalance)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-2 pt-4 border-t border-white/10">
          <p className="text-[11px] font-medium text-white/70 mb-2">Note</p>
          <div className="flex gap-3 items-start">
          <Info className="h-5 w-5 text-zim-gold shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/70 leading-relaxed">
            <strong className="text-zim-gold mr-2">{tr("calculator.note", "Note")}:</strong> 
            {tr("calculator.disclaimer", "This is a planning tool for comparing scenarios. It is not financial advice and does not guarantee performance.")}
          </p>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
