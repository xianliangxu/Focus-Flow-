/**
 * Vitest 全局测试装配：补齐内存版 localStorage。
 *
 * 背景：vitest 默认 environment 为 node，没有 DOM；即便单个测试文件标注
 * `// @vitest-environment jsdom`，异步防抖回调（如 storage-adapter 的 500ms 写入）
 * 在测试用例结束后才触发，可能裸访问到未定义的全局 localStorage，抛
 * ReferenceError 并被判定为 unhandled rejection，导致进程退出码 1。
 *
 * 这里仅在全局 localStorage 缺失时注入内存实现；jsdom 已提供原生 localStorage
 * 时原样保留，不覆盖。
 */
function installLocalStorageStub(): void {
  if (typeof globalThis === 'undefined') return;
  if (typeof (globalThis as { localStorage?: unknown }).localStorage !== 'undefined') return;

  const store = new Map<string, string>();
  const memoryStorage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
  };

  Object.defineProperty(globalThis as Record<string, unknown>, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}

installLocalStorageStub();
