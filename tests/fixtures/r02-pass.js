import flagsmith from '@flagsmith/flagsmith'

await flagsmith.init({ environmentID: 'KEY', identity: 'u1', enableEvents: true })
const flag = flagsmith.getExperimentFlag('checkout_button')
flagsmith.trackEvent('checkout_completed')
