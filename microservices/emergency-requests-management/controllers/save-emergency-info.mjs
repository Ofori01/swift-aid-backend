import emergencyRequestModel from "../models/emergency-request-schema.mjs";
import SocketService from "../../../utils/socket-io/socketService.mjs";

export async function saveEmergencyInfo(req, res, next) {
  try {
    const { request_id, recommendations, response } = req.body;

    if (!request_id || !recommendations || !response) {
      return res.status(400).json({
        message: "Missing required data to save emergency info",
      });
    }

    // Prepare selected responders data
    const selectedResponders = {
      ambulances: [],
      fire_trucks: [],
      police_units: [],
    };

    let totalResponders = 0;
    let totalTravelTime = 0;
    let fastestTime = Infinity;
    let routedCount = 0;
    let estimatedCount = 0;

    // Process each agency's responders
    for (const [agency, responders] of Object.entries(response.responders)) {
      if (responders && responders.length > 0) {
        responders.forEach((responder) => {
          const responderData = {
            responder_id: responder.responder_id || responder._id,
            travelTime: responder.travelTime,
            routeType: responder.routeType || "estimated",
          };

          // Add to appropriate agency array
          if (agency === "ambulances") {
            selectedResponders.ambulances.push(responderData);
          } else if (agency === "fire_trucks") {
            selectedResponders.fire_trucks.push(responderData);
          } else if (agency === "police_units") {
            selectedResponders.police_units.push(responderData);
          }

          // Calculate metrics
          totalResponders++;
          if (responder.travelTime) {
            totalTravelTime += responder.travelTime;
            fastestTime = Math.min(fastestTime, responder.travelTime);
          }

          // Count route types
          if (responder.routeType === "routed") {
            routedCount++;
          } else {
            estimatedCount++;
          }
        });
      }
    }

    // Determine calculation method
    let calculationMethod;
    if (routedCount > 0 && estimatedCount === 0) {
      calculationMethod = "mapbox_matrix";
    } else if (routedCount === 0 && estimatedCount > 0) {
      calculationMethod = "straight_line_estimation";
    } else {
      calculationMethod = "mixed";
    }

    // Prepare AI recommendations data
    const aiRecommendations = {
      severity_level: recommendations.severity_level || "Medium",
      recommended_resources: recommendations.recommended_resources || {},
      justification:
        recommendations.justification ||
        "AI recommendation based on emergency analysis",
      priority_score: recommendations.priority_score || 50,
      estimated_response_time: recommendations.estimated_response_time || null,
      generated_at: new Date(),
    };

    // Prepare response metrics
    const responseMetrics = {
      total_responders_selected: totalResponders,
      average_response_time:
        totalResponders > 0
          ? Math.round(totalTravelTime / totalResponders)
          : null,
      fastest_responder_time: fastestTime !== Infinity ? fastestTime : null,
      route_calculation_method: calculationMethod,
      calculation_timestamp: new Date(),
    };

    // Update the emergency request with all the new data
    const updateData = {
      selected_responders: selectedResponders,
      ai_recommendations: aiRecommendations,
      response_metrics: responseMetrics,
      updatedAt: new Date(),
    };

    // If AI provided severity level, update the main severity field
    if (recommendations.severity_level) {
      updateData.severity = recommendations.severity_level;
    }

    const updatedRequest = await emergencyRequestModel.findOneAndUpdate(
      { request_id },
      { $set: updateData },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({
        message: "Emergency request not found",
      });
    }

    console.log(`✅ Emergency info saved for request ${request_id}:`);
    console.log(`   📊 Total responders: ${totalResponders}`);
    console.log(
      `   ⏱️  Average response time: ${responseMetrics.average_response_time}s`
    );
    console.log(
      `   🚀 Fastest responder: ${responseMetrics.fastest_responder_time}s`
    );
    console.log(`   🗺️  Route method: ${calculationMethod}`);
    console.log(`   🤖 AI Severity: ${aiRecommendations.severity_level}`);
    console.log(`   📈 AI Priority Score: ${aiRecommendations.priority_score}`);
    console.log(
      `   🎯 AI Recommended: ${JSON.stringify(
        aiRecommendations.recommended_resources
      )}`
    );
    if (aiRecommendations.estimated_response_time) {
      console.log(
        `   ⏰ AI Est. Response: ${aiRecommendations.estimated_response_time} minutes`
      );
    }

    // 🔥 INITIALIZE REAL-TIME COMMUNICATION
    try {
      const socketData = await SocketService.initializeEmergencyRoom(
        updatedRequest,
        selectedResponders
      );

      console.log(`🔌 Socket rooms initialized:`);
      console.log(`   📍 Emergency room: ${socketData.emergencyRoomId}`);
      console.log(
        `   👥 Responders notified: ${socketData.responderIds.length}`
      );
      console.log(`   📱 User room: ${socketData.userRoomId}`);
    } catch (socketError) {
      console.error("❌ Error initializing socket rooms:", socketError);
      // Don't fail the request if socket setup fails
    }

    // Send final response to client
    res.status(200).json({
      message:
        "Emergency request created successfully. We will notify you on help headed your way!",
      response: response,
      saved: {
        selected_responders: selectedResponders,
        response_metrics: responseMetrics,
        ai_recommendations: aiRecommendations,
      },
    });
  } catch (error) {
    console.error("❌ Error saving emergency info:", error);
    return res.status(500).json({
      message: "Error saving emergency information",
      error: error.message,
    });
  }
}
