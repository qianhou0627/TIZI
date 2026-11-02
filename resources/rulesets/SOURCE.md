# Bundled routing data

The unmodified application rules are from blackmatrix7/ios_rule_script (GPL-2.0),
and the unmodified base categories are from MetaCubeX/meta-rules-dat (GPL-3.0).
Each upstream retains its own copyright. Full licenses accompany these files.

`manifest.json` records the exact source URLs, SHA256 hashes and lengths of this
offline snapshot. Application YAML files are their machine-readable source.
MetaCubeX MRS files are unmodified compressed artifacts; the corresponding
`*.source.list` files are bundled alongside them. Upstream's conversion tooling
is in https://github.com/MetaCubeX/meta-rules-dat and Mihomo's `convert-ruleset`
command, whose exact runtime source is recorded separately under `mihomo/`.

Use `npm run rules:sync` to refresh the snapshot through the configured route,
then `npm run rules:check` and `npm run test:critical` before distribution.
Application startup copies missing seeds into its own data directory, then
checks for updates in the background. Existing cached rules are not replaced
by bundled seeds on restart.
