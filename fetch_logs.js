const https = require('https');
const fs = require('fs');

https.get('https://api.github.com/repos/spoorthyconceptschool/spoorthy-school-system/actions/runs?per_page=1', { headers: { 'User-Agent': 'node.js' } }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        const runs = JSON.parse(data);
        const runId = runs.workflow_runs[0].id;
        console.log('Run ID:', runId);

        https.get(`https://api.github.com/repos/spoorthyconceptschool/spoorthy-school-system/actions/runs/${runId}/jobs`, { headers: { 'User-Agent': 'node.js' } }, (res2) => {
            let data2 = '';
            res2.on('data', c => data2 += c);
            res2.on('end', () => {
                const jobs = JSON.parse(data2);
                const jobId = jobs.jobs[0].id;
                console.log('Job ID:', jobId);

                https.get(`https://api.github.com/repos/spoorthyconceptschool/spoorthy-school-system/actions/jobs/${jobId}/logs`, { headers: { 'User-Agent': 'node.js' } }, (res3) => {
                    if (res3.statusCode === 302 || res3.statusCode === 301) {
                        const redirectUrl = res3.headers.location;
                        https.get(redirectUrl, { headers: { 'User-Agent': 'node.js' } }, (res4) => {
                            let logs = '';
                            res4.on('data', c => logs += c);
                            res4.on('end', () => {
                                fs.writeFileSync('action_logs.txt', logs);
                                console.log('Logs saved to action_logs.txt');
                            });
                        });
                    } else {
                        console.log(`Failed to fetch logs: ${res3.statusCode}`);
                    }
                });
            });
        });
    });
});
