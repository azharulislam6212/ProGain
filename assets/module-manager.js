 export default class ModuleManager {
  constructor() {
    this.instances = new Map();
  }

  async load(key, importer, context = document) {
    if (this.instances.has(key)) return;

    try {
      const mod = await importer();
      if (!mod?.default) return;

      const instance = new mod.default(context);
      this.instances.set(key, instance);
    } catch (err) {
      console.error(`Module ${key} failed`, err);
    }
  }

  unload(key) {
    const instance = this.instances.get(key);
    if (!instance) return;

    instance?.destroy?.();
    this.instances.delete(key);
  }

  unloadAll() {
    this.instances.forEach((_, key) => this.unload(key));
  }
}