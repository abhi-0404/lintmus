import flagsmith from '@flagsmith/flagsmith'

await flagsmith.init({ environmentID: 'KEY', identity: 'u1' })
flagsmith.trackEvent('checkout_completed')
