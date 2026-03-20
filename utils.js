const ALLOWED_GENRES = new Set([
    "Romance",
    "Mystery",
    "Horror",
    "Adventure",
    "Action",
    "Sci-Fi",
    "Fantasy",
    "Other"
  ]);

  const GENRE_COLORS = {
    Action: "#b5c9f5",
    Adventure: "#c5d88c",
    "Sci-Fi": "#ffe2a4",
    Horror: "#ffaf6e",
    Mystery: "#f590a1",
    Fantasy: "#beabd1",
    Romance: "#e5b2ed",
    Other: "#c2bebc"
};
  
  const GENDER_COLORS = {
    Male: "#4a90e2",
    Female: "#e75480"
  };
  
  /*
    const GENDER_COLORS = {
    Male: "#87c3ba",
    Female: "#e5b2ed"
  };
  */

  // Global filtered datasets — loaded once, used everywhere
let TOP2000_ANIME = null;
let TOP2000_ANIME_CHARS = null;
let CHARACTERS = null;

const dataReady = Promise.all([
    d3.csv("cleaned_data/anime.csv", d3.autoType),
    d3.csv("data/anime_characters.csv", d3.autoType),
    d3.csv("cleaned_data/character_personalities_final.csv", d3.autoType)
]).then(([anime, anime_chars, chars]) => {
    const top2000AnimeIds = new Set(
        anime
            .filter(d => d.members)
            .sort((a, b) => a.popularity - b.popularity)
            .slice(0, 2000)
            .map(d => d.anime_id)
    );

    TOP2000_ANIME = anime.filter(d => top2000AnimeIds.has(d.anime_id));
    TOP2000_ANIME_CHARS = anime_chars.filter(d => top2000AnimeIds.has(d.anime_id));
    const genderByChar = {};
    chars.forEach(c => { genderByChar[c.character_id] = c.gender; });
    TOP2000_ANIME_CHARS.forEach(d => {
        d.gender = genderByChar[d.character_id] ?? null;
    });
    CHARACTERS = chars;
    
});