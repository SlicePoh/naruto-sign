import pandas as pd #type: ignore
import numpy as np
import joblib #type: ignore

from sklearn.model_selection import train_test_split #type: ignore
from sklearn.ensemble import RandomForestClassifier #type: ignore
from sklearn.metrics import classification_report, accuracy_score #type: ignore 

np.random.seed(42)
DATA_PATH = "dataset.csv"

df = pd.read_csv(DATA_PATH, header=None)

X = df.iloc[:, :-1].values
y = df.iloc[:, -1].values

print("Dataset shape:", df.shape)
print("Class distribution:\n", df.iloc[:, -1].value_counts())

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)
model = RandomForestClassifier(
    n_estimators=400,
    max_depth=None,
    class_weight="balanced",
    random_state=42
)
model.fit(X_train, y_train)
importances = model.feature_importances_

print("Top 10 important feature indices:", np.argsort(importances)[-10:])

y_pred = model.predict(X_test)

print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

joblib.dump(model, "hand_sign_model.pkl")

print("Model saved as hand_sign_model.pkl")
