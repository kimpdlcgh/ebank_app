#!/usr/bin/env node
/**
 * One-time fix for mateenforjob@gmail.com:
 * - mark email verified in Firebase Auth
 * - ensure profiles/{uid} in safeguardsecurities DB has staff fields
 *
 * Run from repo root (requires firebase CLI login as project owner):
 *   node scripts/fix-owner-account.js
 */
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PROJECT_ID = "e-bank-dashboard";
const DATABASE_ID = "safeguardsecurities";
const OWNER_EMAIL = "mateenforjob@gmail.com";
const OWNER_UID = "iQ8BocLqscb9xXoD8iVtMe6NiC42";

async function getAccessToken() {
  try {
    return execSync("firebase login:ci --no-localhost 2>&1", { encoding: "utf8" });
  } catch (_) {
    // fall through
  }
  try {
    return execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
  } catch (err) {
    throw new Error(
      "No Google credentials. Run: firebase login (as mateenforjob@gmail.com) or gcloud auth login"
    );
  }
}

async function main() {
  let admin;
  try {
    admin = require("firebase-admin");
  } catch (_) {
    console.error("Installing firebase-admin...");
    execSync("npm install firebase-admin --no-save", {
      cwd: path.join(__dirname),
      stdio: "inherit",
    });
    admin = require("firebase-admin");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: PROJECT_ID,
      credential: admin.credential.applicationDefault(),
    });
  }

  const auth = admin.auth();
  const db = admin.firestore();
  const namedDb = admin.firestore().databaseId
    ? db
    : null;

  // firebase-admin v12+ named database support
  const firestore = admin.firestore();
  const profileRef = firestore
    .collection("profiles")
    .doc(OWNER_UID);

  // Use REST for named database if admin SDK default only
  const { getFirestore } = require("firebase-admin/firestore");
  const ssDb = getFirestore(admin.app(), DATABASE_ID);

  console.log("Updating Auth user:", OWNER_EMAIL);
  await auth.updateUser(OWNER_UID, {
    emailVerified: true,
  });

  console.log("Updating Firestore profile in", DATABASE_ID);
  await ssDb.collection("profiles").doc(OWNER_UID).set(
    {
      email: OWNER_EMAIL,
      role: "super_admin",
      accountStatus: "active",
      is_admin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const user = await auth.getUser(OWNER_UID);
  const snap = await ssDb.collection("profiles").doc(OWNER_UID).get();
  console.log("");
  console.log("Done.");
  console.log("  Auth email:", user.email);
  console.log("  emailVerified:", user.emailVerified);
  console.log("  profile role:", snap.data()?.role);
  console.log("  profile accountStatus:", snap.data()?.accountStatus);
  console.log("");
  console.log("Try admin login: https://safeguardsecurities.us/admin/login");
}

main().catch((err) => {
  console.error("Fix failed:", err.message || err);
  console.error("");
  console.error("Manual fallback in Firebase Console:");
  console.error("  1. Authentication -> Users -> mateenforjob@gmail.com -> verify email");
  console.error("  2. Firestore -> safeguardsecurities -> profiles ->", OWNER_UID);
  console.error('     Set role=super_admin, accountStatus=active, is_admin=true');
  process.exit(1);
});
