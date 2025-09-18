import mongoose from "mongoose";

const responderReportSchema = new mongoose.Schema({
  report_id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
  },
  emergency_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "emergencyRequest",
  },
  responder_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "responder",
  },
  // Report Details
  arrival_time: {
    type: Date,
    required: true,
  },
  departure_time: {
    type: Date,
    required: true,
  },
  actions_taken: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 2000,
  },
  casualties: {
    injured: {
      type: Number,
      default: 0,
      min: 0,
    },
    deceased: {
      type: Number,
      default: 0,
      min: 0,
    },
    rescued: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  property_damage: {
    type: String,
    enum: ["None", "Minor", "Moderate", "Severe", "Total"],
    default: "None",
  },
  resources_used: {
    equipment: [String],
    personnel_count: {
      type: Number,
      required: true,
      min: 1,
    },
    vehicles_used: [String],
  },
  outcome: {
    type: String,
    enum: ["Resolved", "Referred", "Ongoing", "Unable to resolve"],
    required: true,
  },
  severity_assessment: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    required: true,
  },
  additional_notes: {
    type: String,
    maxlength: 1000,
  },
  location_details: {
    exact_location: String,
    access_challenges: String,
  },
  follow_up_required: {
    type: Boolean,
    default: false,
  },
  follow_up_details: {
    type: String,
    maxlength: 500,
  },
  // Metadata
  submitted_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Draft", "Submitted", "Reviewed"],
    default: "Submitted",
  },
});

// Indexes for performance
responderReportSchema.index({ submitted_at: -1 });
responderReportSchema.index({ outcome: 1 });
responderReportSchema.index({ severity_assessment: 1 });

// Ensure one report per responder per emergency (compound unique index)
responderReportSchema.index(
  { emergency_id: 1, responder_id: 1 },
  { unique: true }
);

const responderReportModel = mongoose.model(
  "responderReport",
  responderReportSchema
);

export default responderReportModel;
