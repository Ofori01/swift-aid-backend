
export async function getDistanceMatrix(req, res,next) {
    const { recommendations, available_resources } = req.body;
    console.log(recommendations,available_resources);

}