type Environment = {
  paused: () => boolean;
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel: (timer: ReturnType<typeof setTimeout>) => void;
  listen: (callback: () => void) => () => void;
};

// Schedule after completion, so slow requests never accumulate or overlap.
export function startOrderSync(refresh: (signal: AbortSignal) => Promise<void>, report: (error: string) => void, env: Environment, delay = 5000) {
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  const tick = async () => {
    if (stopped || running) return;
    if (timer !== undefined) env.cancel(timer);
    if (!env.paused()) {
      running = true;
      controller = new AbortController();
      try { await refresh(controller.signal); if (!stopped) report(''); }
      catch (error) { if (!stopped && !controller.signal.aborted) report(error instanceof Error ? error.message : 'Chưa cập nhật được đơn hàng.'); }
      finally { running = false; }
    }
    if (!stopped) timer = env.schedule(() => { void tick(); }, delay);
  };
  const unlisten = env.listen(() => { void tick(); });
  timer = env.schedule(() => { void tick(); }, delay);
  return () => { stopped = true; controller?.abort(); if (timer !== undefined) env.cancel(timer); unlisten(); };
}
