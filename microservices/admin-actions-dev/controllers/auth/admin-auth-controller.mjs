import adminModel from "../../models/adminSchema.mjs";
import agencyModel from "../../models/agencies-schema.mjs";
import {
  comparePassword,
  generatePasswordHash,
} from "../../../../utils/auth/pass-hash.mjs";
import { generateToken } from "../../../../utils/auth/tokens.mjs";

/**
 * TEMPORARY: Reset admin password using only email
 * WARNING: This bypasses normal security measures. Remove after password recovery.
 */
export async function temporaryPasswordReset(req, res) {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        message: "Email and new password are required",
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Find admin by email
    const admin = await adminModel.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({
        message: "Admin not found with this email address",
      });
    }

    // Hash new password
    const hashedNewPassword = generatePasswordHash(newPassword);

    // Update password
    await adminModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { password: hashedNewPassword } }
    );

    // Log this security event
    console.log(
      `🚨 SECURITY: Temporary password reset for admin: ${email} at ${new Date()}`
    );

    res.status(200).json({
      message:
        "Password reset successfully. Please login with your new password.",
      admin_email: email,
      reset_at: new Date(),
    });
  } catch (error) {
    console.error("❌ Error in temporary password reset:", error);
    res.status(500).json({
      message: "Error resetting password",
      error: error.message,
    });
  }
}

/**
 * Admin login controller
 */
export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find admin by email
    const admin = await adminModel.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Verify password
    if (!comparePassword(password, admin.password)) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Get admin's agency information
    const agency = await agencyModel.findOne({ admin_id: admin.admin_id });

    // Generate token
    const token = generateToken({
      admin_id: admin.admin_id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
    });

    res.status(200).json({
      message: "Admin login successful",
      token,
      admin: {
        admin_id: admin.admin_id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        badgeNumber: admin.badgeNumber,
        role: admin.role,
        agency: agency
          ? {
              name: agency.name,
              branch: agency.branch,
              type: agency.agency_type,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({
      message: "An error occurred during login",
      error: error.message,
    });
  }
}

/**
 * Admin signup/registration controller
 */
export async function adminSignup(req, res) {
  try {
    const { name, email, password, phone, badgeNumber } = req.body;

    // Validation
    if (!name || !email || !password || !phone || !badgeNumber) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Check if admin already exists
    const existingAdmin = await adminModel.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: phone },
        { badgeNumber: badgeNumber },
      ],
    });

    if (existingAdmin) {
      return res.status(409).json({
        message: "Admin with this email, phone, or badge number already exists",
      });
    }

    // Hash password
    const hashedPassword = generatePasswordHash(password);

    // Create new admin
    const newAdmin = new adminModel({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      badgeNumber,
      role: "admin",
    });

    const savedAdmin = await newAdmin.save();

    // Generate token
    const token = generateToken({
      admin_id: savedAdmin.admin_id,
      email: savedAdmin.email,
      role: savedAdmin.role,
      name: savedAdmin.name,
    });

    res.status(201).json({
      message: "Admin account created successfully",
      token,
      admin: {
        admin_id: savedAdmin.admin_id,
        name: savedAdmin.name,
        email: savedAdmin.email,
        phone: savedAdmin.phone,
        badgeNumber: savedAdmin.badgeNumber,
        role: savedAdmin.role,
      },
    });
  } catch (error) {
    console.error("❌ Admin signup error:", error);
    res.status(500).json({
      message: "An error occurred while creating admin account",
      error: error.message,
    });
  }
}

/**
 * Get admin profile information
 */
export async function getAdminProfile(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;

    const admin = await adminModel
      .findOne({ admin_id: adminId })
      .select("-password");
    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    // Get agency information
    const agency = await agencyModel.findOne({ admin_id: adminId });

    res.status(200).json({
      message: "Admin profile retrieved successfully",
      data: {
        admin: admin,
        agency: agency,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching admin profile:", error);
    res.status(500).json({
      message: "Error retrieving admin profile",
      error: error.message,
    });
  }
}

/**
 * Update admin profile
 */
export async function updateAdminProfile(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { name, phone, email } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email.toLowerCase();

    // Check for conflicts if email or phone is being updated
    if (email || phone) {
      const conflicts = await adminModel.findOne({
        $and: [
          { admin_id: { $ne: adminId } },
          {
            $or: [
              ...(email ? [{ email: email.toLowerCase() }] : []),
              ...(phone ? [{ phone: phone }] : []),
            ],
          },
        ],
      });

      if (conflicts) {
        return res.status(409).json({
          message: "Email or phone number already in use",
        });
      }
    }

    const updatedAdmin = await adminModel
      .findOneAndUpdate(
        { admin_id: adminId },
        { $set: updateData },
        { new: true, runValidators: true }
      )
      .select("-password");

    if (!updatedAdmin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    res.status(200).json({
      message: "Admin profile updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    console.error("❌ Error updating admin profile:", error);
    res.status(500).json({
      message: "Error updating admin profile",
      error: error.message,
    });
  }
}

/**
 * Change admin password
 */
export async function changeAdminPassword(req, res) {
  try {
    const adminId = req.user.admin_id || req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    const admin = await adminModel.findOne({ admin_id: adminId });
    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    // Verify current password
    if (!comparePassword(currentPassword, admin.password)) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedNewPassword = generatePasswordHash(newPassword);

    // Update password
    await adminModel.findOneAndUpdate(
      { admin_id: adminId },
      { $set: { password: hashedNewPassword } }
    );

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Error changing admin password:", error);
    res.status(500).json({
      message: "Error changing password",
      error: error.message,
    });
  }
}
