import flagsmith from '@flagsmith/flagsmith'

await flagsmith.init({ environmentID: 'KEY', identity: 'u1', enableEvents: true })
const style = flagsmith.getValue('checkout_button')
flagsmith.trackEvent('checkout_completed')
