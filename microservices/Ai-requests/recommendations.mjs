import { configDotenv } from "dotenv";
import Groq from "groq-sdk";
configDotenv();

//?might have to modify prompt and schema determine actual emergencies from fakes

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

//response schema of Ai
const schema = {
  type: "object",
  properties: {
    severity_level: {
      type: "string",
      enum: ["Low", "Medium", "High", "Critical"],
      description: "The estimated severity of the emergency.",
    },
    recommended_resources: {
      type: "object",
      properties: {
        ambulances: {
          type: "integer",
          minimum: 0,
          description: "Number of ambulances recommended for this incident.",
        },
        fire_trucks: {
          type: "integer",
          minimum: 0,
          description: "Number of fire trucks recommended for this incident.",
        },
        police_units: {
          type: "integer",
          minimum: 0,
          description: "Number of police units recommended for this incident.",
        },
      },
      required: ["ambulances", "fire_trucks", "police_units"],
      description:
        "Recommended number of resources to dispatch based on severity.",
    },
    justification: {
      type: "string",
      description:
        "Explanation for the assigned severity and resource recommendations.",
    },
    priority_score: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description: "A numerical priority score (1-100) indicating urgency.",
    },
    estimated_response_time: {
      type: "integer",
      minimum: 1,
      description:
        "Estimated response time in minutes based on resource availability and location.",
    },
  },
  required: [
    "severity_level",
    "recommended_resources",
    "justification",
    "priority_score",
    "estimated_response_time",
  ],
};

export async function getRecommendation(userDescription, imageUrl, resources) {
  const jsonSchema = JSON.stringify(schema, null, 4);
  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userDescription,
            },
            {
              type: "image_url",
              image_url: {
                url: `https://swift-aid-backend.onrender.com/emergency/image/${imageUrl}`,
              },
            },
          ],
        },
        {
          role: "user",
          content: `You are an AI emergency response assistant responsible for analyzing emergency requests.
Based on the user's description, the provided image, available resources, and historical data, assess the incident's severity and determine the necessary resources.
Instructions:
1. Analyze the emergency description and image.
2. Consider available resources:
   - Ambulances: ${resources.ambulances}
   - Fire Trucks: ${resources.fire_trucks}
   - Police Units: ${resources.police_units}
3. Classify the emergency as "Low", "Medium", "High", or "Critical".
4. Recommend the number of ambulances, fire trucks, and police units.
5. Provide a justification.
6. Assign a priority score (1-100).
7. Estimate response time in minutes.
8. The resources are scarce and in limited number so ensure optimal number of fire trucks, police units, ambulances are used.
Output Format:
Output a valid JSON object that conforms exactly to the following schema. Do not include any markdown formatting or extra text.
Schema: ${jsonSchema}`,
        },
      ],
      temperature: 1,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
      stop: null,
      response_format: { type: "json_object" },
    });
    const responseText = completion.choices[0].message.content.trim();
    const parsedResponse = JSON.parse(responseText);
    return parsedResponse;
  } catch (error) {
    console.log("Error in generating recommendation: ", error);
    throw new Error("Error in generating recommendation");
  }
}
