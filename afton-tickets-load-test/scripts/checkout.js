import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { getCheckoutLoadProfile, parseDuration } from '../config/load-profiles.js';

// Custom metrics
const responseTimeTrend = new Trend('response_time');
const errorRate = new Rate('errors');
const successRate = new Rate('successes');
const requestsCounter = new Counter('total_requests');
const activeUsersGauge = new Gauge('active_users');

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'https://demov3.aftontickets.com';
const PROFILE = __ENV.TEST_PROFILE || 'ultralight';
const CHECKOUT_URL = `${BASE_URL}${__ENV.CHECKOUT_URL || '/purchase/checkout-cart?delivery_method%5B2646%5D=print_at_home'}`;
const loadProfile = getCheckoutLoadProfile();

export const options = {
    stages: loadProfile.stages,
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<2000'],
        response_time: ['p(95)<2000', 'p(99)<3000'],
        errors: ['rate<0.01'],
        successes: ['rate>0.99'],
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count'],
    tags: {
        test_type: 'load',
        profile: PROFILE,
        component: 'checkout',
        load_level: PROFILE.toUpperCase(),
        load_type: 'reduced'
    }
};

export default function () {
    activeUsersGauge.add(1);
    const startTime = Date.now();
    const transactionName = 'Checkout_Access';
    
    const params = {
        tags: { 
            name: transactionName,
            vu_id: __VU,
            iter_id: __ITER,
            load_profile: PROFILE,
            component: 'checkout'
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; K6-load-test)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
            'Referer': `${BASE_URL}/cart/view-master-cart`,
        },
        timeout: '30s'
    };

    try {
        const response = http.get(CHECKOUT_URL, params);
        requestsCounter.add(1);
        const responseTime = Date.now() - startTime;
        responseTimeTrend.add(responseTime);
        
        const checkResult = check(response, {
            'status is 200': (r) => r.status === 200,
            'response time < 5s': (r) => r.timings.duration < 5000,
            'has checkout content': (r) => r.body && r.body.length > 0,
            'has payment information': (r) => r.body.includes('checkout') || r.body.includes('payment') || r.body.includes('purchase'),
            'content type is html': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('text/html'),
        });
        
        if (checkResult) {
            successRate.add(1);
            if (PROFILE === 'ultralight' || __ITER % 30 === 0) {
                console.log(`✓ VU ${__VU} - ${PROFILE.toUpperCase()} - Checkout: ${response.status} in ${response.timings.duration}ms`);
            }
        } else {
            errorRate.add(1);
            console.log(`✗ VU ${__VU} - ${PROFILE.toUpperCase()} - Checkout: Failed - Status: ${response.status}, Time: ${response.timings.duration}ms`);
        }
        
    } catch (error) {
        errorRate.add(1);
        console.log(`✗ VU ${__VU} - ${PROFILE.toUpperCase()} - Checkout: Exception - ${error.message}`);
    } finally {
        activeUsersGauge.add(-1);
    }
    
    const extendedThinkTime = (Math.random() * (loadProfile.thinkTimeMax - loadProfile.thinkTimeMin) + loadProfile.thinkTimeMin) + 3;
    sleep(extendedThinkTime);
}

export function handleSummary(data) {
    const profile = PROFILE;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    console.log('\n' + '='.repeat(80));
    console.log(`💰 CHECKOUT LOAD TEST SUMMARY - ${profile.toUpperCase()} PROFILE`);
    console.log('='.repeat(80));
    
    if (data.metrics) {
        const metrics = data.metrics;
        
        console.log(`\n📊 LOAD PROFILE: ${profile.toUpperCase()} (REDUCED)`);
        console.log(`   Max VUs: ${loadProfile.maxVUs} (50% of ${profile} profile)`);
        
        console.log(`\n📈 REQUESTS:`);
        console.log(`   Total: ${metrics.http_reqs?.values?.count || 0}`);
        console.log(`   Rate: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)} reqs/s`);
        
        console.log(`\n⏱️  RESPONSE TIMES (ms):`);
        if (metrics.http_req_duration) {
            const dur = metrics.http_req_duration.values;
            console.log(`   Average: ${dur.avg?.toFixed(2) || 'N/A'}`);
            console.log(`   p(95): ${dur['p(95)']?.toFixed(2) || 'N/A'}`);
        }
        
        console.log(`\n❌ ERRORS:`);
        console.log(`   Error Rate: ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`);
        
        console.log(`\n👥 VIRTUAL USERS:`);
        console.log(`   Max VUs: ${metrics.vus_max?.values?.max || 0}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✨ ${profile.toUpperCase()} Checkout Test completed at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(80));
    
    return {
        [`results/${profile}-checkout-${timestamp}.html`]: htmlReport(data),
        [`results/${profile}-checkout-${timestamp}.json`]: JSON.stringify(data),
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    };
}

export function setup() {
    console.log('\n' + '💰'.repeat(40));
    console.log('   AFTON TICKETS - CHECKOUT LOAD TEST');
    console.log('💰'.repeat(40));
    console.log(`   Profile: ${PROFILE.toUpperCase()} (REDUCED LOAD)`);
    console.log(`   URL: ${CHECKOUT_URL}`);
    console.log(`   Max VUs: ${loadProfile.maxVUs} (50% of ${PROFILE} profile)`);
    console.log(`   Duration: ${loadProfile.stages.reduce((total, stage) => total + parseDuration(stage.duration), 0)} minutes`);
    console.log(`   Think Time: ${loadProfile.thinkTimeMin + 3}-${loadProfile.thinkTimeMax + 3}s (extended for payment)`);
    console.log(`   Start Time: ${new Date().toLocaleString()}`);
    console.log('💰'.repeat(40) + '\n');
}