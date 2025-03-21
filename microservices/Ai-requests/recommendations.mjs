import { configDotenv } from "dotenv";
import Groq from "groq-sdk";
configDotenv();

const groq= new Groq({apiKey: process.env.GROQ_API_KEY});


//response schema of Ai
const schema = {
    "type": "object",
    "properties": {
      "severity_level": {
        "type": "string",
        "enum": ["Low", "Medium", "High", "Critical"],
        "description": "The estimated severity of the emergency."
      },
      "recommended_resources": {
        "type": "object",
        "properties": {
          "ambulances": {
            "type": "integer",
            "minimum": 0,
            "description": "Number of ambulances recommended for this incident."
          },
          "fire_trucks": {
            "type": "integer",
            "minimum": 0,
            "description": "Number of fire trucks recommended for this incident."
          },
          "police_units": {
            "type": "integer",
            "minimum": 0,
            "description": "Number of police units recommended for this incident."
          }
        },
        "required": ["ambulances", "fire_trucks", "police_units"],
        "description": "Recommended number of resources to dispatch based on severity."
      },
      "justification": {
        "type": "string",
        "description": "Explanation for the assigned severity and resource recommendations."
      },
      "priority_score": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100,
        "description": "A numerical priority score (1-100) indicating urgency."
      },
      "estimated_response_time": {
        "type": "integer",
        "minimum": 1,
        "description": "Estimated response time in minutes based on resource availability and location."
      }
    },
    "required": ["severity_level", "recommended_resources", "justification", "priority_score", "estimated_response_time"]
  }


  export async function getRecommendation(userDescription, imageUrl, resources) {
    const jsonSchema = JSON.stringify(schema, null, 4);
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.2-11b-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: userDescription
                        },
                        {
                            type: "image_url",
                            //!change to use url from server
                            image_url: {
                                url: "https://lighthouse.mq.edu.au/__data/assets/image/0011/821738/house-fire700x400.jpg"
                            }
                        }
                    ]
                },
                {
                    role: "user",
                    content: `You are an AI emergency response assistant responsible for analyzing emergency requests. 
                
Based on the user's description, the provided image, available resources, and historical data, assess the severity of the incident and determine the necessary resources required for response. Use historical emergency patterns to support your decision-making.

### **Instructions:**
1. **Analyze the Emergency Description & Image**: Extract key details such as the number of people involved, type of incident, and potential threats.
2. **Consider Available Resources**: Allocate resources **efficiently** based on the current availability:
   - Available Ambulances: ${resources.ambulances}
   - Available Fire Trucks: ${resources.fire_trucks}
   - Available Police Units: ${resources.police_units}
3. **Assign a Severity Level**: Classify the emergency as "Low", "Medium", "High", or "Critical" based on urgency and risk factors.
4. **Recommend Resources**: Allocate ambulances, fire trucks, and police units based on the severity, historical patterns, and available resources.
5. **Provide Justification**: Explain why the severity level and resource recommendations were chosen.
6. **Assign a Priority Score (1-100)**: Indicate the urgency of the request (higher values mean higher priority).
7. **Estimate Response Time**: Predict the time required for responders to reach the location, considering available resources, traffic, and severity.

### **Output Format:**
IMPORTANT: Output your answer strictly as a valid JSON object conforming exactly to the schema below. Do not add any extra text, explanation, markdown, or formatting.
The JSON object must start immediately with a '{' and end with a '}'.
Schema:
\`\`\`json
${jsonSchema}
\`\`\`

Do not include any additional explanations or formatting outside of the JSON response.`
                }
            ],
            temperature: 1,
            max_completion_tokens: 1024,
            top_p: 1,
            stream: false,
            stop: null,
            response_format: { type: "json_object" }
        });
        console.log( JSON.parse(completion.choices[0].message.content));
        return completion;
    } catch (error) {
        console.log("Error in generating recommendation: ", error);
        throw new Error("Error in generating recommendation");
    }
}