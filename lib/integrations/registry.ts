import type { AdapterConfig, AdapterFactory, ChannelManagerAdapter } from './adapter.ts';
import type { ProviderDefinition } from './types.ts';

export type RegisteredProvider = ProviderDefinition & { factory?: AdapterFactory };

export class ProviderRegistry {
  private readonly providers = new Map<string, RegisteredProvider>();

  register(def: RegisteredProvider): void {
    if (this.providers.has(def.id)) {
      throw new Error('Provider "' + def.id + '" is already registered.');
    }
    this.providers.set(def.id, def);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  get(id: string): RegisteredProvider | undefined {
    return this.providers.get(id);
  }

  list(): ProviderDefinition[] {
    return [...this.providers.values()].map(({ id, displayName, capabilities }) => ({
      id,
      displayName,
      capabilities,
    }));
  }

  instantiate(id: string, config: AdapterConfig): ChannelManagerAdapter | undefined {
    const def = this.providers.get(id);
    return def?.factory?.(config);
  }
}

export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();

  registry.register({
    id: 'beds24',
    displayName: 'Beds24',
    capabilities: [
      'reservations.read',
      'reservations.cancel',
      'properties.read',
      'units.read',
      'availability.read',
      'incrementalSync',
      'webhooks',
    ],
  });

  registry.register({
    id: 'smoobu',
    displayName: 'Smoobu',
    capabilities: [
      'reservations.read',
      'reservations.cancel',
      'properties.read',
      'units.read',
      'availability.read',
      'incrementalSync',
      'webhooks',
    ],
  });

  return registry;
}