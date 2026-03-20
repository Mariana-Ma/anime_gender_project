# Not Everyone Gets to Be the Hero
### A Data Story About Female Representation in Anime

**Live site:** https://mariana-ma.github.io/anime_gender_project/

---

## Overview

As a longtime anime fan, I noticed that the shows I found most compelling rarely include female main characters. This project attempts to quantify that observation using data from MyAnimeList's top 2,000 most popular anime.

The result is an interactive data visualization exploring how gender shapes which characters get to be heroes and how that has changed over time.

---

## Key Findings

- **Higher-rated anime have fewer female main characters.** In the 8.5+ score tier, female characters make up a significantly smaller share of main characters than in lower-rated anime.
- **Female characters are sidelined even when they appear.** In top-rated anime, the gap between female main and supporting characters is nearly twice as large as the equivalent gap for male characters.
- **Male characters are defined by competence. Female characters by appearance.** The most common traits for male characters cluster around ability and agency (strong, skilled, powerful). Female characters are most often described as beautiful, shy, or cheerful.
- **Female representation peaked around 2011–2014 and has been declining since.** Nearly 3 in 4 popular anime had female-majority casts at the peak. By 2023, that share had dropped to around 60%.

---

## Data

### Source
All data was collected from [MyAnimeList](https://myanimelist.net/) using the [Jikan API](https://jikan.moe/) (an unofficial MAL API).

### Dataset
- **Top 2,000 anime** by popularity (member count)
- **~12,780 characters** with scraped biographies
- **~8,267 characters** with successfully extracted gender
