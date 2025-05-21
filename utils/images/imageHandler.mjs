import uploadToGridFS from "./imageuploader.mjs";


//?Actually can be used everywhere
export async function imageHandler(req, res,next) {
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