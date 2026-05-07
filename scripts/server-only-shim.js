// Force "server-only" to be treated as a noop in Node/CLI scripts.
// This avoids the runtime throw from the package when we run backend utilities outside Next.js.
import Module from 'node:module';

const originalLoad = Module._load;

Module._load = function shimServerOnly(
  request,
  _parent,
  _isMain,
  ...restArgs
) {
  if (request === 'server-only') {
    return {};
  }
  return originalLoad.call(this, request, _parent, _isMain, ...restArgs);
};
