const speech = require('@google-cloud/speech');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const protobuf = require('protobufjs');

const root = protobuf.loadSync([ // note: synchronous file read - use .load() to use callback API
  './node_modules/@google-cloud/speech/build/protos/google/cloud/speech/v1/cloud_speech.proto',
  './node_modules/google-gax/build/protos/google/protobuf/timestamp.proto',
  './node_modules/google-gax/build/protos/google/protobuf/duration.proto',
  './node_modules/google-gax/build/protos/google/rpc/status.proto'
]);
function decodeProtobufAny(protobufAny) {
  const typeName = protobufAny.type_url.replace(/^.*\//, '');
  const type = root.lookupType(typeName);
  return type.decode(protobufAny.value);
}

// Your Google Cloud Storage bucket name
const BUCKET_NAME = 'purpleelf';

// Instantiates a client.
const client = new speech.SpeechClient();
const storage = new Storage();

async function fileExistsInGcs(bucketName, filePath) {
  const [exists] = await storage.bucket(bucketName).file(filePath).exists();
  return exists;
}

// Uploads a local file to the bucket
async function uploadFileToGcs(localFilePath) {
  const destinationPath = `audio-files/${localFilePath.split('/').pop()}`;
  const fileExists = await fileExistsInGcs(BUCKET_NAME, destinationPath);
  if (!fileExists) {
    await storage.bucket(BUCKET_NAME).upload(localFilePath, {
      destination: destinationPath,
    });
    console.log(`${localFilePath} uploaded to ${BUCKET_NAME}/${destinationPath}`);
  } else {
    console.log(`File ${BUCKET_NAME}/${destinationPath} already exists, skipping upload`);
  }
  return `gs://${BUCKET_NAME}/${destinationPath}`;
}

// Save the operation name after starting the transcription
async function startTranscription(fileName) {
  const gcsUri = await uploadFileToGcs(fileName);
  const audio = {
    uri: gcsUri,
  };
  // const audio = {
  //   content: fs.readFileSync(fileName).toString('base64'),
  // };

  // The audio file's encoding, sample rate in hertz, BCP-47 language code and other settings.
  const config = {
    encoding: "MP3",
    sampleRateHertz: 44100,
    languageCode: "en-US",
    model: "video",
    audioChannelCount: 2,
    enableAutomaticPunctuation: true,
    enableWordConfidence: true,
    useEnhanced: true,
    enableWordTimeOffsets: true,
    maxAlternatives: 1,
    adaptation: {
      phraseSetReferences: ["projects/754285314468/locations/global/phraseSets/Everquest"],
    },
    diarizationConfig: {
      enableSpeakerDiarization: true,
      minSpeakerCount: 2,
      maxSpeakerCount: 2,
    },
  };
  const request = {
    audio: audio,
    config: config,
  };

  // Detects speech in the audio file. This creates a recognition job that you 
  // can wait for now, or get its result later.
  console.log("Starting transcription");
  const [operation] = await client.longRunningRecognize(request);
  console.log("Operation name:", operation.name);
  // const [response] = await operation.promise();

  return operation.name;
}

// Get transcription results using the operation name
async function getTranscriptionResults(operationName) {
  const [operation] = await client.operationsClient.getOperation({ name: operationName });
  if (operation.done) {
    const response = decodeProtobufAny(operation.response)
    fs.writeFileSync('transcription.json', JSON.stringify(response));
    // console.log(response)
    const detailedTranscription = response.results.map(result => {
      if (result.alternatives && result.alternatives[0].words && result.alternatives[0].words.length > 0) {
        // console.log(result.alternatives[0].transcript, result.alternatives[0].words.map(word => word.speakerTag).join(' '));

        const startTime = result.alternatives[0].words[0].startTime.seconds + (result.alternatives[0].words[0].startTime.nanos / 1e9);
        const endTime = result.alternatives[0].words[result.alternatives[0].words.length - 1].endTime.seconds + (result.alternatives[0].words[result.alternatives[0].words.length - 1].endTime.nanos / 1e9);
        const speakerTag = result.alternatives[0].words[0].speakerTag;
        const transcript = result.alternatives[0].transcript;

        return { startTime, endTime, speakerTag, transcript };
      } else {
        return null;
      }
    });
    // console.log('Detailed Transcription:', detailedTranscription);
    return detailedTranscription;
  } else {
    console.log('Transcription is not yet complete. Please try again later.');
    return null;
  }
}

async function main() {
  // const operationName = await startTranscription("~/Downloads/Episode_148_smaller_cut.mp3");
  // const operationName = "projects/754285314468/locations/global/operations/3173767909281124631"
  // const operationName = "1792521906477065949"
  const operationName = "3173767909281124631"
  getTranscriptionResults(operationName);
}

main();