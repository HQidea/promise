'use strict';

const STATES = {  /* 2.1 */
  PENDING: Symbol('pending'),
  FULFILLED: Symbol('fulfilled'),
  REJECTED: Symbol('rejected')
};

function noop() {}

var Promise = function (executor) {
  this.state = STATES.PENDING;
  this.queue = [];

  if (executor) {
    executor(this.fulfill.bind(this), this.reject.bind(this));
  }
};

Object.assign(Promise.prototype, {
  then(onFulfilled, onRejected) {  /* 2.2 */
    var promise = new Promise();

    if (typeof onFulfilled !== 'function') {  /* 2.2.1.1 */
      onFulfilled = noop;
    }
    if (typeof onRejected !== 'function') {  /* 2.2.1.2 */
      onRejected = noop;
    }

    this.queue.push({
      onFulfilled,
      onRejected,
      promise
    });
    this.execute();

    return promise;  /* 2.2.7 */
  },
  fulfill(value) {  /* 2.2.2 */
    this.transition(STATES.FULFILLED, value);
  },
  reject(reason) {  /* 2.2.3 */
    this.transition(STATES.REJECTED, reason);
  },
  transition(state, param) {
    if (this.state !== STATES.PENDING) {
      return;
    }

    this.state = state;

    if (state === STATES.FULFILLED) {
      this.value = param;
    } else if (state === STATES.REJECTED) {
      this.reason = param;
    }

    this.execute();
  },
  execute() {
    let val, fn, promiseFn;

    if (this.state === STATES.PENDING) {
      return;
    } else if (this.state === STATES.FULFILLED) {  /* 2.2.6.1 */
      val = this.value;
      fn = 'onFulfilled';
      promiseFn = 'fulfill';
    } else if (this.state === STATES.REJECTED) {  /* 2.2.6.2 */
      val = this.reason;
      fn = 'onRejected';
      promiseFn = 'reject';
    }

    setTimeout(() => {  /* 2.2.4 */
      while (this.queue.length) {
        let callbacks = this.queue.shift();  /* 2.2.2.3 */ /* 2.2.3.3 */ /* 2.2.6.1 */ /* 2.2.6.2 */
        let call = callbacks[fn];  /* 2.2.5 */
        let promise = callbacks.promise;

        if (call === noop) {  /* 2.2.7.3 */ /* 2.2.7.4 */
          promise[promiseFn](val);
          continue;
        }

        try {
          let x = call(val);  /* 2.2.2.1 */ /* 2.2.3.1 */

          Resolve(promise, x);  /* 2.2.7.1 */
        } catch (e) {
          promise.reject(e);  /* 2.2.7.2 */
        }
      }
    }, 0);
  }
});

function Resolve(promise, x) {  /* 2.3 */
  if (Object.is(promise, x)) {  /* 2.3.1 */
    return promise.reject(new TypeError());
  }

  if (x instanceof Promise) {  /* 2.3.2 */
    return x.then((value) => {
      /* promise.fulfill(value); */
      Resolve(promise, value);
    }, (reason) => {
      promise.reject(reason);
    });
  }

  if (x && typeof x === 'object' || typeof x === 'function') {  /* 2.3.3 */
    let then, called = false;

    try {
      then = x.then;  /* 2.3.3.1 */
    } catch (e) {
      return promise.reject(e);  /* 2.3.3.2 */
    }

    if (typeof then === 'function') {
      try {
        then.call(x, function resolvePromise(y) {  /* 2.3.3.3 */
          if (called) {  /* 2.3.3.3.3 */
            return;
          }
          called = true;
          Resolve(promise, y);  /* 2.3.3.3.1 */
        }, function rejectPromise(r) {
          if (called) {  /* 2.3.3.3.3 */
            return;
          }
          called = true;
          promise.reject(r);  /* 2.3.3.3.2 */
        });
      } catch (e) {  /* 2.3.3.3.4 */
        if (called) {  /* 2.3.3.3.4.1 */
          return;
        }
        promise.reject(e);  /* 2.3.3.3.4.2 */
      }
    } else {  /* 2.3.3.4 */
      promise.fulfill(x);
    }
  } else {  /* 2.3.4 */
    promise.fulfill(x);
  }
}

module.exports = Promise;
