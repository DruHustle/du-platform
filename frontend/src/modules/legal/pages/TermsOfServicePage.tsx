import Layout from "@/components/Layout";

export default function TermsOfService() {
  return (
    <Layout>
      <section className="min-h-screen bg-slate-950 px-6 py-28">
        <div className="container mx-auto max-w-3xl text-white space-y-6">
          <h1 className="text-4xl font-black tracking-tighter">Terms of Service</h1>
          <p className="text-white/70">By using this platform, you agree to provide accurate information and comply with applicable financial and trade laws.</p>
          <p className="text-white/70">All investment content is informational and does not constitute personal financial advice.</p>
          <p className="text-white/70">Platform access may be suspended for abuse, fraud, or policy violations.</p>
        </div>
      </section>
    </Layout>
  );
}

