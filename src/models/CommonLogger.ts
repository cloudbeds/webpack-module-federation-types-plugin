export type CommonLogger = {
  error: (...data: unknown[]) => void;
  warn: (...data: unknown[]) => void;
  info: (...data: unknown[]) => void;
  log: (...data: unknown[]) => void;
  group: (...data: unknown[]) => void;
  groupEnd: () => void;
  groupCollapsed: (...data: unknown[]) => void;
};
