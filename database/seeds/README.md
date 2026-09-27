# Seeds

Development seed data.

`apps/web/actions/seed.js` seeds the signed-in user's own account and refuses
to run in production. Anything added here must carry the same guard: a seed
script that can reach production is a data-loss incident waiting for a typo.
