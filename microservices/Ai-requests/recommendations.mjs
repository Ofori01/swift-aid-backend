import Groq from "groq-sdk";

const groq= new Groq({apiKey: process.env.GROQ_API_KEY});

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


export function getRecommendation(userDescription, imageUrl, resources ){
    const jsonSchema = JSON.stringify(schema, null, 4);
    try {
        const completion = client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": `${userDescription}` //user description
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": imageUrl,
                            }
                        }
                    ]
                },
                //system prompt with json schema
                {
                    "role": "system",
                    "content": `You are an AI emergency response assistant responsible for analyzing emergency requests. 
                
                Based on the user's description, the provided image, available resources, and historical data, assess the severity of the incident and determine the necessary resources required for response. Use historical emergency patterns to support your decision-making.
                
                ### **Instructions:**
                1. **Analyze the Emergency Description & Image**: Extract key details such as the number of people involved, type of incident, and potential threats.
                2. **Consider Available Resources**: Allocate resources **efficiently** based on the current availability:
                   - Available Ambulances: ${resources.ambulances}
                   - Available Fire Trucks: ${resources.fire_trucks}
                   - Available Police Units: ${resources.police_units}
                // 3. **Use Historical Data for Context**:
                //    - Review past similar emergencies and their resource allocation:
                //    \`\`\`json
                //    ${JSON.stringify(resources.historical_data, null, 4)}
                //    \`\`\`
                4. **Assign a Severity Level**: Classify the emergency as "Low", "Medium", "High", or "Critical" based on urgency and risk factors.
                5. **Recommend Resources**: Allocate ambulances, fire trucks, and police units based on the severity, historical patterns, and available resources.
                6. **Provide Justification**: Explain why the severity level and resource recommendations were chosen.
                7. **Assign a Priority Score (1-100)**: Indicate the urgency of the request (higher values mean higher priority).
                8. **Estimate Response Time**: Predict the time required for responders to reach the location, considering available resources, traffic, and severity.
                
                ### **Output Format:**
                Return the response **strictly in JSON format** according to the schema provided:
                
                \`\`\`json
                ${jsonSchema}
                \`\`\`
                
                Do not include any additional explanations or formatting outside of the JSON response.`
                }
                
                
            ],
            temperature=1,
            max_completion_tokens=1024,
            top_p=1,
            stream=False,
            stop=None,
            response_format={"type": "json_object"},
        )
    } catch (error) {
        console.log("Error in generating recommendation: ", error);
        throw new Error("Error in generating recommendation");
    }
    
    console.log(completion.choices[0].message);

}