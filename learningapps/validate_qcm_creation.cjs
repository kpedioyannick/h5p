#!/usr/bin/env node

/**
 * Validate QCM creation on LearningApps
 *
 * 1. Check that the server is running
 * 2. Create one QCM via POST /api/content/learningapps
 * 3. Validate response: success, appId, iframeUrl
 *
 * Usage:
 *   cd learningapps && npm run dev   # in one terminal
 *   node validate_qcm_creation.cjs    # in another
 */

const http = require('http');

const BASE_URL = process.env.LEARNINGAPPS_BASE_API || 'http://localhost:3001';
const parsed = new URL(BASE_URL);
const HOST = parsed.hostname;
const PORT = parsed.port || (parsed.protocol === 'https:' ? 443 : 80);

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('Validation: LearningApps server + QCM creation\n');
  console.log('Server URL:', BASE_URL);
  console.log('');

  // 1. Ensure server is running
  console.log('1. Checking if server is running...');
  let res;
  try {
    res = await request('GET', '/api/modules/learningapps');
  } catch (e) {
    console.log('   FAIL: Cannot reach server:', e.message);
    console.log('   => Start the server in another terminal: cd learningapps && npm run dev');
    console.log('   => Default port is 3001. Override with LEARNINGAPPS_BASE_API=http://localhost:3001');
    process.exit(1);
  }

  if (res.status !== 200 || !res.body.modules) {
    console.log('   FAIL: Unexpected response', res.status, res.body);
    console.log('   => Ensure the LearningApps server is running: npm run dev');
    process.exit(1);
  }

  const hasQcm = res.body.modules.some((m) => m.name === 'Qcm');
  if (!hasQcm) {
    console.log('   FAIL: Qcm module not listed');
    process.exit(1);
  }

  console.log('   OK: Server is running, Qcm module is available\n');

  // 2. Create one QCM
  const qcmPayload = {
    module: 'Qcm',
    title: 'Validation QCM - ' + new Date().toISOString().slice(0, 19),
    params: {
      task: 'Choisir la bonne réponse.',
      questions: [
        {
          question_text: 'Quelle est la capitale de la France ?',
          answers: [
            { answer_text: 'Paris', is_correct: true },
            { answer_text: 'Lyon', is_correct: false },
            { answer_text: 'Marseille', is_correct: false },
          ],
        },
      ],
    },
  };

  console.log('2. Creating QCM via POST /api/content/learningapps...');
  try {
    res = await request('POST', '/api/content/learningapps', qcmPayload);
  } catch (e) {
    console.log('   FAIL: Request error:', e.message);
    process.exit(1);
  }

  if (res.status !== 200) {
    console.log('   FAIL: Status', res.status);
    console.log('   Body:', JSON.stringify(res.body, null, 2));
    process.exit(1);
  }

  const { success, appId, iframeUrl, error, details } = res.body;

  if (!success || !appId) {
    console.log('   FAIL: Creation failed');
    if (error) console.log('   Error:', error);
    if (details) console.log('   Details:', details);
    console.log('   Body:', JSON.stringify(res.body, null, 2));
    process.exit(1);
  }

  console.log('   OK: QCM created');
  console.log('   AppId:', appId);
  console.log('   iframeUrl:', iframeUrl || '(see response)');
  console.log('');
  console.log('Validation passed: server is up and QCM creation works.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
