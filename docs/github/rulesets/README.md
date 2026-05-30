# GitHub Rulesets

Branch and tag protection rules for `paturikaustubh/parlo`.

## Apply

```bash
chmod +x apply.sh
./apply.sh
```

Requires `gh` CLI authenticated with repo admin access.

## Update existing ruleset

```bash
gh api --method PUT /repos/paturikaustubh/parlo/rulesets/{ruleset_id} --input main.json
```

## Notes

- `bypass_actors` with `actor_id: 4` = Admin role — owner can self-merge PRs when solo
- When team grows: set `required_approving_review_count: 2` and remove `bypass_actors` from main/release
- Tags (`v*`): only GitHub Actions (semantic-release) can create — `actor_id: 2` = GitHub Actions integration
