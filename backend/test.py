import pandas as pd

df = pd.read_csv("dataset.csv", header=None)
print(df.shape)
print(df.iloc[:, -1].value_counts())