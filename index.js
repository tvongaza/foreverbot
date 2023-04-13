const axios = require("axios")
const cheerio = require("cheerio")
const fs = require('fs');
const http = require('http');
const baseUrl = "https://www.purpleelfproductions.com";

async function requestWithRetry(url, retries = 5, delay = 1000) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (retries === 0) {
      throw error;
    }
    console.log(`Error fetching ${url}. Retrying in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return requestWithRetry(url, retries - 1, delay * 2);
  }
}

async function getEpisodes() {
  let episodes = [];
  await getEpisodesAtPath("/foreverquest");

  async function getEpisodesAtPath(path) {
    console.log("Loading page: " + path);
    const indexPage = await requestWithRetry(`${baseUrl}${path}`);
    const $ = cheerio.load(indexPage);
    const links = $('h1.blog-title > a').toArray();

    for (const el of links) {
      const item = $(el).text().trim();
      const link = $(el).attr('href');
      console.log(`Loading episode: ${item} - ${link}`);

      // Get MP3 URL from the episode page
      const episodePage = await requestWithRetry(`${baseUrl}${link}`);
      const mp3url = cheerio.load(episodePage)('div.sqs-audio-embed').attr('data-url');

      // Extract episode number
      const episodeNumberMatch = item.match(/(\d+):/);
      const episodeNumber = episodeNumberMatch ? parseInt(episodeNumberMatch[1]) : null;

      episodes.push({ item, link, mp3url, episodeNumber });
    }

    newPath = $('a[rel="next"]').attr('href');
    if (newPath) {
      await getEpisodesAtPath(newPath);
    }
  }

  return episodes;
}

async function downloadEpisode(episode) {
  // var file = fs.createWriteStream(`./episodes/${episode.item}.mp3`);
  // http.get(mp3url, function (response) {
  //   response.pipe(file);
  //   // file.on('finish', function () {
  //   //   file.close(cb);
  //   // });
  // });
}

async function main() {
  const episodes = await getEpisodes();
  episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  console.log(episodes);
  // Save episodes JSON to a file
  fs.writeFile('episodes.json', JSON.stringify(episodes, null, 2), (err) => {
    if (err) {
      console.error('Error saving episodes JSON:', err);
    } else {
      console.log('Successfully saved episodes JSON to episodes.json');
    }
  });
  // episodes.forEach(episode => {
  //   downloadEpisode(episode);
  // })
}
main();