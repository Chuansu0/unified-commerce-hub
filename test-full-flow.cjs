const https = require('https');
const PB = 'https://www.neovega.cc/pb';

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
            res.on('data', c => body += c);
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('========================================');
    console.log('  Bot Collaboration Full Flow Test');
    console.log('========================================\n');

    // Step 1: Auth
    console.log('[1/7] PocketBase Auth...');
    const auth = await req(PB + '/api/admins/auth-with-password', 'POST', {
        identity: 'alex0715@ms87.url.com.tw',
        password: '527@Chuansu0'
    });
    if (auth.s !== 200) { console.log('FAIL:', auth.d); return; }
    const token = auth.d.token;
    console.log('  OK\n');

    // Step 2: Get or create a conversation
    console.log('[2/7] Get conversation...');
    const convs = await req(PB + '/api/collections/conversations/records?perPage=1', 'GET', null, { Authorization: token });
    let convId;
    if (convs.d.items && convs.d.items.length > 0) {
        convId = convs.d.items[0].id;
        console.log('  Using existing:', convId, '\n');
    } else {
        const newConv = await req(PB + '/api/collections/conversations/records', 'POST', {
            guest_session_id: 'test-flow-' + Date.now(),
            status: 'active'
        }, { Authorization: token });
        convId = newConv.d.id;
        console.log('  Created new:', convId, '\n');
    }

    // Step 3: Create a test user message (simulating webchat input)
    console.log('[3/7] Create test user message...');
    const msg = await req(PB + '/api/collections/messages/records', 'POST', {
        conversation: convId,
        sender: 'user',
        channel: 'web',
        content: 'Help me analyze the sales report for this month',
        intent: '',
        metadata: { platform: 'webchat', test: true },
        sent_to_telegram: false
    }, { Authorization: token });
    if (msg.s !== 200) { console.log('  FAIL:', msg.s, JSON.stringify(msg.d).substring(0, 100)); return; }
    console.log('  Message created:', msg.d.id);
    console.log('  Content:', msg.d.content, '\n');

    // Step 4: Simulate Router workflow (analyze intent + create agent_workflow)
    console.log('[4/7] Simulate Router: Analyze intent...');
    const content = msg.d.content.toLowerCase();
    let agents = ['umio'];
    if (content.includes('bug') || content.includes('error')) {
        agents = ['umio', 'linus'];
    } else if (content.includes('analyze') || content.includes('report')) {
        agents = ['umio', 'andrea'];
    } else if (content.includes('help')) {
        agents = ['umio', 'andrea', 'linus'];
    }
    console.log('  Detected agents:', agents);

    const wf = await req(PB + '/api/collections/agent_workflows/records', 'POST', {
        messageId: msg.d.id,
        conversationId: convId,
        agents: agents,
        currentAgent: agents[0],
        status: 'processing'
    }, { Authorization: token });
    if (wf.s !== 200) { console.log('  FAIL:', wf.s, JSON.stringify(wf.d).substring(0, 100)); return; }
    console.log('  Workflow created:', wf.d.id, '\n');

    // Step 5: Simulate Orchestrator (each agent processes)
    console.log('[5/7] Simulate Orchestrator: Agent processing...');
    const results = {};
    for (const agent of agents) {
        console.log('  Processing agent:', agent);
        await sleep(500);

        // Simulate agent reply
        let reply;
        if (agent === 'umio') {
            reply = 'I can help with that. Let me route this to our analysis team.';
        } else if (agent === 'andrea') {
            reply = 'Sales report analysis: Revenue up 15% MoM. Top categories: Electronics, Fashion.';
        } else if (agent === 'linus') {
            reply = 'Technical note: Data pipeline is healthy. ETL jobs completed successfully.';
        }

        results[agent] = { reply, confidence: 0.85 + Math.random() * 0.1 };

        // Save agent reply as message
        const agentMsg = await req(PB + '/api/collections/messages/records', 'POST', {
            conversation: convId,
            sender: 'assistant',
            channel: 'web',
            content: reply,
            intent: '',
            metadata: { agent, source: 'bot-collaboration', test: true },
            sent_to_telegram: false
        }, { Authorization: token });
        console.log('    Reply saved:', agentMsg.d.id, '-', reply.substring(0, 50));

        // Update workflow current agent
        await req(PB + '/api/collections/agent_workflows/records/' + wf.d.id, 'PATCH', {
            currentAgent: agent,
            results: results
        }, { Authorization: token });
    }
    console.log('');

    // Step 6: Complete workflow
    console.log('[6/7] Complete workflow...');
    const complete = await req(PB + '/api/collections/agent_workflows/records/' + wf.d.id, 'PATCH', {
        status: 'completed',
        results: results
    }, { Authorization: token });
    console.log('  Status:', complete.s === 200 ? 'OK' : 'FAIL');
    console.log('  Workflow status:', complete.d.status, '\n');

    // Step 7: Verify - check all messages and workflow
    console.log('[7/7] Verification...');
    const allMsgs = await req(
        PB + '/api/collections/messages/records?filter=conversation%3D%27' + convId + '%27&sort=-created&perPage=20',
        'GET', null, { Authorization: token }
    );
    console.log('  Messages in conversation:', allMsgs.d.totalItems);
    if (allMsgs.d.items) {
        allMsgs.d.items.slice(0, 5).forEach(m => {
            const icon = m.sender === 'user' ? '  [USER]' : '  [BOT] ';
            console.log(icon, m.content.substring(0, 60), m.sent_to_telegram ? '(sent)' : '(unsent)');
        });
    }

    const allWf = await req(
        PB + '/api/collections/agent_workflows/records?sort=-created&perPage=5',
        'GET', null, { Authorization: token }
    );
    console.log('\n  Agent workflows:', allWf.d.totalItems);
    if (allWf.d.items) {
        allWf.d.items.slice(0, 3).forEach(w => {
            console.log('  -', w.id, 'status:', w.status, 'agents:', JSON.stringify(w.agents));
        });
    }

    // Count unsent messages
    const unsent = await req(
        PB + '/api/collections/messages/records?filter=sent_to_telegram%3Dfalse&perPage=1',
        'GET', null, { Authorization: token }
    );
    console.log('\n  Unsent messages (for Sender workflow):', unsent.d.totalItems);

    console.log('\n========================================');
    console.log('  Full Flow Test COMPLETE');
    console.log('========================================');
    console.log('\nNext: n8n Sender workflow will pick up unsent messages and send to Telegram.');
}

main().catch(console.error);
