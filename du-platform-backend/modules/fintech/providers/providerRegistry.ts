import { ReloadlyProvider } from "./reloadlyGatewayProvider";
import { TerraPayProvider } from "./terrapayGatewayProvider";
import type { AirtimeFeatureProvider, RemittanceFeatureProvider } from "./providerTypes";
import { ReloadlyService } from "../services/reloadlyGatewayService";
import { TerraPayGatewayService } from "../services/terrapayGatewayService";

type RemittanceProviderFactory = () => RemittanceFeatureProvider;
type AirtimeProviderFactory = () => AirtimeFeatureProvider;

function normalizeProviderName(value: string | undefined, fallback: string): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized || fallback;
}

function formatAvailableProviders(names: Iterable<string>): string {
  return Array.from(names)
    .sort()
    .join(", ");
}

export class FintechProviderRegistry {
  private readonly remittanceFactories = new Map<string, RemittanceProviderFactory>();
  private readonly airtimeFactories = new Map<string, AirtimeProviderFactory>();
  private readonly remittanceInstances = new Map<string, RemittanceFeatureProvider>();
  private readonly airtimeInstances = new Map<string, AirtimeFeatureProvider>();

  registerRemittanceProvider(name: string, factory: RemittanceProviderFactory) {
    this.remittanceFactories.set(String(name).trim().toLowerCase(), factory);
  }

  registerAirtimeProvider(name: string, factory: AirtimeProviderFactory) {
    this.airtimeFactories.set(String(name).trim().toLowerCase(), factory);
  }

  getRemittanceProvider(name = normalizeProviderName(process.env.FINTECH_REMITTANCE_PROVIDER, "terrapay")) {
    const normalizedName = normalizeProviderName(name, "terrapay");
    const cached = this.remittanceInstances.get(normalizedName);
    if (cached) return cached;

    const factory = this.remittanceFactories.get(normalizedName);
    if (!factory) {
      throw new Error(
        `Unsupported remittance provider "${normalizedName}". Available: ${formatAvailableProviders(
          this.remittanceFactories.keys()
        )}`
      );
    }

    const provider = factory();
    if (!provider.supports("remittance")) {
      throw new Error(`Provider "${normalizedName}" does not support remittance.`);
    }
    this.remittanceInstances.set(normalizedName, provider);
    return provider;
  }

  getAirtimeProvider(name = normalizeProviderName(process.env.FINTECH_AIRTIME_PROVIDER, "reloadly")) {
    const normalizedName = normalizeProviderName(name, "reloadly");
    const cached = this.airtimeInstances.get(normalizedName);
    if (cached) return cached;

    const factory = this.airtimeFactories.get(normalizedName);
    if (!factory) {
      throw new Error(
        `Unsupported airtime provider "${normalizedName}". Available: ${formatAvailableProviders(
          this.airtimeFactories.keys()
        )}`
      );
    }

    const provider = factory();
    if (!provider.supports("airtime")) {
      throw new Error(`Provider "${normalizedName}" does not support airtime.`);
    }
    this.airtimeInstances.set(normalizedName, provider);
    return provider;
  }
}

export function createFintechProviderRegistry() {
  const registry = new FintechProviderRegistry();
  registry.registerRemittanceProvider("terrapay", () => new TerraPayGatewayService(new TerraPayProvider()));
  registry.registerAirtimeProvider("reloadly", () => new ReloadlyService(new ReloadlyProvider()));
  return registry;
}

let fintechProviderRegistrySingleton: FintechProviderRegistry | null = null;

export function getFintechProviderRegistry() {
  if (!fintechProviderRegistrySingleton) {
    fintechProviderRegistrySingleton = createFintechProviderRegistry();
  }
  return fintechProviderRegistrySingleton;
}
