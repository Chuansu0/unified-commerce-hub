const https = require('https');

const PB_URL = 'https://www.neovega.cc/pb';

function request(method, path, data, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(PB_URL + path);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = token;

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                catch (e) { resolve({ status: res.statusCode, data: body }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    // Step 1: Auth
    console.log('1. Authenticating...');
    const auth = await request('POST', '/api/admins/auth-with-password', {
        identity: 'alex0715@ms87.url.com.tw',
        password: '527@Chuansu0'
    });
    if (auth.status !== 200) {
        console.log('Auth failed:', JSON.stringify(auth.data));
        return;
    }
    const token = auth.data.token;
    console.log('Auth OK, token:', token.substring(0, 20) + '...');

    // Step 2: Create agent_workflows collection
    console.log('\n2. Creating agent_workflows collection...');
    const collection = await request('POST', '/api/collections', {
        name: 'agent_workflows',
        type: 'base',
        schema: [
            { name: 'messageId', type: 'text', required: true },
            { name: 'conversationId', type: 'text', required: true },
            { name: 'agents', type: 'json', required: true },
            { name: 'currentAgent', type: 'text', required: false },
            { name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['pending', 'processing', 'completed', 'failed'] } },
            { name: 'results', type: 'json', required: false }
        ],
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: ''
    }, token);
    console.log('Collection result:', collection.status, JSON.stringify(collection.data).substring(0, 200));

    // Step 3: Verify
    console.log('\n3. Verifying...');
    const verify = await request('GET', '/api/collections/agent_workflows/records?perPage=1', null, token);
    console.log('Verify:', verify.status, JSON.stringify(verify.data).substring(0, 100));
}

main().catch(console.error);
