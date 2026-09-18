"use strict";

function classifyCrewGrowthLock({ crewId = "", userExists = false, user = {}, lockExists = false, lock = {} } = {}) {
  if (!userExists || user.crewId !== crewId || user.isDeleted || user.status === "deleted" || user.deletedAt) {
    return { action: "skip", reason: "membership_mismatch" };
  }
  if (!lockExists) return { action: "create", reason: "missing_lock" };
  if (lock.originCrewId === crewId && lock.status === "active") {
    return { action: "keep", reason: "active_origin_lock" };
  }
  return { action: "skip", reason: "existing_lock_conflict" };
}

function parseCrewIdArg(argv = []) {
  const prefix = "--crew-id=";
  const value = argv.find((arg) => String(arg).startsWith(prefix));
  return value ? String(value).slice(prefix.length).trim() : "";
}

module.exports = { classifyCrewGrowthLock, parseCrewIdArg };
