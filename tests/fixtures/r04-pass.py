from flagsmith import Flagsmith

flagsmith = Flagsmith(environment_key="KEY", enable_events=True, max_buffer_items=1)
flagsmith.track_event("checkout_completed", identifier="u1")
