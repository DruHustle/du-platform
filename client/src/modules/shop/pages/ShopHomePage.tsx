import ModuleLayout from '@/layouts/ModuleLayout';
import ShopGrid from '../components/ShopGrid';

export default function ShopHomePage() {
  return (
    <ModuleLayout title="Shop Domain" subtitle="Products, orders, inventory, payments and shipping in a single bounded context.">
      <ShopGrid />
    </ModuleLayout>
  );
}
