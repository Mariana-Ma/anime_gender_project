// scatter.js

// Load data
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

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Toggle Genre / % Female";
    toggleBtn.style.marginBottom = "10px";
    container.appendChild(toggleBtn);

    let colorByGenre = true;

    const renderPlot = () => {
        const colorScale = colorByGenre
            ? {
                domain: Object.keys(GENRE_COLORS),
                range: Object.values(GENRE_COLORS),
                legend: false  // disable built-in
            }
            : {
                type: "linear",
                domain: [0, 1],
                range: ["#87c3ba", "#e5b2ed"],
                legend: false  // disable built-in
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
                Plot.dot(data, {
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
    
        // Build fixed legend
        const legendDiv = document.createElement("div");
        legendDiv.style.height = "60px";
        legendDiv.style.display = "flex";
        legendDiv.style.alignItems = "center";
        legendDiv.style.gap = "16px";
        legendDiv.style.flexWrap = "wrap";
        legendDiv.style.marginBottom = "8px";
    
        if (colorByGenre) {
            // Categorical swatches
            Object.entries(GENRE_COLORS).forEach(([genre, color]) => {
                const item = document.createElement("div");
                item.style.display = "flex";
                item.style.alignItems = "center";
                item.style.gap = "4px";
                item.innerHTML = `
                    <span style="width:12px;height:12px;background:${color};border-radius:50%;display:inline-block"></span>
                    <span style="font-size:13px">${genre}</span>
                `;
                legendDiv.appendChild(item);
            });
        } else {
            // Gradient legend
            legendDiv.innerHTML = `
                <span style="font-size:13px">0% Female</span>
                <div style="width:200px;height:12px;background:linear-gradient(to right,#87c3ba,#e5b2ed);border-radius:4px"></div>
                <span style="font-size:13px">100% Female</span>
            `;
        }
    
        const wrapper = document.createElement("div");
        wrapper.appendChild(legendDiv);
        wrapper.appendChild(plot);
        return wrapper;
    };

    let plot = renderPlot();
    container.appendChild(plot);
    attachDotListeners(plot, data);

    toggleBtn.addEventListener("click", () => {
        colorByGenre = !colorByGenre;

        // Remove old plot only, keep button
        while (container.children.length > 1) {
            container.removeChild(container.lastChild);
        }

        plot = renderPlot();
        container.appendChild(plot);
        attachDotListeners(plot, data);
    });
}

function attachDotListeners(plot, data) {
    const dots = plot.querySelectorAll("circle");
    dots.forEach((dot, i) => {
        dot.style.cursor = "pointer";

        dot.addEventListener("mouseover", () => dot.setAttribute("r", 18));
        dot.addEventListener("mouseout", () => {
            if (dot === selectedDot) dot.setAttribute("r", 18);
            else dot.setAttribute("r", 12);
        });

        dot.addEventListener("click", () => {
            const d = data[i];
            
            // calculate first
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