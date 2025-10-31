export function getLoadProfile() {
    const profile = __ENV.TEST_PROFILE || 'ultralight';
    const prefix = profile.toUpperCase();
    
    const profiles = {
        ULTRALIGHT: {
            baseVUs: 10,
            maxVUs: 50,
            rampUpStep: 10,
            rampUpDuration: '1m',
            testDuration: '5m',
            thinkTimeMin: 3,
            thinkTimeMax: 6,
            stages: [
                { duration: '30s', target: 10 },
                { duration: '1m', target: 20 },
                { duration: '1m', target: 30 },
                { duration: '1m', target: 40 },
                { duration: '2m', target: 40 },
                { duration: '30s', target: 0 },
            ]
        },
        LIGHT: {
            baseVUs: 50,
            maxVUs: 300,
            rampUpStep: 50,
            rampUpDuration: '2m',
            testDuration: '15m',
            thinkTimeMin: 2,
            thinkTimeMax: 5,
            stages: [
                { duration: '1m', target: 50 },
                { duration: '2m', target: 100 },
                { duration: '2m', target: 150 },
                { duration: '2m', target: 200 },
                { duration: '2m', target: 250 },
                { duration: '3m', target: 300 },
                { duration: '3m', target: 300 },
                { duration: '1m', target: 0 },
            ]
        },
        MEDIUM: {
            baseVUs: 100,
            maxVUs: 600,
            rampUpStep: 100,
            rampUpDuration: '3m',
            testDuration: '25m',
            thinkTimeMin: 1,
            thinkTimeMax: 4,
            stages: [
                { duration: '2m', target: 100 },
                { duration: '3m', target: 200 },
                { duration: '3m', target: 300 },
                { duration: '3m', target: 400 },
                { duration: '3m', target: 500 },
                { duration: '3m', target: 600 },
                { duration: '5m', target: 600 },
                { duration: '3m', target: 0 },
            ]
        },
        HEAVY: {
            baseVUs: 200,
            maxVUs: 1000,
            rampUpStep: 200,
            rampUpDuration: '3m',
            testDuration: '35m',
            thinkTimeMin: 1,
            thinkTimeMax: 3,
            stages: [
                { duration: '2m', target: 200 },
                { duration: '3m', target: 400 },
                { duration: '3m', target: 600 },
                { duration: '3m', target: 800 },
                { duration: '3m', target: 1000 },
                { duration: '10m', target: 1000 },
                { duration: '5m', target: 800 },
                { duration: '3m', target: 600 },
                { duration: '2m', target: 400 },
                { duration: '1m', target: 200 },
                { duration: '1m', target: 0 },
            ]
        }
    };
    
    return {
        ...profiles[prefix] || profiles.ULTRALIGHT,
        profile: profile
    };
}

export function getCheckoutLoadProfile() {
    const mainProfile = getLoadProfile();
    const checkoutRatio = parseFloat(__ENV.CHECKOUT_LOAD_RATIO) || 0.5;
    
    const checkoutStages = mainProfile.stages.map(stage => ({
        ...stage,
        target: Math.max(1, Math.floor(stage.target * checkoutRatio))
    }));
    
    return {
        ...mainProfile,
        baseVUs: Math.max(1, Math.floor(mainProfile.baseVUs * checkoutRatio)),
        maxVUs: Math.max(1, Math.floor(mainProfile.maxVUs * checkoutRatio)),
        rampUpStep: Math.max(1, Math.floor(mainProfile.rampUpStep * checkoutRatio)),
        stages: checkoutStages
    };
}

export function parseDuration(duration) {
    const match = duration.match(/(\d+)([smh])/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 's': return value / 60;
        case 'm': return value;
        case 'h': return value * 60;
        default: return value;
    }
}