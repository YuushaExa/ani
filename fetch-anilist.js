// fetch-anilist.js
const fs = require('fs');
const fetch = require('node-fetch');

const perPage = 50;
const pagesToFetch = Array.from({length: 20}, (_, i) => i + 1); // Pages 1-20
const outputFile = 'anilist-data.json';

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

    for (const page of pagesToFetch) {
        console.log(`Fetching page ${page}...`);
        try {
            const data = await fetchJapaneseAnime(page);
            if (data && data.length > 0) {
                allData = [...allData, ...data];
                console.log(`Page ${page} fetched successfully (${data.length} items)`);
            }
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
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
