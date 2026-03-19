const https = require('https');

const UMIO_TOKEN = '8751641141:AAGeQKXV4WvOguP4H5UpUWegVcq2obdzIVw';
const CHAT_ID = '-1002403417498';
const PB_URL = 'https://www.neovega.cc/pb';

function req(url, method, data, headers) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const opts = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method,
            headers: { 'Content-Type': 'application/json', ...headers }
        };
        const r = https.request(opts, (res) => {
            let body = '';
            res.on('data', (c) => body += c);
            res.on('end', () => {
                try { resolve({ s: res.statusCode, d: JSON.parse(body) }); }
                catch (e) { resolve({ s: res.statusCode, d: body }); }
            });
        });
        r.on('error', reject);
        if (data) r.write(JSON.stringify(data));
        r.end();
    });
}

async function main() {
    console.log('=== Bot Collaboration E2E Test ===\n');

    // 1. Skip Telegram (local network can't reach api.telegram.org, n8n handles it server-side)
    console.log('1. Telegram send: SKIP (n8n handles server-side)\n');

    // 2. Auth PocketBase
    console.log('\n2. PocketBase auth...');
    const auth = await req(PB_URL + '/api/admins/auth-with-password', 'POST', {
        identity: 'alex0715@ms87.url.com.tw',
        password: '527@Chuansu0'
    });
    const token = auth.d.token;
    console.log('   Auth:', auth.s === 200 ? 'OK' : 'FAIL');

    // 3. Get unsent messages
    console.log('\n3. Checking unsent messages...');
    const msgs = await req(
        PB_URL + '/api/collections/messages/records?filter=sent_to_telegram%3Dfalse&sort=-created&perPage=5',
        'GET', null, { Authorization: token }
    );
    console.log('   Unsent messages:', msgs.d.totalItems);
    if (msgs.d.items) {
        msgs.d.items.forEach(m => {
            console.log(`   - [${m.sender}] ${m.content.substring(0, 50)}...`);
        });
    }

    // 4. Mark first unsent message as sent (simulate n8n workflow)
    console.log('\n4. Simulating n8n Telegram send (mark as sent)...');
    if (msgs.d.items && msgs.d.items.length > 0) {
        const m = msgs.d.items[0];
        const update = await req(
            PB_URL + '/api/collections/messages/records/' + m.id,
            'PATCH',
            { sent_to_telegram: true, sent_at: new Date().toISOString() },
            { Authorization: token }
        );
        console.log('   Marked as sent:', update.s === 200 ? 'OK' : 'FAIL', m.content.substring(0, 40));
    }

    // 5. Create test agent_workflow
    console.log('\n5. Creating test agent_workflow...');
    const wf = await req(PB_URL + '/api/collections/agent_workflows/records', 'POST', {
        messageId: msgs.d.items ? msgs.d.items[0].id : 'test',
        conversationId: msgs.d.items ? msgs.d.items[0].conversation : 'test',
        agents: ['umio', 'andrea'],
        currentAgent: 'umio',
        status: 'completed',
        results: { umio: { reply: 'test reply', confidence: 0.9 } }
    }, { Authorization: token });
    console.log('   Workflow created:', wf.s, JSON.stringify(wf.d).substring(0, 100));

    // 6. Verify
    console.log('\n6. Verifying agent_workflows...');
    const verify = await req(
        PB_URL + '/api/collections/agent_workflows/records?perPage=5',
        'GET', null, { Authorization: token }
    );
    console.log('   Total workflows:', verify.d.totalItems);

    console.log('\n=== Test Complete ===');
}

main().catch(console.error);
