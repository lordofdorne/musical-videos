import express from "express";
import ffmpeg from "fluent-ffmpeg";
import {convertVideo, deleteFile, deleteProcessedVideo, deleteRawVideo, downloadRawVideo, setupDirectories, uploadProcessedVideo} from './storage'

setupDirectories()

const app = express();
app.use(express.json())

app.post("/process-video", async (req, res) => {
    let data;
    try {
        const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
        data = JSON.parse(message);
        if (!data.name) {
            throw new Error('Invalid message payload received.')
        }
    }   catch(error) {
        console.error(error);
        return res.status(400).send('Bad Request: missing filename')
    }

    const inputFileName = data.name;
    const outputFilename = `processed-${inputFileName}`;

    //download video from cloud
    await downloadRawVideo(inputFileName)

    // upload the video to cloud storage
    try {
        await convertVideo(inputFileName, outputFilename)
    } catch (error) {
        await Promise.all([
            deleteRawVideo(inputFileName),
            deleteProcessedVideo(outputFilename)
        ])
        console.log(error)
        return res.status(500).send('Internal Server Error')
    }

    await uploadProcessedVideo(outputFilename)
    await Promise.all([
        deleteRawVideo(inputFileName),
        deleteProcessedVideo(outputFilename)
    ])

    return res.status(200).send('processing finished')
});

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`video processing service listening at http://localhost:${port}`);
});
