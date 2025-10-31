import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { getLoadProfile, parseDuration } from '../config/load-profiles.js';

// Custom metrics
const responseTimeTrend = new Trend('response_time');
const searchTimeTrend = new Trend('search_response_time');
const errorRate = new Rate('errors');
const successRate = new Rate('successes');
const requestsCounter = new Counter('total_requests');
const activeUsersGauge = new Gauge('active_users');

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'https://demov3.aftontickets.com';
const PROFILE = __ENV.TEST_PROFILE || 'ultralight';
const SEARCH_URL = `${BASE_URL}/search`;
const loadProfile = getLoadProfile();

// Search terms
const searchTerms = ['concert', 'music', 'sports', 'theater', 'festival', 'comedy', 'dance', 'art', 'live', 'performance'];

export const options = {
    stages: loadProfile.stages,
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<2000'],
        response_time: ['p(95)<2000', 'p(99)<3000'],
        search_response_time: ['p(95)<2500'],
        errors: ['rate<0.01'],
        successes: ['rate>0.99'],
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count'],
    tags: {
        test_type: 'load',
        profile: PROFILE,
        component: 'search_flow',
        load_level: PROFILE.toUpperCase()
    }
};

export default function () {
    activeUsersGauge.add(1);
    const transactionName = 'Search_Flow';
    
    const params = {
        tags: { 
            name: transactionName,
            vu_id: __VU,
            iter_id: __ITER,
            load_profile: PROFILE,
            component: 'search_flow'
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; K6-load-test)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cache-Control': 'no-cache',
        },
        timeout: '30s'
    };

    try {
        // Step 1: Access search page
        const searchPageStart = Date.now();
        const searchPageResponse = http.get(SEARCH_URL, params);
        requestsCounter.add(1);
        
        const searchPageTime = Date.now() - searchPageStart;
        responseTimeTrend.add(searchPageTime);
        
        let searchPageSuccess = check(searchPageResponse, {
            'search page status is 200': (r) => r.status === 200,
            'search page loaded successfully': (r) => r.body && r.body.length > 0,
        });
        
        if (searchPageSuccess) {
            if (PROFILE === 'ultralight' || __ITER % 50 === 0) {
                console.log(`✓ VU ${__VU} - ${PROFILE.toUpperCase()} - Search Page: ${searchPageResponse.status} in ${searchPageResponse.timings.duration}ms`);
            }
            
            sleep(Math.random() * 2 + 1);
            
            // Step 2: Perform search
            const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
            const searchResultsUrl = `${SEARCH_URL}?q=${encodeURIComponent(randomTerm)}`;
            
            const searchStart = Date.now();
            const searchResponse = http.get(searchResultsUrl, {
                ...params,
                tags: { ...params.tags, name: 'Search_Results' }
            });
            requestsCounter.add(1);
            
            const searchTime = Date.now() - searchStart;
            searchTimeTrend.add(searchTime);
            
            const searchSuccess = check(searchResponse, {
                'search results status is 200': (r) => r.status === 200,
                'search returned results': (r) => r.body && r.body.length > 0,
                'search completed in time': (r) => r.timings.duration < 5000,
            });
            
            if (searchSuccess) {
                successRate.add(1);
                if (PROFILE === 'ultralight' || __ITER % 50 === 0) {
                    console.log(`✓ VU ${__VU} - ${PROFILE.toUpperCase()} - Search Results: "${randomTerm}" - ${searchResponse.status} in ${searchResponse.timings.duration}ms`);
                }
            } else {
                errorRate.add(1);
                console.log(`✗ VU ${__VU} - ${PROFILE.toUpperCase()} - Search Results: Failed for "${randomTerm}" - Status: ${searchResponse.status}`);
            }
            
        } else {
            errorRate.add(1);
            console.log(`✗ VU ${__VU} - ${PROFILE.toUpperCase()} - Search Page: Failed - Status: ${searchPageResponse.status}`);
        }
        
    } catch (error) {
        errorRate.add(1);
        console.log(`✗ VU ${__VU} - ${PROFILE.toUpperCase()} - Search Flow: Exception - ${error.message}`);
    } finally {
        activeUsersGauge.add(-1);
    }
    
    const thinkTime = Math.random() * (loadProfile.thinkTimeMax - loadProfile.thinkTimeMin) + loadProfile.thinkTimeMin;
    sleep(thinkTime);
}

export function handleSummary(data) {
    const profile = PROFILE;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    console.log('\n' + '='.repeat(80));
    console.log(`🔍 SEARCH FLOW LOAD TEST SUMMARY - ${profile.toUpperCase()} PROFILE`);
    console.log('='.repeat(80));
    
    if (data.metrics) {
        const metrics = data.metrics;
        
        console.log(`\n📊 LOAD PROFILE: ${profile.toUpperCase()}`);
        console.log(`   Max VUs: ${loadProfile.maxVUs}`);
        
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
    console.log(`✨ ${profile.toUpperCase()} Search Flow Test completed at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(80));
    
    return {
        [`results/${profile}-search-${timestamp}.html`]: htmlReport(data),
        [`results/${profile}-search-${timestamp}.json`]: JSON.stringify(data),
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    };
}

export function setup() {
    console.log('\n' + '🔍'.repeat(40));
    console.log('   AFTON TICKETS - SEARCH FLOW LOAD TEST');
    console.log('🔍'.repeat(40));
    console.log(`   Profile: ${PROFILE.toUpperCase()}`);
    console.log(`   Search URL: ${SEARCH_URL}`);
    console.log(`   Max VUs: ${loadProfile.maxVUs}`);
    console.log(`   Duration: ${loadProfile.stages.reduce((total, stage) => total + parseDuration(stage.duration), 0)} minutes`);
    console.log(`   Think Time: ${loadProfile.thinkTimeMin}-${loadProfile.thinkTimeMax}s`);
    console.log(`   Search Terms: ${searchTerms.join(', ')}`);
    console.log(`   Start Time: ${new Date().toLocaleString()}`);
    console.log('🔍'.repeat(40) + '\n');
}