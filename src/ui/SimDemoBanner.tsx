/** Shown only on the lintmus-sim-demo deployment (VITE_LINTMUS_ENV=sim). */
export function SimDemoBanner() {
  if (import.meta.env.VITE_LINTMUS_ENV !== 'sim') return null
  return (
    <div className="sim-banner" role="note">
      SIMULATION DEMO. This deployment reads the simulated Flagsmith environment. Nothing here describes real
      developers.
    </div>
  )
}
