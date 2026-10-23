import { describe, expect, it, vi } from "vitest";
import { AdminService } from "../services/adminService";
import { AdminRepository } from "../repositories/adminRepository";

const product = {
  slug: "orange-drink",
  name: "Orange drink",
  description: "Six 400ml bottles",
  image_url: "/images/drink.png",
  price_cents: 499,
  currency: "EUR",
  stock_qty: 0,
  is_active: false,
  category: "beverage",
};
describe("admin product validation", () => {
  it("accepts a drink with integer minor-unit pricing and starts hidden", async () => {
    const repository = new AdminRepository();
    const create = vi
      .spyOn(repository, "createShopProduct")
      .mockResolvedValue({ id: 200, ...product, is_active: 0 });
    await new AdminService(repository).createShopProduct(product);
    expect(create).toHaveBeenCalledWith({ ...product, is_active: 0 });
  });
  it.each([
    { price_cents: 0.9 },
    { price_cents: 2147483648 },
    { stock_qty: -1 },
    { stock_qty: 1.5 },
    { stock_qty: "bad" },
    { slug: "../product" },
    { slug: "x".repeat(161) },
    { currency: "XXX" },
    { name: " " },
    { image_url: "javascript:alert(1)" },
    { image_url: "//external.test/image.png" },
    { image_url: "/\\evil.test/image.png" },
    { is_active: "false" },
  ])(
    "rejects malformed create and update fields without a write: %j",
    async invalid => {
      const repository = new AdminRepository();
      const create = vi.spyOn(repository, "createShopProduct");
      const update = vi.spyOn(repository, "updateShopProduct");
      const service = new AdminService(repository);
      await expect(
        service.createShopProduct({ ...product, ...invalid } as any)
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        service.updateShopProduct(1, invalid as any, "admin@example.test")
      ).rejects.toMatchObject({ status: 400 });
      expect(create).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    }
  );
});
