from flagsmith import Flagsmith

flagsmith = Flagsmith(environment_key="KEY", enable_events=True)
flagsmith.track_event("checkout_completed", identifier="u1")
