# Shared contracts and domain data

`@du/shared` contains code and data used by the frontend and backend: validation,
password rules, API protocols, catalogue and travel models, and route metadata.
Both applications declare this package as a workspace dependency and bundle its
TypeScript sources during their own builds.

Keep browser components, Node services, database access, and server-only copy in
the owning application. This package has no React or Express dependency.
