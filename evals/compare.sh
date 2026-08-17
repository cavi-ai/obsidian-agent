#!/usr/bin/env bash
# Baseline (pristine pre-rewrite skills) vs post (current), same queries, one run each.
set -euo pipefail
cd "$(dirname "$0")/.."

PRISTINE="${1:?usage: compare.sh <pristine-skills-dir>}"
mkdir -p evals/results

python3 - <<'PY'
import json
COLL={"manifest","connection-finder","wikilink-weaver","vault-synthesis",
      "source-digest","research-workbench","daily-rollup","task-harvester"}
q=[x for x in json.load(open("evals/routing/queries.json")) if x["expected_skill"] in COLL]
json.dump(q, open("evals/results/collision-queries.json","w"), indent=1)
print(f"collision queries: {len(q)}")
PY

for phase in baseline post; do
  [ "$phase" = baseline ] && SK="$PRISTINE" || SK="skills"
  echo "== $phase ($SK)"
  python3 evals/routing/run_routing_eval.py \
    --queries evals/results/collision-queries.json \
    --skills "$SK" --vault evals/fixtures/vault \
    --runs-per-query 1 --num-workers 12 --timeout 120 \
    --out "evals/results/${phase}-collision.json"
done

python3 - <<'PY'
import json
b=json.load(open("evals/results/baseline-collision.json"))
p=json.load(open("evals/results/post-collision.json"))
print(f"\noverall {b['overall_accuracy']:.1%} -> {p['overall_accuracy']:.1%}\n")
rows=[]
for k in sorted(set(b["per_skill"]) | set(p["per_skill"])):
    before=b["per_skill"].get(k,{}).get("recall",0.0)
    after=p["per_skill"].get(k,{}).get("recall",0.0)
    rows.append((k,before,after))
    print(f"{k:22} {before:5.0%} -> {after:5.0%}  {'REGRESSED' if after<before else ''}")
reg=[r for r in rows if r[2]<r[1]]
print(f"\nregressions: {[r[0] for r in reg] or 'none'}")
print("stole queries in post:", {k:v['stolen_by'] for k,v in p['per_skill'].items() if v['stolen_by']})
PY
