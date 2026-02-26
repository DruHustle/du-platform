import ModuleLayout from '@/layouts/ModuleLayout';
import ResponsiveSection from '@/modules/shared/components/ResponsiveSection';
import FintechTransferPanel from '../components/FintechTransferPanel';

export default function FintechHomePage() {
  return (
    <ModuleLayout
      title="Fintech Workspace"
      subtitle="Modular remittance and airtime flows with service-provider abstraction, validation, and auditability."
    >
      <ResponsiveSection>
        <FintechTransferPanel />
      </ResponsiveSection>
    </ModuleLayout>
  );
}
