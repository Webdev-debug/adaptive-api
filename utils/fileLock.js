const locks = {};

function withLock(key, task) {
  const previous = locks[key] || Promise.resolve();
  const current = previous.then(() => task()).catch((err) => {
    throw err;
  });
  locks[key] = current.catch(() => {});
  return current;
}

module.exports = { withLock };
