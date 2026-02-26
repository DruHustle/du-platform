export class AiModuleController {
  getCapabilities() {
    return {
      domains: ['chat', 'booking', 'ar', 'vr'],
      features: ['prompt_templates', 'memory_store', 'analytics_tracking'],
    };
  }
}
