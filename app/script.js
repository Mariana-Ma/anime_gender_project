const ALLOWED_GENRES = new Set([
    "Action",
    "Adventure",
    "Avant Garde",
    "Comedy",
    "Drama",
    "Horror",
    "Mystery",
    "Slice of Life",
    "Supernatural",
    "Other"
]);

const GENRE_COLORS = {
    Action: "#b5c9f5",
    Adventure: "#87c3ba",
    Drama: "#c5d88c",
    Comedy: "#ffe2a4",
    Horror: "#ffaf6e",
    Mystery: "#f590a1",
    "Slice of Life": "#e5b2ed",
    Supernatural: "#9a81b0",
    "Avant Garde": "#c9a98d",
    Other: "#c2bebc"
};

Promise.all([
    d3.csv("../data/anime.csv", d3.autoType),
    d3.csv("../data/anime_primary_genre.csv", d3.autoType)
]).then(([anime, genres]) => {
    buildChart(anime, genres);
});

function buildChart(anime, genres) {
    const genreByAnime = {};

    genres.forEach(d => {
        const g = d.genre;
        if (!g) return;
        genreByAnime[d.anime_id] = g;
    });

    // Filter & map data
    const data = anime
        .filter(d => d.score && d.members)
        .sort((a, b) => b.members - a.members)
        .slice(0, 300) // top 300 popular anime
        .map(d => ({
            title: d.title,
            score: d.score,
            popularity: d.members,
            genre: genreByAnime[d.anime_id] || "Other",
            image_url: d.image_url,
            synopsis: d.synopsis
        }))
        .filter(d => ALLOWED_GENRES.has(d.genre));

    drawScatter(data);
}


let selectedDot = null;

function drawScatter(data) {
    const maxPopularity = d3.max(data, d => d.popularity);
    const minPopularity = d3.min(data, d => d.popularity);

    const maxScore = d3.max(data, d => d.score);
    const minScore = d3.min(data, d => d.score);

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
        color: {
            domain: Object.keys(GENRE_COLORS),
            range: Object.values(GENRE_COLORS),
            legend: true,
        },
        style: {
            fontSize: "28px"
        },
        marks: [
            Plot.dot(data, {
                x: "popularity",
                y: "score",
                fill: "genre",
                r: 12,
                opacity: 0.85,
                title: d => `${d.title}\n${d.genre}\nScore: ${d.score}`
            })
        ]
    });

    document.getElementById("chart").appendChild(plot);

    // attach click listeners to each circles
    const dots = plot.querySelectorAll("circle");

    dots.forEach((dot, i) => {
        dot.style.cursor = "pointer"; // indicate clickable
        // hover effect
        dot.addEventListener("mouseover", () => {
            dot.setAttribute("r", 18);          
        });

        dot.addEventListener("mouseout", () => {
            // reset size depending if it's selected or not
            if (dot === selectedDot) {
                dot.setAttribute("r", 18);        
            } else {
                dot.setAttribute("r", 12);        
            }
        });

        dot.addEventListener("click", () => {
            const d = data[i]; // corresponding data

            const card = document.querySelector("#anime-card");
            card.style.display = "block";

            const title = document.querySelector("#anime-title");
            title.textContent = d.title || "No title available";

            const genre = document.querySelector("#anime-genre");
            genre.textContent = "Genre: " + d.genre || "No genre available";

            // Update details panel
            const img = document.querySelector("#anime-img");
            img.src = d.image_url;
            img.alt = d.title;

            const desc = document.querySelector("#anime-desc");
            desc.textContent = d.synopsis || "No description available";

            // Highlight selected dot
            if (selectedDot) {
                selectedDot.setAttribute("r", 12);
                selectedDot.setAttribute("stroke", null);
            }
            selectedDot = dot;
            dot.setAttribute("r", 12);
            dot.setAttribute("stroke", "black");
            dot.setAttribute("stroke-width", 2);
        });
    });
}
