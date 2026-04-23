import admin from "./middleware/firebaseAdmin.js";

const emailAdmin = "webgissra.securityho@admin.com";

async function setAdmin() {
  try {
    const user = await admin.auth().getUserByEmail(emailAdmin);

    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
    });

    console.log("User berhasil dijadikan admin:", emailAdmin);
  } catch (error) {
    console.error("Error:", error);
  }
}

setAdmin();
