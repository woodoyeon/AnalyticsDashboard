// chatControl.ts 간단 이벤트 버스: 채팅 명령 → 페이지 버튼/기능 실행 
type Handler = (payload?: any) => void;

const registry = new Map<string, Handler>();

export function registerAction(name: string, handler: Handler) {
  const key = name.toLowerCase();
  registry.set(key, handler);
  return () => registry.delete(key); // 언레지스터 함수 반환
}

export function triggerAction(name: string, payload?: any): boolean {
  const fn = registry.get(name.toLowerCase());
  if (!fn) return false;
  fn(payload);
  return true;
}

export function listActions() {
  return Array.from(registry.keys()).sort();
}
