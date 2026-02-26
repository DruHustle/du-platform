import { Suspense, lazy } from 'react';

const VirtualTour = lazy(() => import('@/pages/OnesaAITourismVirtualExperience'));
const AugmentedTour = lazy(() => import('@/pages/OnesaAITourismAugmentedExperience'));

export default function AIHub() {
  return (
    <div className="module-card p-4">
      <h3 className="text-sm font-black uppercase tracking-wider text-white/75">AI Module Hub</h3>
      <p className="mt-2 text-xs text-white/60">Heavy AR/VR experiences are lazy-loaded for faster first paint.</p>
      <div className="mt-4 space-y-4">
        <Suspense fallback={<p className="text-xs text-white/50">Loading VR experience...</p>}>
          <div className="rounded-xl border border-white/10 p-2">
            <VirtualTour />
          </div>
        </Suspense>
        <Suspense fallback={<p className="text-xs text-white/50">Loading AR experience...</p>}>
          <div className="rounded-xl border border-white/10 p-2">
            <AugmentedTour />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
