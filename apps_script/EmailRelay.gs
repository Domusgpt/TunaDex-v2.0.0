// TunaDex Email Relay — Google Apps Script
//
// Searches Gmail for shipment emails from Victor & Norman,
// dumps content to the "Raw Emails" tab and attachments to Drive.
//
// SETUP:
//   1. Open https://script.google.com -> New Project
//   2. Paste this entire file
//   3. Update SHEET_ID and DRIVE_FOLDER_ID below
//   4. Run setupTrigger() once (or set a trigger manually)
//   5. Authorize when prompted

// ===== CONFIGURATION =====
var SHEET_ID = "1NhRN7M_KQsYCDayahbBeaPvSKA1BF1T_5UcDcE85K0M";
var DRIVE_FOLDER_ID = "1CGgHU7bJZImZ9Vdweiqvo9OhqNxzIjPM";
var TAB_EMAILS = "Raw Emails";
var TAB_ATTACHMENTS = "Raw Attachments";
var PROCESSED_LABEL = "TunaDex/Processed";
var LOOKBACK_HOURS = 48;

// ===== HEADERS =====
var EMAIL_HEADERS = [
  "Message ID", "Thread ID", "Subject", "Sender",
  "Date", "Body Text", "Attachment Count", "Relay Timestamp"
];
var ATTACHMENT_HEADERS = [
  "Message ID", "Filename", "MIME Type", "Size Bytes",
  "Drive File ID", "Drive URL", "Relay Timestamp"
];

// ===== MAIN FUNCTION =====
function relayShipmentEmails() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var emailSheet = getOrCreateTab_(ss, TAB_EMAILS, EMAIL_HEADERS);
  var attSheet = getOrCreateTab_(ss, TAB_ATTACHMENTS, ATTACHMENT_HEADERS);
  var processedLabel = getOrCreateLabel_(PROCESSED_LABEL);

  // Get already-processed message IDs from the sheet
  var existingIds = getExistingMessageIds_(emailSheet);

  // Search for Victor and Norman emails
  var queries = [
    "from:victor newer_than:" + LOOKBACK_HOURS + "h -label:" + PROCESSED_LABEL.replace("/", "-"),
    "from:norman newer_than:" + LOOKBACK_HOURS + "h -label:" + PROCESSED_LABEL.replace("/", "-")
  ];

  var emailRows = [];
  var attRows = [];
  var threadsToLabel = [];
  var now = new Date().toISOString();

  for (var q = 0; q < queries.length; q++) {
    var threads = GmailApp.search(queries[q], 0, 50);

    for (var t = 0; t < threads.length; t++) {
      var messages = threads[t].getMessages();
      threadsToLabel.push(threads[t]);

      for (var m = 0; m < messages.length; m++) {
        var msg = messages[m];
        var msgId = msg.getId();

        // Skip if already in sheet
        if (existingIds[msgId]) continue;

        var sender = msg.getFrom();
        // Only process emails actually from Victor or Norman
        if (!sender.toLowerCase().match(/victor|norman/)) continue;

        var attachments = msg.getAttachments();
        var driveFolder = getOrCreateDateFolder_(msg.getDate());

        // Process attachments
        for (var a = 0; a < attachments.length; a++) {
          var att = attachments[a];
          var file = driveFolder.createFile(att.copyBlob());
          file.setName(att.getName());

          attRows.push([
            msgId,
            att.getName(),
            att.getContentType(),
            att.getSize(),
            file.getId(),
            file.getUrl(),
            now
          ]);
        }

        // Build email row
        emailRows.push([
          msgId,
          threads[t].getId(),
          msg.getSubject(),
          sender,
          msg.getDate().toISOString(),
          msg.getPlainBody() || "",
          attachments.length,
          now
        ]);
      }
    }
  }

  // Write to sheets
  if (emailRows.length > 0) {
    emailSheet.getRange(
      emailSheet.getLastRow() + 1, 1,
      emailRows.length, EMAIL_HEADERS.length
    ).setValues(emailRows);
  }

  if (attRows.length > 0) {
    attSheet.getRange(
      attSheet.getLastRow() + 1, 1,
      attRows.length, ATTACHMENT_HEADERS.length
    ).setValues(attRows);
  }

  // Label threads as processed
  for (var i = 0; i < threadsToLabel.length; i++) {
    threadsToLabel[i].addLabel(processedLabel);
  }

  Logger.log("Relayed " + emailRows.length + " emails, " + attRows.length + " attachments");
}

// ===== HELPERS =====

function getOrCreateTab_(ss, name, headers) {
  var sheet;
  try {
    sheet = ss.getSheetByName(name);
  } catch (e) {
    sheet = null;
  }
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

function getOrCreateLabel_(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
  }
  return label;
}

function getExistingMessageIds_(sheet) {
  var ids = {};
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    ids[data[i][0]] = true;
  }
  return ids;
}

function getOrCreateDateFolder_(emailDate) {
  var root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var year = emailDate.getFullYear().toString();
  var month = ("0" + (emailDate.getMonth() + 1)).slice(-2);
  var day = emailDate.getFullYear() + "-" + month + "-" + ("0" + emailDate.getDate()).slice(-2);

  var yearFolder = getOrCreateSubfolder_(root, year);
  var monthFolder = getOrCreateSubfolder_(yearFolder, month);
  var dateFolder = getOrCreateSubfolder_(monthFolder, day);
  return dateFolder;
}

function getOrCreateSubfolder_(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

// ===== TRIGGER SETUP =====

// Run this once to set up automatic execution every 2 hours.
function setupTrigger() {
  // Remove any existing triggers for this function
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "relayShipmentEmails") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create new trigger: every 2 hours
  ScriptApp.newTrigger("relayShipmentEmails")
    .timeBased()
    .everyHours(2)
    .create();

  Logger.log("Trigger created: relayShipmentEmails every 2 hours");
}

// Run this manually to do a first-time backfill of the last 7 days.
function backfill7Days() {
  // Temporarily increase lookback
  LOOKBACK_HOURS = 168;  // 7 days
  relayShipmentEmails();
  LOOKBACK_HOURS = 48;   // Reset
}
