from flagsmith import Flagsmith

flagsmith = Flagsmith(environment_key="KEY")
flagsmith.track_event("checkout_completed", identifier="u1")
