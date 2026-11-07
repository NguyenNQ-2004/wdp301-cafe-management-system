const mongoose = require('mongoose');
const { runWithTransaction } = require('./mongoTransaction');

// Buffer success until commit. Handled validation/error responses must abort too.
function atomicRoute(handler) {
  return async (req, res, next) => {
    let response;
    try {
      for (const name of mongoose.modelNames()) await mongoose.model(name).init();
      await runWithTransaction(async () => {
        response = undefined;
        const buffered = {
          statusCode: 200,
          status(code) { this.statusCode = code; return this; },
          json(body) { response = { status: this.statusCode, body }; return this; },
          send(body) { return this.json(body); }
        };
        await handler(req, buffered, next);
        if (!response) throw new Error('Atomic handler did not produce a response');
        if (response.status >= 400) throw Object.assign(new Error('Abort HTTP response'), { atomicResponse: response });
      });
      return res.status(response.status).json(response.body);
    } catch (error) {
      if (error.atomicResponse) return res.status(error.atomicResponse.status).json(error.atomicResponse.body);
      const status = error.status || (error.code === 11000 || error.name === 'VersionError' || error.hasErrorLabel?.('TransientTransactionError') ? 409 : 500);
      return res.status(status).json({ message: status === 503 ? error.message : status === 409 ? 'Dữ liệu vừa thay đổi hoặc yêu cầu bị trùng. Vui lòng tải lại và thử lại.' : 'Không thể hoàn tất thao tác. Dữ liệu chưa được lưu.' });
    }
  };
}

// Authorization middleware runs before the final transactional business handler.
function atomicRouter(router, exclude = []) {
  for (const method of ['post', 'put', 'patch', 'delete']) {
    const register = router[method].bind(router);
    router[method] = (path, ...handlers) => {
      if (!exclude.includes(`${method.toUpperCase()} ${path}`)) handlers[handlers.length - 1] = atomicRoute(handlers[handlers.length - 1]);
      return register(path, ...handlers);
    };
  }
  return router;
}

module.exports = { atomicRoute, atomicRouter };
