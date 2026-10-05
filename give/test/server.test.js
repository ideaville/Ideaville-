import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

test('server serves the prototype shell and model', async () => {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const page = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /id="screen"/);
    assert.match(html, /Give/);

    const model = await fetch(`http://127.0.0.1:${port}/src/model.js`);
    assert.equal(model.status, 200);
    assert.match(model.headers.get('content-type'), /javascript/);
    const source = await model.text();
    assert.match(source, /createInitialState/);

    const missing = await fetch(`http://127.0.0.1:${port}/src/missing.js`);
    assert.equal(missing.status, 404);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
