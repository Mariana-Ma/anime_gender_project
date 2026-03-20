// quadrant.js

Promise.all([
    d3.csv("../cleaned_data/anime.csv", d3.autoType),
    d3.csv("../data/anime_characters.csv", d3.autoType),
    d3.csv("../cleaned_data/character_personalities_final.csv", d3.autoType)
]).then(([anime, anime_chars, chars]) => {
    const genderByChar = {};
    chars.forEach(c => {
        genderByChar[c.character_id] = c.gender;
    });
    anime_chars.forEach(d => {
        d.gender = genderByChar[d.character_id] ?? null;
    });

    buildQuadrant(anime, anime_chars);
}).catch(err => {
    console.error("Data loading error:", err);
});

function buildQuadrant(anime, anime_chars) {
    // Compute % female main chars per anime
    const mainCharsByAnime = {};
    anime_chars.forEach(d => {
        if (d.role !== "Main") return;
        if (d.gender !== "Male" && d.gender !== "Female") return;
        if (!mainCharsByAnime[d.anime_id]) mainCharsByAnime[d.anime_id] = { Male: 0, Female: 0 };
        mainCharsByAnime[d.anime_id][d.gender]++;
    });

    const femalePctByAnime = {};
    Object.entries(mainCharsByAnime).forEach(([anime_id, counts]) => {
        const total = counts.Male + counts.Female;
        femalePctByAnime[anime_id] = total > 0 ? counts.Female / total : null;
    });

    // Build dataset
    const data = anime
        .filter(d => d.score && d.members && femalePctByAnime[d.anime_id] !== null)
        .sort((a, b) => b.members - a.members)  // descending by members
        .slice(0, 300)
        .map(d => ({
            anime_id: d.anime_id,
            title: d.title_english || d.title,
            score: d.score,
            members: d.members,
            genre: d.primary_genre || "Other",
            pct_female: femalePctByAnime[d.anime_id],
            female_majority: femalePctByAnime[d.anime_id] >= 0.5
        }));

    // Quadrant boundaries — median of dataset
    const medianScore   = d3.median(data, d => d.score);
    const medianMembers = d3.median(data, d => d.members);

    // Assign quadrant
    data.forEach(d => {
        const highScore = d.score >= medianScore;
        const highPop   = d.members >= medianMembers;
        if (highScore && highPop)   d.quadrant = "High Score\nHigh Popularity";
        else if (highScore)         d.quadrant = "High Score\nLow Popularity";
        else if (highPop)           d.quadrant = "Low Score\nHigh Popularity";
        else                        d.quadrant = "Low Score\nLow Popularity";
    });

    const quadrantOrder = [
        "High Score\nHigh Popularity",
        "High Score\nLow Popularity",
        "Low Score\nHigh Popularity",
        "Low Score\nLow Popularity"
    ];

    const quadrantLabels = {
        "High Score\nHigh Popularity": "High Score + High Popularity",
        "High Score\nLow Popularity":  "High Score + Low Popularity",
        "Low Score\nHigh Popularity":  "Low Score + High Popularity",
        "Low Score\nLow Popularity":   "Low Score + Low Popularity"
    };

    const quadrantColors = {
        "High Score\nHigh Popularity": "#4a4a7a",
        "High Score\nLow Popularity":  "#7a7aaa",
        "Low Score\nHigh Popularity":  "#aaaacc",
        "Low Score\nLow Popularity":   "#ccccdd"
    };

    // Compute stats per quadrant
    const quadrantStats = quadrantOrder.map(q => {
        const animes = data.filter(d => d.quadrant === q);
        const avgFemalePct = d3.mean(animes, d => d.pct_female);
        const femaleMajorityPct = animes.filter(d => d.female_majority).length / animes.length;

        // Genre breakdown
        const genreCounts = {};
        animes.forEach(d => {
            genreCounts[d.genre] = (genreCounts[d.genre] || 0) + 1;
        });
        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        return {
            quadrant: q,
            label: quadrantLabels[q],
            count: animes.length,
            avgFemalePct,
            femaleMajorityPct,
            topGenres
        };
    });

    // Build container
    const container = document.getElementById("quadrant-plot");
    container.innerHTML = "";

    const titleEl = document.createElement("h3");
    titleEl.textContent = "Female Representation Across Anime Quadrants";
    titleEl.style.fontFamily = "system-ui, sans-serif";
    titleEl.style.marginBottom = "4px";
    container.appendChild(titleEl);

    const subtitleEl = document.createElement("p");
    subtitleEl.textContent = `Anime split by median score (${medianScore.toFixed(1)}) and median popularity (${Math.round(medianMembers).toLocaleString()} members). Does the most popular and highest-rated quadrant have the least female representation?`;
    subtitleEl.style.fontFamily = "system-ui, sans-serif";
    subtitleEl.style.fontSize = "13px";
    subtitleEl.style.color = "#666";
    subtitleEl.style.marginBottom = "16px";
    container.appendChild(subtitleEl);

    // Charts wrapper
    const chartsWrapper = document.createElement("div");
    chartsWrapper.style.display = "flex";
    chartsWrapper.style.gap = "40px";
    chartsWrapper.style.alignItems = "flex-start";
    container.appendChild(chartsWrapper);

    // --- LEFT: Bar chart (avg female % + female majority %) ---
    const barDiv = document.createElement("div");
    chartsWrapper.appendChild(barDiv);

    const barLabel = document.createElement("p");
    barLabel.textContent = "Female Representation by Quadrant";
    barLabel.style.fontFamily = "system-ui, sans-serif";
    barLabel.style.fontSize = "13px";
    barLabel.style.fontWeight = "600";
    barLabel.style.marginBottom = "6px";
    barDiv.appendChild(barLabel);

    // Tidy data for both metrics
    const barData = quadrantStats.flatMap(q => [
        { label: q.label, metric: "Avg % Female MCs",        value: q.avgFemalePct,        count: q.count },
        { label: q.label, metric: "% Anime w/ Female Majority", value: q.femaleMajorityPct, count: q.count }
    ]);

    const barPlot = Plot.plot({
        width: 560,
        height: 380,
        marginLeft: 200,
        marginBottom: 60,
        marginTop: 20,
        x: {
            label: "→",
            domain: [0, 1],
            tickFormat: d => `${Math.round(d * 100)}%`,
            grid: true
        },
        y: {
            label: null,
            domain: quadrantOrder.map(q => quadrantLabels[q])
        },
        color: {
            domain: ["Avg % Female MCs", "% Anime w/ Female Majority"],
            range: [GENDER_COLORS.Female, "#c8a8d8"],
            legend: true
        },
        style: {
            fontSize: "12px",
            fontFamily: "system-ui, sans-serif",
            background: "transparent"
        },
        marks: [
            Plot.barX(barData, {
                y: "label",
                x: "value",
                fill: "metric",
                fx: "metric",
                title: d => {
                    const pct = Math.round(d.value * 100);
                    return `${d.label}\n${d.metric}: ${pct}%\n(${d.count} anime)`;
                }
            }),
            Plot.ruleX([0.5], {
                stroke: "#aaa",
                strokeWidth: 1,
                strokeDasharray: "4,4"
            })
        ]
    });

    barDiv.appendChild(barPlot);

    // --- RIGHT: Genre breakdown per quadrant ---
    const genreDiv = document.createElement("div");
    chartsWrapper.appendChild(genreDiv);

    const genreLabel = document.createElement("p");
    genreLabel.textContent = "Top Genres by Quadrant";
    genreLabel.style.fontFamily = "system-ui, sans-serif";
    genreLabel.style.fontSize = "13px";
    genreLabel.style.fontWeight = "600";
    genreLabel.style.marginBottom = "6px";
    genreDiv.appendChild(genreLabel);

    // Build genre tidy data
    const genreData = [];
    quadrantStats.forEach(q => {
        q.topGenres.forEach(([genre, count]) => {
            genreData.push({
                quadrant: q.label,
                genre,
                pct: count / q.count
            });
        });
    });

    const genrePlot = Plot.plot({
        width: 500,
        height: 380,
        marginLeft: 200,
        marginBottom: 60,
        marginTop: 20,
        x: {
            label: "% of anime in quadrant →",
            domain: [0, d3.max(genreData, d => d.pct) * 1.2],
            tickFormat: d => `${Math.round(d * 100)}%`,
            grid: true
        },
        y: {
            label: null
        },
        color: {
            domain: Object.keys(GENRE_COLORS),
            range: Object.values(GENRE_COLORS),
            legend: true
        },
        style: {
            fontSize: "12px",
            fontFamily: "system-ui, sans-serif",
            background: "transparent"
        },
        marks: [
            Plot.barX(genreData, {
                y: "genre",
                x: "pct",
                fill: "genre",
                fy: "quadrant",
                title: d => `${d.quadrant}\n${d.genre}: ${Math.round(d.pct * 100)}% of anime`
            })
        ]
    });

    genreDiv.appendChild(genrePlot);

    // Note
    const noteEl = document.createElement("p");
    noteEl.style.fontFamily = "system-ui, sans-serif";
    noteEl.style.fontSize = "12px";
    noteEl.style.color = "#999";
    noteEl.style.marginTop = "12px";
    noteEl.textContent = `Based on ${data.length} anime. Female majority = 50%+ female main characters. Quadrant boundaries: score ${medianScore.toFixed(1)}, members ${Math.round(medianMembers).toLocaleString()}.`;
    container.appendChild(noteEl);
}