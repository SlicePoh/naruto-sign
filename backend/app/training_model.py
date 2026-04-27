import pandas as pd  # type: ignore
import numpy as np  # type: ignore
import joblib  # type: ignore
from sklearn.model_selection import train_test_split  # type: ignore
from sklearn.ensemble import RandomForestClassifier  # type: ignore
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix  # type: ignore

np.random.seed(42)
DATA_PATH = "dataset.csv"

# Valid labels — rows with other labels are dropped
VALID_LABELS = {
    "neutral", "ram", "tiger", "horse", "serpent", "dog",
    "hare", "rat", "shadow", "bird", "boar", "ox",
    "dragon", "monkey",
}

df = pd.read_csv(DATA_PATH, header=None)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# Remove corrupted / invalid labels
df = df[df.iloc[:, -1].isin(VALID_LABELS)].reset_index(drop=True)

X = df.iloc[:, :-1].values
y = df.iloc[:, -1].values

print("Dataset shape:", df.shape)
print("Class distribution:\n", df.iloc[:, -1].value_counts())

X_train, X_test, y_train, y_test = train_test_split( X, y, test_size=0.2, random_state=42, stratify=y,)
model = RandomForestClassifier( n_estimators=600, max_depth=None, min_samples_leaf=2, max_features="sqrt",
    class_weight="balanced_subsample", random_state=42, n_jobs=-1 )
model.fit(X_train, y_train)
importances = model.feature_importances_

print("Top 10 important feature indices:", np.argsort(importances)[-10:])

y_pred = model.predict(X_test)

print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# Confusion matrix
labels = list(model.classes_)
cm = confusion_matrix(y_test, y_pred, labels=labels)
cm_df = pd.DataFrame(cm, index=labels, columns=labels)
print("\nConfusion Matrix:\n", cm_df)

# Save classification report to CSV 
report_dict = classification_report(y_test, y_pred, output_dict=True)
report_df = pd.DataFrame(report_dict).transpose()
report_df.to_csv("last_report.csv")
print("Classification report saved to last_report.csv")

joblib.dump(model, "hand_sign_model.pkl")

print("Model saved as hand_sign_model.pkl")
