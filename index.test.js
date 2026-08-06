const request = require('supertest');
const app = require('./index');

describe('GET /', () => {
  it('responds with the pipeline working message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('DevSecOps pipeline is working!');
  });
});

describe('GET /health', () => {
  it('responds with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});