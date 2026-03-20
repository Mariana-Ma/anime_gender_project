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
        .slice(0, 400)
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
    characters.forEach(c => { genderByChar[c.character_id] = c.gender; });

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
    const maxScore     = d3.max(data, d => d.score);
    const minScore     = d3.min(data, d => d.score);

    const container = document.getElementById("scatter-plot");
    container.innerHTML = "";

    let colorByGenre    = true;
    let femaleFilter    = 0;
    let activeGenres    = new Set(Object.keys(GENRE_COLORS));
    let highlightAllMale = false;

    // ── Helpers ──────────────────────────────────────────────
    const makeSectionLabel = text => {
        const el = document.createElement("span");
        el.textContent = text;
        el.className = "controls-section-label";
        return el;
    };

    const makeSubLabel = text => {
        const el = document.createElement("span");
        el.textContent = text;
        el.className = "controls-sub-label";
        return el;
    };

    const makeDivider = () => {
        const el = document.createElement("hr");
        el.className = "controls-divider";
        return el;
    };

    // ── Controls panel ───────────────────────────────────────
    const panel = document.createElement("div");
    panel.className = "controls-panel";
    container.appendChild(panel);

    // ── Row 1: Color by ──────────────────────────────────────
    const colorRow = document.createElement("div");
    colorRow.className = "controls-row";
    colorRow.appendChild(makeSectionLabel("Color by: "));

    const colorOptions = [
        { label: "Genre",       value: true  },
        { label: "% Female MCs", value: false }
    ];

    colorOptions.forEach(opt => {
        const btn = document.createElement("button");
        btn.textContent = opt.label;
        const col = opt.value ? "#555" : "#e75480";
        btn.style.cssText = `
            padding: 6px 14px; border-radius: 8px; cursor: pointer;
            font-size: 13px; font-family: inherit; font-weight: 500;
            transition: all 0.15s ease;
            border: 1.5px solid ${col};
            background: ${colorByGenre === opt.value ? col : "#fff"};
            color: ${colorByGenre === opt.value ? "#fff" : col};
        `;
        btn.addEventListener("click", () => {
            colorByGenre = opt.value;
            colorRow.querySelectorAll("button").forEach((b, i) => {
                const isActive = colorOptions[i].value === colorByGenre;
                const c = colorOptions[i].value ? "#555" : "#e75480";
                b.style.background  = isActive ? c : "#fff";
                b.style.color       = isActive ? "#fff" : c;
                b.style.borderColor = c;
            });
            updatePlot();
        });
        colorRow.appendChild(btn);
    });

    panel.appendChild(colorRow);
    panel.appendChild(makeDivider());

    // ── Filter section ───────────────────────────────────────
    const filterSection = document.createElement("div");
    filterSection.className = "controls-filter-section";
    filterSection.appendChild(makeSectionLabel("Filter by: "));

    // Sub-section: Min % Female MCs
    const femaleFilterBlock = document.createElement("div");
    femaleFilterBlock.className = "controls-filter-block";
    femaleFilterBlock.appendChild(makeSubLabel("Min % Female MCs"));

    const sliderRow = document.createElement("div");
    sliderRow.className = "controls-slider-row";

    // Slider track
    const sliderWrapper = document.createElement("div");
    sliderWrapper.className = "controls-slider-wrapper";

    const gradientBar = document.createElement("div");
    gradientBar.className = "controls-slider-gradient";
    sliderWrapper.appendChild(gradientBar);

    const dimOverlay = document.createElement("div");
    dimOverlay.className = "controls-slider-dim";
    sliderWrapper.appendChild(dimOverlay);

    [0, 25, 50, 75, 100].forEach(pct => {
        const tick = document.createElement("div");
        tick.className = "controls-slider-tick";
        tick.style.left = `${pct}%`;
        tick.textContent = `${pct}%`;
        sliderWrapper.appendChild(tick);
    });

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0; slider.max = 100; slider.value = 0; slider.step = 1;
    slider.className = "controls-slider-input";
    sliderWrapper.appendChild(slider);

    const handle = document.createElement("div");
    handle.className = "controls-slider-handle";
    handle.style.left = "0%";
    sliderWrapper.appendChild(handle);

    sliderRow.appendChild(sliderWrapper);

    // Value label
    const sliderValueLabel = document.createElement("span");
    sliderValueLabel.className = "controls-slider-value";
    sliderValueLabel.textContent = "Drag to filter";
    sliderRow.appendChild(sliderValueLabel);

    // All-male checkbox
    const allMaleRow = document.createElement("div");
    allMaleRow.className = "controls-all-male-row";

    const allMaleCheckbox = document.createElement("input");
    allMaleCheckbox.type = "checkbox";
    allMaleCheckbox.id = "all-male-toggle";
    allMaleCheckbox.style.cssText = `cursor: pointer; accent-color: ${GENDER_COLORS.Male}; width: 13px; height: 13px;`;

    const allMaleLabel = document.createElement("label");
    allMaleLabel.htmlFor = "all-male-toggle";
    const allMaleCount = data.filter(d => d.pct_female_mcs === 0).length;
    allMaleLabel.textContent = `Highlight all-male anime (${allMaleCount})`;

    allMaleRow.appendChild(allMaleCheckbox);
    allMaleRow.appendChild(allMaleLabel);
    sliderRow.appendChild(allMaleRow);

    femaleFilterBlock.appendChild(sliderRow);
    filterSection.appendChild(femaleFilterBlock);

    // Sub-section: Genre
    const genreFilterBlock = document.createElement("div");
    genreFilterBlock.className = "controls-filter-block";
    genreFilterBlock.appendChild(makeSubLabel("Genre"));

    const genreButtonsWrapper = document.createElement("div");
    genreButtonsWrapper.className = "controls-genre-buttons";

    const genreCheckboxes = document.createElement("div");
    genreCheckboxes.className = "controls-genre-checkboxes";

    Object.entries(GENRE_COLORS).forEach(([genre, color]) => {
        const btn = document.createElement("button");
        btn.textContent = genre;
        btn.dataset.genre = genre;
        // border/bg are dynamic so keep inline
        btn.style.cssText = `
            padding: 4px 12px; border-radius: 12px; cursor: pointer;
            font-size: 12px; font-family: inherit;
            border: 1.5px solid ${color}; background: ${color}; color: #333;
            transition: all 0.15s ease;
        `;
        btn.addEventListener("click", () => {
            if (activeGenres.has(genre)) {
                if (activeGenres.size === 1) return;
                activeGenres.delete(genre);
                btn.style.background   = "#f5f5f5";
                btn.style.color        = "#bbb";
                btn.style.borderColor  = "#e0e0e0";
                btn.style.opacity      = "0.5";
            } else {
                activeGenres.add(genre);
                btn.style.background   = color;
                btn.style.color        = "#333";
                btn.style.borderColor  = color;
                btn.style.opacity      = "1";
            }
            updatePlot();
        });
        genreCheckboxes.appendChild(btn);
    });

    genreButtonsWrapper.appendChild(genreCheckboxes);

    const genreCtrl = document.createElement("div");
    genreCtrl.className = "controls-genre-ctrl";

    ["All", "None"].forEach(label => {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.className = "controls-genre-ctrl-btn";
        btn.addEventListener("click", () => {
            if (label === "All") {
                activeGenres = new Set(Object.keys(GENRE_COLORS));
                genreCheckboxes.querySelectorAll("button").forEach(b => {
                    const c = GENRE_COLORS[b.dataset.genre];
                    b.style.background  = c;
                    b.style.color       = "#333";
                    b.style.borderColor = c;
                    b.style.opacity     = "1";
                });
            } else {
                const first = Object.keys(GENRE_COLORS)[0];
                activeGenres = new Set([first]);
                genreCheckboxes.querySelectorAll("button").forEach(b => {
                    const isFirst = b.dataset.genre === first;
                    const c = GENRE_COLORS[b.dataset.genre];
                    b.style.background  = isFirst ? c : "#f5f5f5";
                    b.style.color       = isFirst ? "#333" : "#bbb";
                    b.style.borderColor = isFirst ? c : "#e0e0e0";
                    b.style.opacity     = isFirst ? "1" : "0.5";
                });
            }
            updatePlot();
        });
        genreCtrl.appendChild(btn);
    });

    genreButtonsWrapper.appendChild(genreCtrl);
    genreFilterBlock.appendChild(genreButtonsWrapper);
    filterSection.appendChild(genreFilterBlock);
    panel.appendChild(filterSection);

    // ── Plot container ───────────────────────────────────────
    const plotContainer = document.createElement("div");
    container.appendChild(plotContainer);

    // ── Event listeners ──────────────────────────────────────
    allMaleCheckbox.addEventListener("change", () => {
        highlightAllMale = allMaleCheckbox.checked;
        updatePlot();
    });

    slider.addEventListener("input", () => {
        const val = parseInt(slider.value);
        femaleFilter = val / 100;
        handle.style.left        = `${val}%`;
        dimOverlay.style.width   = `${val}%`;

        // Interpolate handle color along gradient
        const t  = val / 100;
        const rc = Math.round(0x87 + (0xe5 - 0x87) * t);
        const gc = Math.round(0xc3 + (0xb2 - 0xc3) * t);
        const bc = Math.round(0xba + (0xed - 0xba) * t);
        handle.style.borderColor = `rgb(${rc},${gc},${bc})`;

        if (val === 0) {
            sliderValueLabel.textContent = "Drag to filter";
            sliderValueLabel.style.color = "#999";
        } else {
            sliderValueLabel.textContent = `Showing ≥${val}% female main characters`;
            sliderValueLabel.style.color = `rgb(${rc},${gc},${bc})`;
        }
        updatePlot();
    });

    // ── Render ───────────────────────────────────────────────
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

        const allMaleDots    = highlightAllMale ? filtered.filter(d => d.pct_female_mcs === 0) : [];
        const nonAllMaleDots = highlightAllMale ? filtered.filter(d => d.pct_female_mcs > 0)  : filtered;

        const colorScale = colorByGenre
            ? { domain: Object.keys(GENRE_COLORS), range: Object.values(GENRE_COLORS), legend: false }
            : { type: "linear", domain: [0, 1], range: ["#87c3ba", "#e5b2ed"], legend: false };

        const marks = [
            Plot.dot(dimmed, { x: "popularity", y: "score", fill: "#e0e0e0", r: 6, opacity: 0.2 })
        ];

        if (highlightAllMale) {
            marks.push(Plot.dot(nonAllMaleDots, {
                x: "popularity", y: "score", fill: "#e0e0e0", r: 6, opacity: 0.3
            }));
            marks.push(Plot.dot(allMaleDots, {
                x: "popularity", y: "score",
                fill: colorByGenre ? d => d.genre : d => d.pct_female_mcs,
                r: 6, opacity: 0.9,
                title: d => `${d.title}\nGenre: ${d.genre}\nScore: ${d.score}\n0% female MCs`
            }));
        } else {
            marks.push(Plot.dot(filtered, {
                x: "popularity", y: "score",
                fill: colorByGenre ? d => d.genre : d => d.pct_female_mcs,
                r: 6, opacity: 0.85,
                title: d => {
                    const fp = Math.round(d.pct_female_mcs * 100);
                    const mp = Math.round(d.pct_male_mcs * 100);
                    return `${d.title}\nGenre: ${d.genre}\nScore: ${d.score}\nFemale MCs: ${fp}%\nMale MCs: ${mp}%`;
                }
            }));
        }

        const plot = Plot.plot({
            width: 830, height: 560,
            marginBottom: 100, marginLeft: 50,
            x: {
                label: "Popularity (members following)", labelOffset: 40,
                type: "log", domain: [minPopularity * 0.95, maxPopularity * 1.1],
                ticks: 8, grid: true
            },
            y: {
                label: "Average Rating", inset: 10, labelOffset: 20,
                domain: [minScore - 0.08, maxScore + 0.08],
                ticks: 10, grid: true
            },
            color: colorScale,
            style: { fontSize: "14px" },
            marks
        });

        const countLabel = document.createElement("div");
        countLabel.className = "controls-count-label";
        countLabel.textContent = highlightAllMale
            ? `Highlighting ${allMaleDots.length} all-male anime out of ${filtered.length} shown`
            : `Showing ${filtered.length} of ${data.length} anime`;

        plotContainer.appendChild(countLabel);
        plotContainer.appendChild(plot);

        const dotOrder = highlightAllMale
            ? [...dimmed, ...nonAllMaleDots, ...allMaleDots]
            : [...dimmed, ...filtered];

        attachDotListeners(plot, dotOrder, dimmed.length, highlightAllMale ? nonAllMaleDots.length : 0);
    };

    updatePlot();
}

function attachDotListeners(plot, dotOrder, dimmedCount, extraSkip) {
    const dots = plot.querySelectorAll("circle");
    dots.forEach((dot, i) => {
        if (i < dimmedCount + extraSkip) {
            dot.style.cursor = "default";
            return;
        }
        const d = dotOrder[i];
        if (!d) return;

        dot.style.cursor = "pointer";
        dot.addEventListener("mouseover", () => dot.setAttribute("r", 8));
        dot.addEventListener("mouseout",  () => {
            if (dot === selectedDot) dot.setAttribute("r", 8);
            else dot.setAttribute("r", 6);
        });

        dot.addEventListener("click", () => {
            const femalePct = Math.round(d.pct_female_mcs * 100);
            const malePct   = Math.round(d.pct_male_mcs   * 100);

            const card = document.querySelector("#anime-card");
            card.style.display = "block";
            document.querySelector("#anime-title").textContent      = d.title   || "No title available";
            document.querySelector("#anime-genre").textContent      = `Genre: ${d.genre}`;
            document.querySelector("#anime-gender-pct").textContent = `Female MCs: ${femalePct}%, Male MCs: ${malePct}%`;
            document.querySelector("#anime-desc").textContent       = d.synopsis || "No description available";

            const img = document.querySelector("#anime-img");
            img.src = d.image_url;
            img.alt = d.title;

            if (selectedDot) {
                selectedDot.setAttribute("r", 6);
                selectedDot.removeAttribute("stroke");
                selectedDot.removeAttribute("stroke-width");
            }
            selectedDot = dot;
            dot.setAttribute("r", 8);
            dot.setAttribute("stroke", "#999");
            dot.setAttribute("stroke-width", 2);
        });
    });
}