-- Delete all existing Ashby interview scores so they can be re-imported with the fixed feedback extraction
DELETE FROM "AshbyInterviewScore";

-- Reset the import flag so all employees get re-processed
UPDATE "Employee" SET "ashbyInterviewScoresImported" = false;
