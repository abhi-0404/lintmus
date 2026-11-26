import flagsmith from '@flagsmith/flagsmith'

await flagsmith.init({ environmentID: 'KEY', identity: 'u1', enableEvents: true })
flagsmith.trackEvent('checkout_completed')
// flagsmith.trackEvent('Checkout_Completed') is only a comment and must not be flagged
