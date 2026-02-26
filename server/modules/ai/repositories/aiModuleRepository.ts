export class AiModuleRepository {
  listCapabilities() {
    return {
      domains: ['chat', 'booking', 'ar', 'vr'],
      integrationsReady: true,
    };
  }
}
