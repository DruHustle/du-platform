import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Calendar, Percent } from "lucide-react";

export default function InvestmentCalculator() {
  const [investmentAmount, setInvestmentAmount] = useState([5000]);
  const [timeline, setTimeline] = useState([3]);
  const [returnRate, setReturnRate] = useState([12]);

  // Calculate returns
  const principal = investmentAmount[0];
  const years = timeline[0];
  const rate = returnRate[0] / 100;

  // Compound interest calculation
  const futureValue = principal * Math.pow(1 + rate, years);
  const totalReturns = futureValue - principal;
  const annualReturn = totalReturns / years;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Generate yearly breakdown
  const yearlyBreakdown = Array.from({ length: years }, (_, i) => {
    const year = i + 1;
    const value = principal * Math.pow(1 + rate, year);
    const yearReturn = value - (i === 0 ? principal : principal * Math.pow(1 + rate, i));
    return {
      year,
      value,
      return: yearReturn,
    };
  });

  return (
    <Card className="border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Investment Calculator
        </CardTitle>
        <CardDescription>
          Calculate potential returns on your diaspora investment portfolio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Input Controls */}
        <div className="space-y-6">
          {/* Investment Amount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Investment Amount
              </Label>
              <Badge variant="secondary" className="text-lg font-bold">
                {formatCurrency(investmentAmount[0])}
              </Badge>
            </div>
            <Slider
              value={investmentAmount}
              onValueChange={setInvestmentAmount}
              min={500}
              max={50000}
              step={500}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$500</span>
              <span>$50,000</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Investment Timeline
              </Label>
              <Badge variant="secondary" className="text-lg font-bold">
                {timeline[0]} {timeline[0] === 1 ? 'Year' : 'Years'}
              </Badge>
            </div>
            <Slider
              value={timeline}
              onValueChange={setTimeline}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 year</span>
              <span>10 years</span>
            </div>
          </div>

          {/* Expected Return Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Expected Annual Return
              </Label>
              <Badge variant="secondary" className="text-lg font-bold">
                {returnRate[0]}%
              </Badge>
            </div>
            <Slider
              value={returnRate}
              onValueChange={setReturnRate}
              min={5}
              max={20}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5%</span>
              <span>20%</span>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Investment</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(principal)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Returns</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReturns)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Final Value</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(futureValue)}</p>
          </div>
        </div>

        {/* Yearly Breakdown */}
        <div>
          <h4 className="text-sm md:text-base font-semibold mb-4">Projected Growth</h4>
          <div className="space-y-3">
            {yearlyBreakdown.map((item) => (
              <div key={item.year} className="flex items-center justify-between p-2 md:p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm md:text-base font-bold text-primary">Y{item.year}</span>
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-semibold">Year {item.year}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Annual return: {formatCurrency(item.return)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm md:text-lg font-bold">{formatCurrency(item.value)}</p>
                  <p className="text-xs text-green-600">
                    +{((item.value / principal - 1) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900">
            <strong>Note:</strong> This calculator provides estimates based on assumed constant returns. 
            Actual investment performance may vary. Past performance does not guarantee future results. 
            Please consult with financial advisors and review project details before investing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
