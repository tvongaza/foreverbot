const fs = require('fs');
const episodeDownloader = require('./episodeDownloader');

async function main() {
  const episodes = await episodeDownloader.getEpisodes();
}

main();