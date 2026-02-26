export class InventoryRepository {
  async reserve(_items: Array<{ slug: string; quantity: number }>) {
    return { reserved: true };
  }
}
