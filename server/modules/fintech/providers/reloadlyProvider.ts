import {
  ReloadlyProvider as LegacyReloadlyProvider,
  type ReloadlyTopupRequest,
} from '../../../providers/reloadlyProvider';

export interface IAirtimeProvider {
  getAccessToken(): Promise<string>;
  detectOperator(phoneNumber: string, countryCode?: string): Promise<any>;
  getOperatorById(operatorId: number): Promise<any>;
  createTopup(payload: ReloadlyTopupRequest): Promise<any>;
}

export class ReloadlyProviderAdapter implements IAirtimeProvider {
  constructor(private readonly provider = new LegacyReloadlyProvider()) {}

  getAccessToken() {
    return this.provider.getAccessToken();
  }

  detectOperator(phoneNumber: string, countryCode = 'ZW') {
    return this.provider.detectOperator(phoneNumber, countryCode);
  }

  getOperatorById(operatorId: number) {
    return this.provider.getOperatorById(operatorId);
  }

  createTopup(payload: ReloadlyTopupRequest) {
    return this.provider.createTopup(payload);
  }
}
