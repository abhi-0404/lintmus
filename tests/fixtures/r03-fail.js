import flagsmith from '@flagsmith/flagsmith'

await flagsmith.init({ environmentID: 'KEY', identity: 'u1', enableEvents: true })
flagsmith.trackEvent('Checkout_Completed')
