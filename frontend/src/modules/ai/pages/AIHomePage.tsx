import ModuleLayout from '@/layouts/ModuleLayout';
import AIHub from '../components/AIHub';

export default function AIHomePage() {
  return (
    <ModuleLayout title="Onesa AI" subtitle="Modular AI domain for chat, booking, AR and VR experiences.">
      <AIHub />
    </ModuleLayout>
  );
}
