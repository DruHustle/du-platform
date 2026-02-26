import {
  TerraPayProvider as LegacyTerraPayProvider,
  type TerraPayQuoteRequest,
  type TerraPayBeneficiaryRequest,
  type TerraPayTransferRequest,
} from '../../../providers/terrapayProvider';

export interface IRemittanceProvider {
  getFxQuote(payload: TerraPayQuoteRequest, idempotencyKey: string): Promise<any>;
  createBeneficiary(payload: TerraPayBeneficiaryRequest, idempotencyKey: string): Promise<any>;
  initiateTransaction(payload: TerraPayTransferRequest): Promise<any>;
}

export class TerraPayProviderAdapter implements IRemittanceProvider {
  constructor(private readonly provider = new LegacyTerraPayProvider()) {}

  getFxQuote(payload: TerraPayQuoteRequest, idempotencyKey: string) {
    return this.provider.getFxQuote(payload, idempotencyKey);
  }

  createBeneficiary(payload: TerraPayBeneficiaryRequest, idempotencyKey: string) {
    return this.provider.createBeneficiary(payload, idempotencyKey);
  }

  initiateTransaction(payload: TerraPayTransferRequest) {
    return this.provider.initiateTransaction(payload);
  }
}
