import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Globe, Store, Utensils, Heart, Zap, Truck, Users } from "lucide-react";

export default function ZimbabweShopInfo() {
  return (
    <div className="space-y-12 py-12">
      {/* Hero Section for Zimbabwe Shop */}
      <div className="relative rounded-2xl overflow-hidden h-[400px]">
        <img 
          src="/images/zimbabwe_shop_hero.jpg" 
          alt="Zimbabwe Shop" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-center p-6">
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">🇿🇼 Zimbabwe Shop</h2>
            <p className="text-xl text-white/90 font-medium">EU Diaspora & Tourism Commerce Gateway</p>
            <p className="text-lg text-white/80 mt-2">Connecting Culture. Commerce. Tourism. Identity.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-3xl font-bold">The Zimbabwe Shop Model</h3>
          <p className="text-lg text-muted-foreground">
            Zimbabwe Shop is a hybrid Diaspora Commerce + Tourism Promotion + Export Enablement Platform designed to connect Zimbabwean culture, products, and experiences with the European market.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <Globe className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">EU Online Store</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                EU-wide shipping with multi-currency checkout and fast delivery (2–5 days).
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Store className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">Physical Store</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Coming soon: Cultural showroom, tourism hub, and diaspora community centre.
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-muted/50 rounded-2xl p-8 space-y-6">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Our Strategic Mission
          </h3>
          <ul className="space-y-3">
            {[
              "Monetize Zimbabwean national identity and culture",
              "Create export pathways for SMEs, artisans, and brands",
              "Strengthen diaspora connection to home",
              "Fund tourism promotion through commerce revenue",
              "Provide EU-compliant distribution for Zimbabwean products"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary text-xs font-bold">{i + 1}</span>
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Product Categories */}
      <div className="space-y-8">
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-2">🛍 Product Categories</h3>
          <p className="text-muted-foreground">Quality Zimbabwean goods delivered across Europe</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Sports Merchandise
              </CardTitle>
              <CardDescription>Official national team gear</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                <li><strong>Rugby (Sables):</strong> Jerseys, caps, training wear</li>
                <li><strong>Cricket (Chevrons):</strong> Replica kits, collectibles</li>
                <li><strong>Football (Warriors):</strong> Jerseys, scarves, supporter gear</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Arts & Crafts
              </CardTitle>
              <CardDescription>Supporting rural artisans</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                <li>Stone sculpture replicas</li>
                <li>Handwoven baskets</li>
                <li>Beaded jewellery</li>
                <li>Textiles & Home décor</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Food & Nostalgia
              </CardTitle>
              <CardDescription>EU-compliant exports</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                <li>Mazoe beverages & Cerevita</li>
                <li>Maputi snack variants</li>
                <li>Export-grade peanut butter</li>
                <li>Dovi sauces & Herbal teas</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Why it Matters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold">🌍 Why Zimbabwe Shop Matters</h3>
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
              <h4 className="font-bold mb-1">Tourism Funnel Effect</h4>
              <p className="text-sm text-muted-foreground">Commerce drives tourism awareness and travel conversion: Purchase → Discover → Book → Visit.</p>
            </div>
            <div className="p-4 bg-secondary/5 rounded-lg border-l-4 border-secondary">
              <h4 className="font-bold mb-1">Diaspora Identity Economy</h4>
              <p className="text-sm text-muted-foreground">Customers are buying belonging, memory, culture, and pride.</p>
            </div>
            <div className="p-4 bg-accent/5 rounded-lg border-l-4 border-accent">
              <h4 className="font-bold mb-1">Export Market Testing</h4>
              <p className="text-sm text-muted-foreground">Low-risk EU market testing and brand development for Zimbabwean SMEs.</p>
            </div>
          </div>
        </div>
        <div className="bg-primary text-primary-foreground rounded-2xl p-8 space-y-6">
          <h3 className="text-2xl font-bold">📦 EU Logistics Strategy</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Truck className="h-6 w-6 shrink-0" />
              <div>
                <h4 className="font-bold">Phase 1: Import + Warehousing</h4>
                <p className="text-sm opacity-90">Fulfilment hubs in Germany/Netherlands for fast EU-wide distribution.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Zap className="h-6 w-6 shrink-0" />
              <div>
                <h4 className="font-bold">Phase 2: Light Assembly</h4>
                <p className="text-sm opacity-90">Gift sets, craft packaging, and subscription box preparation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Innovation Features */}
      <div className="bg-muted rounded-2xl p-8">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-4">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Future Innovation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold mb-2">Diaspora Subscription Box</h4>
                <p className="text-sm text-muted-foreground">Monthly curated experience of snacks, crafts, and featured tourism destinations.</p>
              </div>
              <div>
                <h4 className="font-bold mb-2">Digital Product Passport</h4>
                <p className="text-sm text-muted-foreground">QR-based scanning to discover artisan stories, culture, and tourism content.</p>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-4">
              <Users className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm font-medium">Strategic Partnerships</p>
                <p className="text-xs text-muted-foreground">Ministry of Tourism, ZimTrade, EU Compliance Specialists</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center p-8 border-2 border-dashed rounded-2xl">
        <h3 className="text-2xl font-bold mb-2">🌍 Vision</h3>
        <p className="text-lg italic text-muted-foreground max-w-4xl mx-auto">
          "To build the leading global commercial gateway connecting Zimbabwe’s culture, products, tourism, and investment opportunities with the European market and diaspora communities worldwide."
        </p>
      </div>
    </div>
  );
}
