import pandas as pd
import ast
import json

chars = pd.read_csv("../cleaned_data/character_personalities_final.csv")

# Parse string lists to actual lists
def parse_traits(x):
    if pd.isna(x) or x == "[]" or x == "":
        return []
    try:
        return ast.literal_eval(x)
    except:
        return []

chars["traits_list"] = chars["personality_traits"].apply(parse_traits)

# Only male/female with at least one trait
chars_valid = chars[
    chars["gender"].isin(["Male", "Female"]) &
    (chars["traits_list"].apply(len) > 0)
].copy()

print(f"Valid chars: {len(chars_valid)}")
print(f"Male: {(chars_valid['gender'] == 'Male').sum()}")
print(f"Female: {(chars_valid['gender'] == 'Female').sum()}")

# Count trait frequency by gender
from collections import Counter

male_traits = Counter()
female_traits = Counter()
male_total = 0
female_total = 0

for _, row in chars_valid.iterrows():
    if row["gender"] == "Male":
        male_traits.update(row["traits_list"])
        male_total += 1
    else:
        female_traits.update(row["traits_list"])
        female_total += 1

# Get all traits that appear in both genders
all_traits = set(male_traits.keys()) | set(female_traits.keys())

# Build trait stats
trait_rows = []
for trait in all_traits:
    m_count = male_traits[trait]
    f_count = female_traits[trait]
    m_pct = m_count / male_total
    f_pct = f_count / female_total
    total = m_count + f_count
    female_share = f_count / total if total > 0 else 0
    trait_rows.append({
        "trait": trait,
        "male_pct": round(m_pct, 4),
        "female_pct": round(f_pct, 4),
        "male_count": m_count,
        "female_count": f_count,
        "total": total,
        "female_share": round(female_share, 4)
    })

trait_df = pd.DataFrame(trait_rows)

# Filter to traits with at least 20 total occurrences for reliability
trait_df = trait_df[trait_df["total"] >= 20].sort_values("female_share")

print(trait_df.head(10))  # most male-skewed
print(trait_df.tail(10))  # most female-skewed

# Export to JSON for JS
trait_df.to_json("../cleaned_data/trait_stats.json", orient="records")
print("Saved trait_stats.json")