const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
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

async function downloadEpisodesMp3s(episodes) {
  const episodesDir = 'episodes';

  // Create the episodes directory if it doesn't exist
  if (!fs.existsSync(episodesDir)) {
    fs.mkdirSync(episodesDir);
  }

  // Download each episode if it hasn't been downloaded yet
  for (const episode of episodes) {
    const episodeFilePath = `${episodesDir}/${episode.episodeNumber}.mp3`;

    if (fs.existsSync(episodeFilePath)) {
      console.log(`Episode ${episode.episodeNumber} already exists, skipping download.`);
    } else {
      console.log(`Downloading episode ${episode.episodeNumber}...`);
      await downloadFile(episode.mp3url, episodeFilePath);
      console.log(`Episode ${episode.episodeNumber} downloaded.`);
    }
  }
}

async function downloadFile(url, filePath) {
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
  });

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    response.data.pipe(file);
    file.on('finish', () => {
      file.close(resolve);
    });
    file.on('error', (err) => {
      fs.unlink(filePath, () => reject(err));
    });
  });
}

async function getEpisodes() {
  const episodesFile = 'episodes.json';
  let episodes;
  if (fs.existsSync(episodesFile)) {
    console.log(`File ${episodesFile} already exists, skipping episode download.`);
    const fileContents = fs.readFileSync(episodesFile, 'utf-8');
    episodes = JSON.parse(fileContents);
  } else {
    episodes = await getEpisodes();
    episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    // Save episodes JSON to a file
    fs.writeFile(episodesFile, JSON.stringify(episodes, null, 2), (err) => {
      if (err) {
        console.error('Error saving episodes JSON:', err);
      } else {
        console.log('Successfully saved episodes JSON to episodes.json');
      }
    });
  }
  await downloadEpisodesMp3s(episodes);
  return episodes;
}

module.exports = {
  getEpisodes
};