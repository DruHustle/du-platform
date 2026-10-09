export class AiModuleRepository {
  listCapabilities() {
    return {
      domains: ['chat', 'trip-plan', 'health', 'ready', 'generate-world', 'ar', 'vr'],
      integrationsReady: true,
    };
  }
}
