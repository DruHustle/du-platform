import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const CONSENT_KEY = "du_cookie_consent_v1";

export default function CookieSettings() {
  const save = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    window.history.back();
  };

  return (
    <Layout>
      <section className="py-16 bg-slate-950 min-h-[70vh]">
        <div className="container px-6 mx-auto max-w-3xl">
          <div className="outer-glass-panel rounded-[2rem] border border-white/20 bg-slate-900/95 backdrop-blur-xl p-8 md:p-10">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
              Cookie settings
            </h1>
            <p className=" leading-relaxed mb-6">
              Our website uses anonymised cookies to give you the best browser experience and to collect aggregated statistics. This does not include online advertising cookies.
            </p>
            <div className="rounded-xl border border-white/20 bg-slate-900/90 p-4 mb-6">
              <p className="text-white font-semibold">Anonymised analytics cookies</p>
              <p className=" text-sm mt-1">Enabled to help us improve performance and usability.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} className="bg-zim-gold text-zim-black hover:bg-white">
                Save and continue
              </Button>
              <Link href="/privacy-policy">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-zim-black">
                  Privacy policy
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
