"""
Export the trained RandomForest model (hand_sign_model.pkl) to a JSON file
that can be loaded and evaluated entirely in the browser (TypeScript).

Each decision tree is serialized as a flat array of nodes:
  { feature, threshold, left, right, value }

"value" is the class probability distribution at leaf nodes.
"""

import json
import numpy as np
import joblib  # type: ignore
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent / "hand_sign_model.pkl"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "frontend" / "public" / "hand_sign_model.json"


def tree_to_dict(tree, class_names: list[str]) -> list[dict]:
    """Convert a sklearn DecisionTree to a list of node dicts."""
    t = tree.tree_
    nodes = []
    for i in range(t.node_count):
        if t.children_left[i] == -1:  # leaf
            # Normalize value to probability distribution
            counts = t.value[i][0]
            total = counts.sum()
            probs = (counts / total).tolist() if total > 0 else counts.tolist()
            nodes.append({
                "f": -1,
                "t": 0,
                "l": -1,
                "r": -1,
                "v": probs,
            })
        else:
            nodes.append({
                "f": int(t.feature[i]),
                "t": round(float(t.threshold[i]), 8),
                "l": int(t.children_left[i]),
                "r": int(t.children_right[i]),
                "v": None,
            })
    return nodes


def main():
    model = joblib.load(str(MODEL_PATH))
    class_names = [str(c) for c in model.classes_]

    trees = []
    for estimator in model.estimators_:
        trees.append(tree_to_dict(estimator, class_names))

    payload = {
        "classes": class_names,
        "n_features": int(model.n_features_in_),
        "trees": trees,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(payload, f, separators=(",", ":"))

    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(f"✅ Exported {len(trees)} trees, {len(class_names)} classes")
    print(f"   Classes: {class_names}")
    print(f"   Features expected: {model.n_features_in_}")
    print(f"   Output: {OUTPUT_PATH}  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
