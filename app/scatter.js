// scatter.js

Promise.all([
    d3.csv("../cleaned_data/anime.csv", d3.autoType),
    d3.csv("../data/anime_characters.csv", d3.autoType),
    d3.csv("../cleaned_data/character_personalities_final.csv", d3.autoType)
]).then(([anime, anime_chars, chars]) => {
    const femalePctByAnime = computeFemalePct(anime_chars, chars);
    const data = anime
        .filter(d => d.score && d.members)
        .sort((a, b) => b.members - a.members)
        .slice(0, 500)
        .map(d => ({
            anime_id: d.anime_id,
            title: d.title_english,
            score: d.score,
            popularity: d.members,
            genre: d.primary_genre && GENRE_COLORS[d.primary_genre] ? d.primary_genre : "Other",
            pct_female_mcs: femalePctByAnime[d.anime_id] ?? 0,
            pct_male_mcs: 1 - (femalePctByAnime[d.anime_id] ?? 0),
            image_url: d.image_url,
            synopsis: d.synopsis
        }))
        .filter(d => ALLOWED_GENRES.has(d.genre));

    drawScatter(data);
});

function computeFemalePct(anime_chars, characters) {
    const genderByChar = {};
    characters.forEach(c => {
        genderByChar[c.character_id] = c.gender;
    });

    const mainCharsByAnime = {};
    anime_chars.forEach(c => {
        if (c.role !== "Main") return;
        if (!mainCharsByAnime[c.anime_id]) mainCharsByAnime[c.anime_id] = [];
        mainCharsByAnime[c.anime_id].push(c.character_id);
    });

    const pctByAnime = {};
    Object.entries(mainCharsByAnime).forEach(([anime_id, chars]) => {
        const total = chars.length;
        const femaleCount = chars.filter(id => genderByChar[id] === "Female").length;
        pctByAnime[anime_id] = total > 0 ? femaleCount / total : 0;
    });

    return pctByAnime;
}

let selectedDot = null;

function drawScatter(data) {
    const maxPopularity = d3.max(data, d => d.popularity);
    const minPopularity = d3.min(data, d => d.popularity);
    const maxScore = d3.max(data, d => d.score);
    const minScore = d3.min(data, d => d.score);

    const container = document.getElementById("scatter-plot");
    container.innerHTML = "";

    let colorByGenre = true;
    let femaleFilter = 0;
    let activeGenres = new Set(Object.keys(GENRE_COLORS));

    // ---- Controls wrapper ----
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        align-items: flex-start;
        margin-bottom: 16px;
        font-family: system-ui, sans-serif;
    `;
    container.appendChild(controlsDiv);

    // ---- Color toggle button ----
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Color by % Female";
    toggleBtn.style.cssText = `
        padding: 8px 10px;
        width: 150px;
        border: 1.5px solid #e75480;
        border-radius: 10px;
        cursor: pointer;
        background: #e75480;
        color: #fff;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        align-self: center;
    `;
    controlsDiv.appendChild(toggleBtn);
    

    // ---- Gradient slider ----
    const sliderWrapper = document.createElement("div");
    sliderWrapper.style.cssText = `display: flex; flex-direction: column; gap: 6px; min-width: 320px;`;

    const sliderLabel = document.createElement("div");
    sliderLabel.style.cssText = `
        font-size: 13px;
        font-weight: 600;
        color: #333;
        display: flex;
        justify-content: space-between;
    `;
    sliderLabel.innerHTML = `
        <span>Min % Female MCs</span>
        <span id="slider-value" style="color: #e75480;">Showing all</span>
    `;
    sliderWrapper.appendChild(sliderLabel);

    // Gradient bar + slider container
    const sliderTrackWrapper = document.createElement("div");
    sliderTrackWrapper.style.cssText = `position: relative; height: 28px;`;

    // Gradient bar
    const gradientBar = document.createElement("div");
    gradientBar.style.cssText = `
        position: absolute;
        top: 8px;
        left: 0;
        right: 0;
        height: 12px;
        border-radius: 6px;
        background: linear-gradient(to right, #87c3ba, #e5b2ed);
        cursor: pointer;
    `;
    sliderTrackWrapper.appendChild(gradientBar);

    // Tick marks
    [0, 25, 50, 75, 100].forEach(pct => {
        const tick = document.createElement("div");
        tick.style.cssText = `
            position: absolute;
            top: 22px;
            left: ${pct}%;
            transform: translateX(-50%);
            font-size: 10px;
            color: #999;
            font-family: system-ui, sans-serif;
        `;
        tick.textContent = `${pct}%`;
        sliderTrackWrapper.appendChild(tick);
    });

    // Actual range input (invisible, sits on top)
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = 100;
    slider.value = 0;
    slider.step = 1;
    slider.style.cssText = `
        position: absolute;
        top: 4px;
        left: 0;
        right: 0;
        width: 100%;
        height: 20px;
        opacity: 0;
        cursor: pointer;
        margin: 0;
        z-index: 2;
    `;
    sliderTrackWrapper.appendChild(slider);

    // Handle (visible dot on gradient)
    const handle = document.createElement("div");
    handle.style.cssText = `
        position: absolute;
        top: 5px;
        left: 0%;
        transform: translateX(-50%);
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        border: 2px solid #e75480;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        pointer-events: none;
        z-index: 3;
        transition: left 0.05s;
    `;
    sliderTrackWrapper.appendChild(handle);

    sliderWrapper.appendChild(sliderTrackWrapper);

    // Dimmed overlay on gradient bar to show "filtered out" region
    const dimOverlay = document.createElement("div");
    dimOverlay.style.cssText = `
        position: absolute;
        top: 8px;
        left: 0;
        width: 0%;
        height: 12px;
        border-radius: 6px 0 0 6px;
        background: rgba(255,255,255,0.6);
        pointer-events: none;
        z-index: 1;
    `;
    sliderTrackWrapper.appendChild(dimOverlay);

    slider.addEventListener("input", () => {
        const val = parseInt(slider.value);
        femaleFilter = val / 100;

        // Update handle position
        handle.style.left = `${val}%`;
        dimOverlay.style.width = `${val}%`;

        // Update label
        const labelEl = document.getElementById("slider-value");
        if (val === 0) {
            labelEl.textContent = "Showing all";
            labelEl.style.color = "#999";
        } else {
            labelEl.textContent = `≥${val}% female`;
            labelEl.style.color = "#e75480";
        }

        updatePlot();
    });

    controlsDiv.appendChild(sliderWrapper);

    // ---- Genre filter ----
    const genreFilterDiv = document.createElement("div");
    genreFilterDiv.style.cssText = `display: flex; flex-direction: column; gap: 6px;`;

    const genreFilterLabel = document.createElement("div");
    genreFilterLabel.style.cssText = `
        font-size: 13px;
        font-weight: 600;
        color: #333;
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    genreFilterLabel.innerHTML = `<span>Genres</span>`;

    // All / None buttons inline with label
    ["All", "None"].forEach(label => {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.style.cssText = `
            padding: 2px 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-family: system-ui, sans-serif;
            background: #fff;
            color: #555;
        `;
        btn.addEventListener("click", () => {
            if (label === "All") {
                activeGenres = new Set(Object.keys(GENRE_COLORS));
                genreCheckboxes.querySelectorAll("button").forEach(b => {
                    const color = GENRE_COLORS[b.dataset.genre];
                    b.style.background = color;
                    b.style.color = "#333";
                    b.style.borderColor = color;
                    b.style.opacity = "1";
                });
            } else {
                const first = Object.keys(GENRE_COLORS)[0];
                activeGenres = new Set([first]);
                genreCheckboxes.querySelectorAll("button").forEach(b => {
                    const isFirst = b.dataset.genre === first;
                    const color = GENRE_COLORS[b.dataset.genre];
                    b.style.background = isFirst ? color : "#f5f5f5";
                    b.style.color = isFirst ? "#333" : "#bbb";
                    b.style.borderColor = isFirst ? color : "#e0e0e0";
                    b.style.opacity = isFirst ? "1" : "0.5";
                });
            }
            updatePlot();
        });
        genreFilterLabel.appendChild(btn);
    });

    genreFilterDiv.appendChild(genreFilterLabel);

    const genreCheckboxes = document.createElement("div");
    genreCheckboxes.style.cssText = `display: flex; flex-wrap: wrap; gap: 6px;`;

    Object.entries(GENRE_COLORS).forEach(([genre, color]) => {
        const btn = document.createElement("button");
        btn.textContent = genre;
        btn.dataset.genre = genre;
        btn.style.cssText = `
            padding: 4px 12px;
            border: 1.5px solid ${color};
            border-radius: 12px;
            cursor: pointer;
            font-size: 12px;
            font-family: system-ui, sans-serif;
            background: ${color};
            color: #333;
            transition: all 0.15s ease;
        `;
        btn.addEventListener("click", () => {
            if (activeGenres.has(genre)) {
                if (activeGenres.size === 1) return;
                activeGenres.delete(genre);
                btn.style.background = "#f5f5f5";
                btn.style.color = "#bbb";
                btn.style.borderColor = "#e0e0e0";
                btn.style.opacity = "0.5";
            } else {
                activeGenres.add(genre);
                btn.style.background = color;
                btn.style.color = "#333";
                btn.style.borderColor = color;
                btn.style.opacity = "1";
            }
            updatePlot();
        });
        genreCheckboxes.appendChild(btn);
    });

    genreFilterDiv.appendChild(genreCheckboxes);
    controlsDiv.appendChild(genreFilterDiv);

    // ---- Plot container ----
    const plotContainer = document.createElement("div");
    container.appendChild(plotContainer);

    // ---- Render function ----
    const updatePlot = () => {
        plotContainer.innerHTML = "";

        const filtered = data.filter(d =>
            d.pct_female_mcs >= femaleFilter &&
            activeGenres.has(d.genre)
        );

        const dimmed = data.filter(d =>
            d.pct_female_mcs < femaleFilter ||
            !activeGenres.has(d.genre)
        );

        const colorScale = colorByGenre
            ? {
                domain: Object.keys(GENRE_COLORS),
                range: Object.values(GENRE_COLORS),
                legend: false
            }
            : {
                type: "linear",
                domain: [0, 1],
                range: ["#87c3ba", "#e5b2ed"],
                legend: false
            };

        const plot = Plot.plot({
            width: 1400,
            height: 1000,
            marginBottom: 100,
            marginLeft: 50,
            x: {
                label: "Popularity (members following)",
                labelOffset: 80,
                type: "log",
                domain: [minPopularity * 0.95, maxPopularity * 1.1],
                ticks: 10,
                grid: true
            },
            y: {
                label: "Average Rating",
                inset: 40,
                domain: [minScore - 0.2, maxScore + 0.2],
                ticks: 11,
                grid: true
            },
            color: colorScale,
            style: { fontSize: "28px" },
            marks: [
                // Dimmed dots
                Plot.dot(dimmed, {
                    x: "popularity",
                    y: "score",
                    fill: "#e0e0e0",
                    r: 12,
                    opacity: 0.25
                }),
                // Active dots
                Plot.dot(filtered, {
                    x: "popularity",
                    y: "score",
                    fill: colorByGenre
                        ? d => d.genre
                        : d => d.pct_female_mcs,
                    r: 12,
                    opacity: 0.85,
                    title: d => {
                        const femalePct = Math.round(d.pct_female_mcs * 100);
                        const malePct = Math.round(d.pct_male_mcs * 100);
                        return `${d.title}\nGenre: ${d.genre}\nScore: ${d.score}\nFemale MCs: ${femalePct}%\nMale MCs: ${malePct}%`;
                    }
                })
            ]
        });

        // Count label
        const countLabel = document.createElement("div");
        countLabel.style.cssText = `
            font-size: 12px;
            color: #999;
            font-family: system-ui, sans-serif;
            margin-bottom: 6px;
        `;
        countLabel.textContent = `Showing ${filtered.length} of ${data.length} anime`;
        plotContainer.appendChild(countLabel);
        plotContainer.appendChild(plot);

        // Fix card popup — pass full data, check by anime_id
        attachDotListeners(plot, data, filtered);
    };

    toggleBtn.addEventListener("click", () => {
        colorByGenre = !colorByGenre;
        toggleBtn.textContent = colorByGenre ? "Color by % Female" : "Color by Genre";
        toggleBtn.style.background = colorByGenre ? "#e75480" : "#333";
        toggleBtn.style.borderColor = colorByGenre ? "#e75480" : "#333";
        updatePlot();
    });

    updatePlot();
}

function attachDotListeners(plot, allData, filteredData) {
    const dots = plot.querySelectorAll("circle");

    // First set of dots are dimmed (dimmed.length dots), second set are active
    const dimmedCount = allData.length - filteredData.length;

    dots.forEach((dot, i) => {
        // Skip dimmed dots — they start at index 0
        if (i < dimmedCount) {
            dot.style.cursor = "default";
            return;
        }

        const d = filteredData[i - dimmedCount];
        if (!d) return;

        dot.style.cursor = "pointer";

        dot.addEventListener("mouseover", () => dot.setAttribute("r", 18));
        dot.addEventListener("mouseout", () => {
            if (dot === selectedDot) dot.setAttribute("r", 18);
            else dot.setAttribute("r", 12);
        });

        dot.addEventListener("click", () => {
            const femalePct = Math.round(d.pct_female_mcs * 100);
            const malePct = Math.round(d.pct_male_mcs * 100);

            const card = document.querySelector("#anime-card");
            card.style.display = "block";

            document.querySelector("#anime-title").textContent = d.title || "No title available";
            document.querySelector("#anime-genre").textContent = `Genre: ${d.genre}`;
            document.querySelector("#anime-gender-pct").textContent = `Female MCs: ${femalePct}%, Male MCs: ${malePct}%`;
            document.querySelector("#anime-desc").textContent = d.synopsis || "No description available";

            const img = document.querySelector("#anime-img");
            img.src = d.image_url;
            img.alt = d.title;

            if (selectedDot) {
                selectedDot.setAttribute("r", 12);
                selectedDot.removeAttribute("stroke");
                selectedDot.removeAttribute("stroke-width");
            }
            selectedDot = dot;
            dot.setAttribute("r", 18);
            dot.setAttribute("stroke", "black");
            dot.setAttribute("stroke-width", 2);
        });
    });
}