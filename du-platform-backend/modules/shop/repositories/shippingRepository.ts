export class ShippingRepository {
  async quote(address: string) {
    const distanceFactor = Math.max(1, Math.min(10, Math.ceil(address.length / 30)));
    return {
      carrier: 'Diaspora Logistics',
      estimatedDays: 3 + distanceFactor,
      feeUsd: Number((2.5 * distanceFactor).toFixed(2)),
    };
  }
}
