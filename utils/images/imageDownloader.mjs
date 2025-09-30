//? logic from downloading images from server
import { bucket } from "../../server/index.mjs";
import { ObjectId } from "mongodb";
export async function imageDownloader(request, response) {
  try {
    const imageUrl = new ObjectId(request.params.id)
    const downloadStream = bucket.openDownloadStream(imageUrl);
  
    downloadStream.on("error", (error) => {
      console.error("Error downloading file:", error);
      return response.status(500).send("Error downloading file");
    });
  
    downloadStream.pipe(response);
  } catch (error) {
    console.error('Error retrieving file:', error);
    response.status(500).send('Error retrieving file');
    
  }
}
