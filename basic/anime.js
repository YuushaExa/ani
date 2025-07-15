// fetch-anilist.js
const fs = require('fs');
const { default: fetch } = require('node-fetch');

// Get page range from command line or use default 1-20
const pageRange = process.argv[2] || '1-20';
const [startPage, endPage] = pageRange.split('-').map(Number);

if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage < startPage) {
    console.error('Invalid page range. Usage: node fetch-anilist.js [start-end]');
    console.error('Example: node fetch-anilist.js 1-200');
    process.exit(1);
}

const perPage = 50;
const pagesToFetch = Array.from({length: endPage - startPage + 1}, (_, i) => startPage + i);
const outputFile = `anime-${startPage}-${endPage}.json`;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJapaneseAnime(page) {
    const query = `
        query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(type: ANIME, sort: ID) {
                    id
                    idMal
                    title {
                        romaji
                        english
                        native
                    }
                    type
                    format
                    status
                    description(asHtml: false)
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    season
                    seasonYear
                    seasonInt
                    episodes
                    duration
                    countryOfOrigin
                    source
                    hashtag
                    coverImage {
                        large
                        medium
                        color
                    }
                    bannerImage
                    genres
                    averageScore
                    meanScore
                    isAdult
                    trailer {
                        id
                        site
                        thumbnail
                    }
                    bannerImage
                    synonyms
                    relations {
                        edges {
                            id
                            relationType
                            node {
                                id
                                title {
                                    romaji
                                    english
                                    native
                                }
                                type
                                format
                                status
                                coverImage {
                                    large
                                    color
                                }
                            }
                        }
                    }
                    studios {
                        edges {
                            id
                            isMain
                            node {
                                id
                                name
                            }
                        }
                    }
                }
            }
        }
    `;

     const variables = {
        page: page,
        perPage: perPage
    };

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.data.Page.media;
    } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        return null;
    }
}

async function main() {
    let allData = [];
    let failedPages = [];

    for (let i = 0; i < pagesToFetch.length; i++) {
        const page = pagesToFetch[i];
        console.log(`Fetching page ${page} (${i+1}/${pagesToFetch.length})...`);
        
        try {
            const data = await fetchJapaneseAnime(page);
            if (data && data.length > 0) {
                allData = [...allData, ...data];
                console.log(`Page ${page} fetched successfully (${data.length} items)`);
            }
            
            // Add delay between requests (300ms)
            await sleep(300);
            
            // Pause for 1 minute every 20 pages
            if ((i + 1) % 20 === 0 && i < pagesToFetch.length - 1) {
                console.log('Pausing for 1 minute to avoid rate limiting...');
                await sleep(60000); // 1 minute
            }
        } catch (error) {
            console.error(`Failed to fetch page ${page}:`, error);
            failedPages.push(page);
        }
    }

    // Save the data
    fs.writeFileSync(outputFile, JSON.stringify(allData, null, 2));
    console.log(`Data saved to ${outputFile}`);
    console.log(`Total items fetched: ${allData.length}`);
    if (failedPages.length > 0) {
        console.log(`Failed pages: ${failedPages.join(', ')}`);
    }
}

main().catch(console.error);
