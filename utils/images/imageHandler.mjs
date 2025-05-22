import uploadToGridFS from "./imageuploader.mjs";


//?Actually can be used everywhere
export async function singleImageHandler(req, res,next) {
    const { file } = req;
    if (!file) {
        return res.status(400).json({ message: 'No image uploaded' });
    }
    try {
        const imageUrl = await uploadToGridFS(file)
        req.body.imageUrl = imageUrl;
    } catch (error) {
        console.log("Error uploading image",error)
        return res.status(500).json({ message: 'Internal server error' });
        
    }
    next()
}


export async function multipleImageHandler(req, res,next) {
    const { files } = req;
    if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No images uploaded' });
    }
    try {
        const imageUrls = await Promise.all(files.map(file => uploadToGridFS(file)))
        req.body.imageUrls = imageUrls;
    } catch (error) {
        console.log("Error uploading images",error)
        return res.status(500).json({ message: 'Internal server error' });
        
    }
    next()
}